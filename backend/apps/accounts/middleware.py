from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
import os

from .models import UserProfile
from .views import JWTAuthentication
from services.spotify_client import SpotifyClient
from utils.crypto import decrypt_str

class SpotifyTokenAutoRefreshMiddleware(MiddlewareMixin):
    """Middleware that checks if the stored access token for the authenticated user
    is expired (based on `token_expires_at`) and attempts to refresh it using the
    stored refresh token. If refresh succeeds, updates `refresh_token_encrypted`
    and `token_expires_at` on the user and attaches `request.spotify_access_token`.

    Notes:
    - This middleware is intentionally conservative: it only runs for requests
      that include a valid JWT session (checked via `JWTAuthentication`).
    - It does not modify session JWTs; it only refreshes Spotify access tokens
      used to call Spotify Web API on behalf of the user.
    """

    def process_request(self, request):
        # Try to authenticate using the project's JWT auth
        auth = JWTAuthentication()
        try:
            result = auth.authenticate(request)
        except Exception:
            result = None

        if not result:
            return None

        user, _ = result

        # If we don't have a refresh token stored, nothing to do
        if not getattr(user, 'refresh_token_encrypted', None):
            return None

        # If token_expires_at not set or not expired, no need to refresh
        expires_at = getattr(user, 'token_expires_at', None)
        if expires_at and expires_at > timezone.now() + timezone.timedelta(seconds=30):
            # still valid for at least 30 seconds
            return None

        # Attempt refresh
        try:
            refresh_plain = decrypt_str(user.refresh_token_encrypted)
        except Exception:
            return None

        client_id = os.environ.get('SPOTIFY_CLIENT_ID')
        client_secret = os.environ.get('SPOTIFY_CLIENT_SECRET')
        redirect_uri = os.environ.get('SPOTIFY_REDIRECT_URI')
        if not all([client_id, client_secret, redirect_uri]):
            return None

        sc = SpotifyClient(client_id=client_id, client_secret=client_secret, redirect_uri=redirect_uri)
        try:
            data = sc.refresh_token(refresh_plain)
        except Exception:
            return None

        access_token = data.get('access_token')
        new_refresh_enc = data.get('refresh_token_encrypted')
        expires_in = data.get('expires_in')

        if new_refresh_enc:
            user.refresh_token_encrypted = new_refresh_enc
        if expires_in:
            user.token_expires_at = timezone.now() + timezone.timedelta(seconds=expires_in)
        user.save()

        # Attach the fresh access token to the request for view usage
        request.spotify_access_token = access_token
        return None
