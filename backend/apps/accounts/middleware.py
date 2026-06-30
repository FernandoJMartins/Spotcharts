import os

from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone

from .views import JWTAuthentication
from services.spotify_client import SpotifyClient
from utils.crypto import decrypt_str


class SpotifyTokenAutoRefreshMiddleware(MiddlewareMixin):
    """
    Automatically refresh Spotify access token when expired.
    """

    def process_request(self, request):
        auth = JWTAuthentication()

        try:
            result = auth.authenticate(request)

        except Exception:
            return None

        if not result:
            return None

        user, _ = result

        if not getattr(user, "refresh_token_encrypted", None):
            return None

        expires_at = getattr(user, "token_expires_at", None)

        # token ainda válido
        if expires_at and expires_at > timezone.now() + timezone.timedelta(seconds=30):
            return None

        try:
            refresh_token = decrypt_str(user.refresh_token_encrypted)

        except Exception:
            return None

        client_id = os.environ.get("SPOTIFY_CLIENT_ID")
        client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
        redirect_uri = os.environ.get("SPOTIFY_REDIRECT_URI")

        if not all(
            [
                client_id,
                client_secret,
                redirect_uri,
            ]
        ):
            return None

        sc = SpotifyClient(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
        )

        try:
            data = sc.refresh_token(refresh_token)

        except Exception:
            return None

        access_token = data.get("access_token")

        if not access_token:
            return None

        new_refresh_enc = data.get("refresh_token_encrypted")

        expires_in = data.get("expires_in")

        if new_refresh_enc:
            user.refresh_token_encrypted = new_refresh_enc

        if expires_in:
            user.token_expires_at = timezone.now() + timezone.timedelta(
                seconds=expires_in
            )

        user.save()

        # disponibiliza token já renovado
        request.spotify_access_token = access_token

        return None
