import os
import uuid
import requests
import jwt

from datetime import datetime, timedelta
from urllib.parse import urlencode

from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions

from .models import UserProfile
from services.spotify_client import SpotifyClient
from services.dashboard_service import (
    build_track_items,
    build_album_items_from_tracks,
    build_artist_items,
)
from utils.crypto import decrypt_str

from django.contrib.auth.models import AnonymousUser

def _parse_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class JWTAuthentication(BaseAuthentication):
    """
    Authenticate requests using JWT from Authorization header.
    Supports:
      • Spotify users
      • Guest users
    """

    def authenticate(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")

        if not auth.startswith("Bearer "):
            return None

        token = auth.split(" ", 1)[1].strip()
        if not token:
            return None

        jwt_secret = os.environ.get("JWT_SECRET", settings.SECRET_KEY)

        try:
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("token_expired")
        except Exception:
            raise exceptions.AuthenticationFailed("invalid_token")

        sub = payload.get("sub")
        mode = payload.get("mode", "spotify")

        if not sub:
            raise exceptions.AuthenticationFailed("invalid_token")

        if mode == "guest" or sub.startswith("guest:"):
            request.guest_payload = payload
            return (AnonymousUser(), None)

        try:
            user = UserProfile.objects.get(spotify_id=sub)
        except UserProfile.DoesNotExist:
            raise exceptions.AuthenticationFailed("user_not_found")

        return (user, None)
    
class AuthCallbackView(APIView):
    """
    Handle Spotify OAuth callback.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        code = request.GET.get("code")

        if not code:
            return Response(
                {"detail": "missing_code"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_id = os.environ.get("SPOTIFY_CLIENT_ID")
        client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
        redirect_uri = os.environ.get("SPOTIFY_REDIRECT_URI")
        print("REDIRECT_URI", redirect_uri)
        if not all([client_id, client_secret, redirect_uri]):
            return Response(
                {"detail": "server_not_configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        sc = SpotifyClient(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
        )

        try:
            token_data = sc.exchange_code(code)
            print("TOKEN_DATA: ",token_data)
        except Exception as exc:
            return Response(
                {
                    "detail": "token_exchange_failed",
                    "error": str(exc),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        access_token = token_data.get("access_token")
        refresh_token_enc = token_data.get("refresh_token_encrypted")
        expires_in = token_data.get("expires_in")

        if not access_token:
            return Response(
                {"detail": "missing_access_token"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not refresh_token_enc:
            return Response(
                {"detail": "token_encryption_failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            spotify_resp = requests.get(
                "https://api.spotify.com/v1/me",
                headers={
                    "Authorization": f"Bearer {access_token}",
                },
                timeout=15,
            )

            spotify_resp.raise_for_status()

            me = spotify_resp.json()

        except Exception as exc:
            return Response(
                {
                    "detail": "unable_to_fetch_spotify_user",
                    "error": str(exc),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        spotify_id = me.get("id")
        display_name = me.get("display_name")
        email = me.get("email")

        if not spotify_id:
            return Response(
                {"detail": "invalid_spotify_profile"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        user, created = UserProfile.objects.update_or_create(
            spotify_id=spotify_id,
            defaults={
                "display_name": display_name,
                "email": email,
                "refresh_token_encrypted": refresh_token_enc,
                "token_expires_at": (
                    timezone.now()
                    + timezone.timedelta(seconds=expires_in)
                    if expires_in
                    else None
                ),
            },
        )

        # optional django auth user sync
        User = get_user_model()

        User.objects.update_or_create(
            username=spotify_id,
            defaults={
                "email": email or "",
                "first_name": display_name or "",
            },
        )

        jwt_secret = os.environ.get("JWT_SECRET", settings.SECRET_KEY)

        jwt_exp_days = int(
            os.environ.get("JWT_EXP_DAYS", "7")
        )

        payload = {
            "sub": spotify_id,
            "name": display_name,
            "exp": datetime.utcnow() + timedelta(days=jwt_exp_days),
            "iat": datetime.utcnow(),
        }

        token = jwt.encode(
            payload,
            jwt_secret,
            algorithm="HS256",
        )

        frontend_url = os.environ.get("FRONTEND_URL")
        print("FRONTEND_URL", frontend_url)
        if not frontend_url:
            return Response(
                {
                    "token": token,
                    "spotify_id": spotify_id,
                    "created": created,
                }
            )

        return redirect(
            f"{frontend_url.rstrip('/')}/auth/success?token={token}"
        )

class GuestLoginView(APIView):
    """
    Create a mock guest session without Spotify.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        guest_id = f"guest:{uuid.uuid4().hex[:12]}"
        display_name = "Guest"

        user_profile, created = UserProfile.objects.get_or_create(
            spotify_id=guest_id,
            defaults={
                "display_name": display_name,
                "email": None,
                "refresh_token_encrypted": None,
                "token_expires_at": None,
            },
        )

        User = get_user_model()
        User.objects.update_or_create(
            username=guest_id,
            defaults={
                "email": "",
                "first_name": display_name,
            },
        )

        jwt_secret = os.environ.get("JWT_SECRET", settings.SECRET_KEY)
        jwt_exp_days = int(os.environ.get("JWT_EXP_DAYS", "7"))

        payload = {
            "sub": guest_id,
            "name": display_name,
            "mode": "guest",
            "exp": datetime.utcnow() + timedelta(days=jwt_exp_days),
            "iat": datetime.utcnow(),
        }

        token = jwt.encode(payload, jwt_secret, algorithm="HS256")

        return Response(
            {
                "token": token,
                "spotify_id": guest_id,
                "display_name": display_name,
                "guest": True,
                "created": created,
            },
            status=status.HTTP_201_CREATED,
        )
        
class LoginView(APIView):
    """
    Start Spotify OAuth flow.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        
        client_id = os.environ.get("SPOTIFY_CLIENT_ID")
        redirect_uri = os.environ.get("SPOTIFY_REDIRECT_URI")
        print("REDIRECT_URI", redirect_uri)
        if not all([client_id, redirect_uri]):
            return Response(
                {"detail": "server_not_configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        scopes = os.environ.get(
            "SPOTIFY_SCOPES",
            "user-top-read user-read-email user-read-private",
        )

        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": scopes,
            "state": uuid.uuid4().hex,
        }

        url = (
            "https://accounts.spotify.com/authorize?"
            + urlencode(params)
        )

        resp = Response(
            status=status.HTTP_302_FOUND
        )

        resp["Location"] = url

        return resp


class RefreshTokenView(APIView):
    """
    Refresh Spotify access token.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if str(user.spotify_id).startswith("guest:"):
            return Response(
                {"detail": "guest_account_has_no_refresh_token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.refresh_token_encrypted:
            return Response(
                {"detail": "no_refresh_token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            refresh_token = decrypt_str(
                user.refresh_token_encrypted
            )

        except Exception:
            return Response(
                {"detail": "invalid_refresh_token_storage"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        client_id = os.environ.get("SPOTIFY_CLIENT_ID")
        client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
        redirect_uri = os.environ.get("SPOTIFY_REDIRECT_URI")

        sc = SpotifyClient(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
        )

        try:
            data = sc.refresh_token(refresh_token)

        except Exception as exc:
            return Response(
                {
                    "detail": "refresh_failed",
                    "error": str(exc),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        access_token = data.get("access_token")
        new_refresh_enc = data.get("refresh_token_encrypted")
        expires_in = data.get("expires_in")

        if new_refresh_enc:
            user.refresh_token_encrypted = new_refresh_enc

        if expires_in:
            user.token_expires_at = (
                timezone.now()
                + timezone.timedelta(seconds=expires_in)
            )

        user.save()

        return Response({
            "access_token": access_token,
            "expires_in": expires_in,
        })


class LogoutView(APIView):
    """
    Logout endpoint.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        if not str(user.spotify_id).startswith("guest:"):
            user.refresh_token_encrypted = None
            user.token_expires_at = None
            user.save()

        user.refresh_token_encrypted = None
        user.token_expires_at = None

        user.save()

        return Response({
            "detail": "logged_out",
        })
from rest_framework.permissions import AllowAny


class MeView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user and getattr(request.user, "is_authenticated", False):
            user = request.user
            return Response({
                "mode": "spotify",
                "spotify_id": "abcde@1234ForaNeymar",
                "display_name": user.display_name,
                "email": user.email,
                "last_sync": user.last_sync,
            })

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return Response({"detail": "No token"}, status=401)

        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return Response({"detail": "No token"}, status=401)

        jwt_secret = os.environ.get("JWT_SECRET", settings.SECRET_KEY)

        try:
            payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])

            if payload.get("mode") == "guest":
                return Response({
                    "mode": "guest",
                    "display_name": payload.get("name", "Guest"),
                    "guest_id": payload.get("sub"),
                })

            return Response({"detail": "Invalid token"}, status=401)

        except jwt.ExpiredSignatureError:
            return Response({"detail": "Token expired"}, status=401)
        except Exception:
            return Response({"detail": "Invalid token"}, status=401)


class TopTracksView(APIView):
    """
    Return user's Spotify top tracks.
    Supports Spotify users and guest/mock users.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request):
        # -------------------------------------------------
        # 1) Detecta guest pelo JWT
        # -------------------------------------------------
        auth_header = request.headers.get("Authorization", "")
        token = None
        payload = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        if token:
            try:
                jwt_secret = os.environ.get("JWT_SECRET", settings.SECRET_KEY)
                payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
            except Exception:
                payload = None

        is_guest = bool(payload and payload.get("mode") == "guest")

        period = request.GET.get("period", "short")
        limit = int(request.GET.get("limit", 10))
        limit = max(1, min(limit, 50))


        if is_guest:
            mock_items = [
    {
        "id": "guest-track-1",
        "name": "Midnight Signals",
        "artists": ["Synthetic Echo"],
        "album": "Neon Dreams",
        "cover": "https://picsum.photos/id/1/300/300",
        "duration": 218,
        "explicit": False,
        "track_number": 1,
        "release_date": "2024-03-15",
        "uri": "spotify:track:guest-track-1"
    },
    {
        "id": "guest-track-2",
        "name": "Neon Drift",
        "artists": ["Low Orbit"],
        "album": "Velocity",
        "cover": "https://picsum.photos/id/2/300/300",
        "duration": 245,
        "explicit": False,
        "track_number": 3,
        "release_date": "2024-02-10",
        "uri": "spotify:track:guest-track-2"
    },
    {
        "id": "guest-track-3",
        "name": "Static Bloom",
        "artists": ["Paper Waves"],
        "album": "Glitch Garden",
        "cover": "https://picsum.photos/id/3/300/300",
        "duration": 192,
        "explicit": False,
        "track_number": 2,
        "release_date": "2024-01-22",
        "uri": "spotify:track:guest-track-3"
    },
    {
        "id": "guest-track-4",
        "name": "Afterglow Routine",
        "artists": ["Velvet Circuit"],
        "album": "Dusk & Data",
        "cover": "https://picsum.photos/id/4/300/300",
        "duration": 267,
        "explicit": True,
        "track_number": 5,
        "release_date": "2024-04-01",
        "uri": "spotify:track:guest-track-4"
    },
    {
        "id": "guest-track-5",
        "name": "Comet Frequency",
        "artists": ["Arc Lights"],
        "album": "Stellar Drift",
        "cover": "https://picsum.photos/id/5/300/300",
        "duration": 203,
        "explicit": False,
        "track_number": 4,
        "release_date": "2024-03-30",
        "uri": "spotify:track:guest-track-5"
    },
    {
        "id": "guest-track-6",
        "name": "Pulse Refraction",
        "artists": ["Echo Delta"],
        "album": "Reflections",
        "cover": "https://picsum.photos/id/6/300/300",
        "duration": 231,
        "explicit": False,
        "track_number": 1,
        "release_date": "2024-05-12",
        "uri": "spotify:track:guest-track-6"
    },
    {
        "id": "guest-track-7",
        "name": "Crystal Waves",
        "artists": ["Neon VHS"],
        "album": "Synthetic Summer",
        "cover": "https://picsum.photos/id/7/300/300",
        "duration": 198,
        "explicit": False,
        "track_number": 2,
        "release_date": "2024-06-05",
        "uri": "spotify:track:guest-track-7"
    },
    {
        "id": "guest-track-8",
        "name": "Orbit Bleed",
        "artists": ["Deep Scan"],
        "album": "Signal Decay",
        "cover": "https://picsum.photos/id/8/300/300",
        "duration": 254,
        "explicit": True,
        "track_number": 3,
        "release_date": "2024-07-19",
        "uri": "spotify:track:guest-track-8"
    },
    {
        "id": "guest-track-9",
        "name": "Silicon Rain",
        "artists": ["Binary Dreams"],
        "album": "Digital Drizzle",
        "cover": "https://picsum.photos/id/9/300/300",
        "duration": 277,
        "explicit": False,
        "track_number": 6,
        "release_date": "2024-08-02",
        "uri": "spotify:track:guest-track-9"
    },
    {
        "id": "guest-track-10",
        "name": "Laser Grid",
        "artists": ["Phantom Drive"],
        "album": "Arcade Assault",
        "cover": "https://picsum.photos/id/10/300/300",
        "duration": 189,
        "explicit": False,
        "track_number": 1,
        "release_date": "2024-09-14",
        "uri": "spotify:track:guest-track-10"
    },
    {
        "id": "guest-track-11",
        "name": "Night Racer",
        "artists": ["Turbo Void"],
        "album": "Asphalt Neon",
        "cover": "https://picsum.photos/id/11/300/300",
        "duration": 222,
        "explicit": False,
        "track_number": 4,
        "release_date": "2024-10-27",
        "uri": "spotify:track:guest-track-11"
    },
    {
        "id": "guest-track-12",
        "name": "Glitch Heaven",
        "artists": ["Data Corrupt"],
        "album": "Error 404",
        "cover": "https://picsum.photos/id/12/300/300",
        "duration": 210,
        "explicit": True,
        "track_number": 2,
        "release_date": "2024-11-11",
        "uri": "spotify:track:guest-track-12"
    },
    {
        "id": "guest-track-13",
        "name": "Solar Flare",
        "artists": ["Aurora Axis"],
        "album": "Polaris",
        "cover": "https://picsum.photos/id/13/300/300",
        "duration": 240,
        "explicit": False,
        "track_number": 5,
        "release_date": "2024-12-03",
        "uri": "spotify:track:guest-track-13"
    },
    {
        "id": "guest-track-14",
        "name": "Frozen Synth",
        "artists": ["Arctic Pulse"],
        "album": "Subzero Beats",
        "cover": "https://picsum.photos/id/14/300/300",
        "duration": 195,
        "explicit": False,
        "track_number": 3,
        "release_date": "2025-01-18",
        "uri": "spotify:track:guest-track-14"
    },
    {
        "id": "guest-track-15",
        "name": "Vapor Trail",
        "artists": ["Memory Lane"],
        "album": "Retro Wave 85",
        "cover": "https://picsum.photos/id/15/300/300",
        "duration": 263,
        "explicit": False,
        "track_number": 7,
        "release_date": "2025-02-22",
        "uri": "spotify:track:guest-track-15"
    },
    {
        "id": "guest-track-16",
        "name": "Digital Sun",
        "artists": ["Pixel Heart"],
        "album": "8-bit Sunrise",
        "cover": "https://picsum.photos/id/16/300/300",
        "duration": 187,
        "explicit": False,
        "track_number": 2,
        "release_date": "2025-03-09",
        "uri": "spotify:track:guest-track-16"
    },
    {
        "id": "guest-track-17",
        "name": "Retro Burn",
        "artists": ["Cassette Ghost"],
        "album": "Faded Tapes",
        "cover": "https://picsum.photos/id/17/300/300",
        "duration": 214,
        "explicit": True,
        "track_number": 4,
        "release_date": "2025-04-14",
        "uri": "spotify:track:guest-track-17"
    },
    {
        "id": "guest-track-18",
        "name": "Phantom Signal",
        "artists": ["Lost Circuit"],
        "album": "Static Void",
        "cover": "https://picsum.photos/id/18/300/300",
        "duration": 229,
        "explicit": False,
        "track_number": 1,
        "release_date": "2025-05-01",
        "uri": "spotify:track:guest-track-18"
    },
    {
        "id": "guest-track-19",
        "name": "Starlight Echo",
        "artists": ["Orbital Drift"],
        "album": "Deep Space Radio",
        "cover": "https://picsum.photos/id/19/300/300",
        "duration": 256,
        "explicit": False,
        "track_number": 6,
        "release_date": "2025-06-20",
        "uri": "spotify:track:guest-track-19"
    },
    {
        "id": "guest-track-20",
        "name": "Nightcall",
        "artists": ["Street Heat"],
        "album": "Midnight City",
        "cover": "https://picsum.photos/id/20/300/300",
        "duration": 248,
        "explicit": False,
        "track_number": 3,
        "release_date": "2025-07-07",
        "uri": "spotify:track:guest-track-20"
    },
    {
        "id": "guest-track-21",
        "name": "Arcade Dreams",
        "artists": ["Quarter Drop"],
        "album": "Insert Coin",
        "cover": "https://picsum.photos/id/21/300/300",
        "duration": 201,
        "explicit": False,
        "track_number": 5,
        "release_date": "2025-08-29",
        "uri": "spotify:track:guest-track-21"
    },
    {
        "id": "guest-track-22",
        "name": "Velocity Shift",
        "artists": ["Rush Delta"],
        "album": "Hyperdrive",
        "cover": "https://picsum.photos/id/22/300/300",
        "duration": 235,
        "explicit": True,
        "track_number": 2,
        "release_date": "2025-09-16",
        "uri": "spotify:track:guest-track-22"
    },
    {
        "id": "guest-track-23",
        "name": "Mirror's Edge",
        "artists": ["Chrome Sky"],
        "album": "Glass Horizon",
        "cover": "https://picsum.photos/id/23/300/300",
        "duration": 276,
        "explicit": False,
        "track_number": 8,
        "release_date": "2025-10-10",
        "uri": "spotify:track:guest-track-23"
    },
    {
        "id": "guest-track-24",
        "name": "Blade Runner Blues",
        "artists": ["Rainy Streets"],
        "album": "Los Angeles 2049",
        "cover": "https://picsum.photos/id/24/300/300",
        "duration": 289,
        "explicit": False,
        "track_number": 4,
        "release_date": "2025-11-05",
        "uri": "spotify:track:guest-track-24"
    },
    {
        "id": "guest-track-25",
        "name": "Terminal Velocity",
        "artists": ["Dash Vector"],
        "album": "Overdrive",
        "cover": "https://picsum.photos/id/25/300/300",
        "duration": 207,
        "explicit": False,
        "track_number": 1,
        "release_date": "2025-12-12",
        "uri": "spotify:track:guest-track-25"
    },
    {
        "id": "guest-track-26",
        "name": "Hypersleep",
        "artists": ["Stasis Field"],
        "album": "Cryo Chamber",
        "cover": "https://picsum.photos/id/26/300/300",
        "duration": 315,
        "explicit": False,
        "track_number": 3,
        "release_date": "2026-01-19",
        "uri": "spotify:track:guest-track-26"
    },
    {
        "id": "guest-track-27",
        "name": "Outrun Sunset",
        "artists": ["Ferrari Testarossa"],
        "album": "Coastline Drive",
        "cover": "https://picsum.photos/id/27/300/300",
        "duration": 226,
        "explicit": False,
        "track_number": 5,
        "release_date": "2026-02-14",
        "uri": "spotify:track:guest-track-27"
    },
    {
        "id": "guest-track-28",
        "name": "Electric Lullaby",
        "artists": ["Cradle Static"],
        "album": "White Noise Dreams",
        "cover": "https://picsum.photos/id/28/300/300",
        "duration": 181,
        "explicit": False,
        "track_number": 2,
        "release_date": "2026-03-08",
        "uri": "spotify:track:guest-track-28"
    },
    {
        "id": "guest-track-29",
        "name": "Transmission Lost",
        "artists": ["Dead Air"],
        "album": "Ghost Frequencies",
        "cover": "https://picsum.photos/id/29/300/300",
        "duration": 242,
        "explicit": True,
        "track_number": 6,
        "release_date": "2026-04-25",
        "uri": "spotify:track:guest-track-29"
    },
    {
        "id": "guest-track-30",
        "name": "Final Frame",
        "artists": ["Last Sequence"],
        "album": "End Credits",
        "cover": "https://picsum.photos/id/30/300/300",
        "duration": 298,
        "explicit": False,
        "track_number": 10,
        "release_date": "2026-05-01",
        "uri": "spotify:track:guest-track-30"
    }
]
            
            items = mock_items[:limit]

            return Response({
                "count": len(items),
                "items": items,
                "mode": "guest",
                "period": period,
            })

        user = request.user

        if not getattr(user, "refresh_token_encrypted", None):
            return Response(
                {"detail": "no_refresh_token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            refresh_token = decrypt_str(user.refresh_token_encrypted)
        except Exception:
            return Response(
                {"detail": "invalid_refresh_token_storage"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        client_id = os.environ.get("SPOTIFY_CLIENT_ID")
        client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
        redirect_uri = os.environ.get("SPOTIFY_REDIRECT_URI")

        sc = SpotifyClient(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
        )

        try:
            data = sc.refresh_token(refresh_token)
        except Exception as exc:
            return Response(
                {
                    "detail": "refresh_failed",
                    "error": str(exc),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        access_token = data.get("access_token")

        if not access_token:
            return Response(
                {"detail": "missing_access_token"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        period = request.GET.get("period", "short")

        limit = _parse_int(
            request.GET.get("limit"),
            10,
        )

        offset = _parse_int(
            request.GET.get("offset"),
            0,
        )

        limit = max(1, min(limit, 50))
        offset = max(0, offset)

        try:
            payload = sc.get_top_tracks(
                access_token,
                period=period,
                limit=limit,
                offset=offset,
            )
        except Exception as exc:
            return Response(
                {
                    "detail": "spotify_api_failed",
                    "error": str(exc),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        items = []
        for track in payload.get("items", []):
            items.append({
                "id": track.get("id"),
                "name": track.get("name"),
                "artists": [
                    artist.get("name")
                    for artist in track.get("artists", [])
                ],
                "uri": track.get("uri"),
            })

        return Response({
            "count": len(items),
            "items": items,
        })


class TopItemsView(APIView):
    """
    Return dashboard items (tracks or albums) with aggregation and cache.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        item_type = request.GET.get("type", "tracks").lower()

        if item_type not in ["tracks", "albums", "artists"]:
            return Response(
                {"detail": "invalid_type"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        period = request.GET.get("period", "short")

        limit = _parse_int(
            request.GET.get("limit"),
            25,
        )

        offset = _parse_int(
            request.GET.get("offset"),
            0,
        )

        limit = max(1, min(limit, 50))
        offset = max(0, offset)

        cache_key = (
            f"top-items:{user.spotify_id}:{item_type}:{period}:{limit}:{offset}"
        )

        cached = cache.get(cache_key)

        if cached:
            return Response(cached)

        if not user.refresh_token_encrypted:
            return Response(
                {"detail": "no_refresh_token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_id = os.environ.get("SPOTIFY_CLIENT_ID")
        client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
        redirect_uri = os.environ.get("SPOTIFY_REDIRECT_URI")

        if not all([client_id, client_secret, redirect_uri]):
            return Response(
                {"detail": "server_not_configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        sc = SpotifyClient(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
        )

        access_token = getattr(request, "spotify_access_token", None)

        if not access_token:
            try:
                refresh_token = decrypt_str(
                    user.refresh_token_encrypted
                )
            except Exception:
                return Response(
                    {"detail": "invalid_refresh_token_storage"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            try:
                data = sc.refresh_token(refresh_token)
            except Exception as exc:
                return Response(
                    {
                        "detail": "refresh_failed",
                        "error": str(exc),
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            access_token = data.get("access_token")

            if not access_token:
                return Response(
                    {"detail": "missing_access_token"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            new_refresh_enc = data.get("refresh_token_encrypted")
            expires_in = data.get("expires_in")

            if new_refresh_enc:
                user.refresh_token_encrypted = new_refresh_enc

            if expires_in:
                user.token_expires_at = (
                    timezone.now()
                    + timezone.timedelta(seconds=expires_in)
                )

            if new_refresh_enc or expires_in:
                user.save()

        try:
            if item_type == "tracks":
                payload = sc.get_top_tracks(
                    access_token,
                    period=period,
                    limit=limit,
                    offset=offset,
                )

                items = build_track_items(
                    payload.get("items", []),
                    offset=offset,
                )

                total = payload.get("total", len(items))
            elif item_type == "artists":
                payload = sc.get_top_artists(
                    access_token,
                    period=period,
                    limit=limit,
                    offset=offset,
                )

                items = build_artist_items(
                    payload.get("items", []),
                    offset=offset,
                )

                total = payload.get("total", len(items))
            else:
                source_limit = max(limit + offset, 20)
                source_limit = min(50, source_limit)

                payload = sc.get_top_tracks(
                    access_token,
                    period=period,
                    limit=source_limit,
                    offset=0,
                )

                album_items = build_album_items_from_tracks(
                    payload.get("items", [])
                )

                total = len(album_items)
                items = album_items[offset:offset + limit]

        except Exception as exc:
            return Response(
                {
                    "detail": "spotify_api_failed",
                    "error": str(exc),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        user.last_sync = timezone.now()
        user.save(update_fields=["last_sync"])

        response_payload = {
            "type": item_type,
            "period": period,
            "limit": limit,
            "offset": offset,
            "total": total,
            "count": len(items),
            "items": items,
        }

        cache_ttl = _parse_int(
            os.environ.get("SPOTIFY_CACHE_TTL"),
            300,
        )

        if cache_ttl > 0:
            cache.set(cache_key, response_payload, cache_ttl)

        return Response(response_payload)
