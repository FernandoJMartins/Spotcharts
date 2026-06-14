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

def get_spotify_client():
    client_id = os.environ.get("SPOTIFY_CLIENT_ID")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    redirect_uri = os.environ.get("SPOTIFY_REDIRECT_URI")

    if not all([client_id, client_secret, redirect_uri]):
        raise RuntimeError("server_not_configured")

    return SpotifyClient(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
    )


def resolve_access_token(request, user):
    access_token = getattr(
        request,
        "spotify_access_token",
        None,
    )

    if access_token:
        return access_token

    if not user.refresh_token_encrypted:
        raise RuntimeError("no_refresh_token")

    sc = get_spotify_client()

    refresh_token = decrypt_str(
        user.refresh_token_encrypted
    )

    data = sc.refresh_token(refresh_token)

    access_token = data.get("access_token")

    if not access_token:
        raise RuntimeError("missing_access_token")

    new_refresh = data.get(
        "refresh_token_encrypted"
    )

    expires_in = data.get("expires_in")

    if new_refresh:
        user.refresh_token_encrypted = new_refresh

    if expires_in:
        user.token_expires_at = (
            timezone.now()
            + timezone.timedelta(seconds=expires_in)
        )

    if new_refresh or expires_in:
        user.save()

    return access_token


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
import os
import uuid

from django.shortcuts import redirect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class LoginView(APIView):
    """
    Start Spotify OAuth flow.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        client_id = os.getenv("SPOTIFY_CLIENT_ID")
        redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI")

        if not client_id or not redirect_uri:
            return Response(
                {"detail": "server_not_configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        state = uuid.uuid4().hex

        request.session["spotify_oauth_state"] = state

        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": os.getenv(
                "SPOTIFY_SCOPES",
                "user-top-read user-read-email "
                "user-read-private user-read-recently-played",
            ),
            "state": state,
        }

        url = (
            "https://accounts.spotify.com/authorize?"
            + urlencode(params)
        )

        return redirect(url)


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
            mock_items = []
            
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


class ResumePlaybackView(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):

        user = request.user

        device_id = request.data.get(
            "device_id"
        )

        context_uri = request.data.get(
            "context_uri"
        )

        uris = request.data.get(
            "uris"
        )

        position_ms = request.data.get(
            "position_ms"
        )

        try:

            sc = get_spotify_client()

            access_token = resolve_access_token(
                request,
                user,
            )

            sc.resume_playback(
                access_token,
                device_id=device_id,
                context_uri=context_uri,
                uris=uris,
                position_ms=position_ms,
            )

        except Exception as exc:

            return Response(
                {
                    "detail": "spotify_api_failed",
                    "error": str(exc),
                },
                status=502,
            )

        return Response(
            {
                "detail": "playback_started"
            }
        )
        
class RecommendationsView(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        seed_tracks = request.GET.getlist(
            "seed_tracks"
        )

        seed_artists = request.GET.getlist(
            "seed_artists"
        )

        seed_genres = request.GET.getlist(
            "seed_genres"
        )

        limit = _parse_int(
            request.GET.get("limit"),
            20,
        )

        try:

            sc = get_spotify_client()

            access_token = resolve_access_token(
                request,
                user,
            )

            payload = sc.get_recommendations(
                access_token,
                seed_tracks=seed_tracks,
                seed_artists=seed_artists,
                seed_genres=seed_genres,
                limit=limit,
            )

        except Exception as exc:

            return Response(
                {
                    "detail": "spotify_api_failed",
                    "error": str(exc),
                },
                status=502,
            )

        return Response(payload)
    
class SavedTracksView(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        limit = _parse_int(
            request.GET.get("limit"),
            20,
        )

        offset = _parse_int(
            request.GET.get("offset"),
            0,
        )

        market = request.GET.get("market")

        cache_key = (
            f"saved:{user.spotify_id}:{limit}:{offset}:{market}"
        )

        cached = cache.get(cache_key)

        if cached:
            return Response(cached)

        try:

            sc = get_spotify_client()

            access_token = resolve_access_token(
                request,
                user,
            )

            payload = sc.get_saved_tracks(
                access_token,
                limit=limit,
                offset=offset,
                market=market,
            )

        except Exception as exc:

            return Response(
                {
                    "detail": "spotify_api_failed",
                    "error": str(exc),
                },
                status=502,
            )

        cache.set(
            cache_key,
            payload,
            300,
        )

        return Response(payload)
    

class PlaylistView(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, playlist_id):

        user = request.user

        market = request.GET.get("market")

        cache_key = (
            f"playlist:{user.spotify_id}:{playlist_id}:{market}"
        )

        cached = cache.get(cache_key)

        if cached:
            return Response(cached)

        try:
            sc = get_spotify_client()

            access_token = resolve_access_token(
                request,
                user,
            )

            payload = sc.get_playlist(
                access_token,
                playlist_id,
                market=market,
            )

        except Exception as exc:
            return Response(
                {
                    "detail": "spotify_api_failed",
                    "error": str(exc),
                },
                status=502,
            )

        cache.set(cache_key, payload, 300)

        return Response(payload)
    
class RecentlyPlayedView(APIView):

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        # Captura os parâmetros da query string
        limit = request.GET.get("limit", 20)
        after = request.GET.get("after")
        before = request.GET.get("before")

        # Monta a chave de cache baseada nos parâmetros dinâmicos
        cache_key = (
            f"recently_played:{user.spotify_id}:{limit}:{after}:{before}"
        )

        cached = cache.get(cache_key)

        if cached:
            return Response(cached)

        try:
            sc = get_spotify_client()

            access_token = resolve_access_token(
                request,
                user,
            )

            payload = sc.get_recently_played(
                access_token,
                limit=int(limit) if limit else 20,
                after=int(after) if after else None,
                before=int(before) if before else None,
            )

        except Exception as exc:
            return Response(
                {
                    "detail": "spotify_api_failed",
                    "error": str(exc),
                },
                status=502,
            )

        cache.set(cache_key, payload, 300)

        return Response(payload)