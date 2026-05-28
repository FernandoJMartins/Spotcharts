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
)
from utils.crypto import decrypt_str


def _parse_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class JWTAuthentication(BaseAuthentication):
    """
    Authenticate requests using JWT from Authorization header.
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

        spotify_id = payload.get("sub")

        if not spotify_id:
            raise exceptions.AuthenticationFailed("invalid_token")

        try:
            user = UserProfile.objects.get(spotify_id=spotify_id)

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


class LoginView(APIView):
    """
    Start Spotify OAuth flow.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        client_id = os.environ.get("SPOTIFY_CLIENT_ID")
        redirect_uri = os.environ.get("SPOTIFY_REDIRECT_URI")

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

        user.refresh_token_encrypted = None
        user.token_expires_at = None

        user.save()

        return Response({
            "detail": "logged_out",
        })


class MeView(APIView):
    """
    Return authenticated user profile.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response({
            "spotify_id": user.spotify_id,
            "display_name": user.display_name,
            "email": user.email,
            "last_sync": user.last_sync,
        })


class TopTracksView(APIView):
    """
    Return user's Spotify top tracks.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

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

        if item_type not in ["tracks", "albums"]:
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