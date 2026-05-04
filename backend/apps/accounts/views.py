import os
import uuid
import requests
import jwt
from datetime import datetime, timedelta
from urllib.parse import urlencode
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import UserProfile
from services.spotify_client import SpotifyClient
from utils.crypto import decrypt_str
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions


class JWTAuthentication(BaseAuthentication):
    """Authenticate requests using JWT from cookie `session` or Authorization header."""

    def authenticate(self, request):
        token = None
        # 1) Try cookie
        token = request.COOKIES.get('session')
        # 2) Fallback to Authorization header
        if not token:
            auth = request.META.get('HTTP_AUTHORIZATION', '')
            if auth.startswith('Bearer '):
                token = auth.split(' ', 1)[1].strip()

        if not token:
            return None

        jwt_secret = os.environ.get('JWT_SECRET', settings.SECRET_KEY)
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('token_expired')
        except Exception:
            raise exceptions.AuthenticationFailed('invalid_token')

        spotify_id = payload.get('sub')
        if not spotify_id:
            raise exceptions.AuthenticationFailed('invalid_token')

        try:
            user = UserProfile.objects.get(spotify_id=spotify_id)
        except UserProfile.DoesNotExist:
            raise exceptions.AuthenticationFailed('user_not_found')

        # DRF expects a (user, auth) tuple; here we return the UserProfile as the user object
        return (user, None)


class AuthCallbackView(APIView):
    """Handle Spotify OAuth callback: exchange code, fetch profile, persist user."""

    def get(self, request):
        code = request.GET.get('code')
        state = request.GET.get('state')
        if not code:
            return Response({'detail': 'missing code'}, status=status.HTTP_400_BAD_REQUEST)
        # Verify state to mitigate CSRF
        state_cookie = request.COOKIES.get('spotify_auth_state')
        if state_cookie and state and state_cookie != state:
            return Response({'detail': 'invalid_state'}, status=status.HTTP_400_BAD_REQUEST)
        client_id = os.environ.get('SPOTIFY_CLIENT_ID')
        client_secret = os.environ.get('SPOTIFY_CLIENT_SECRET')
        redirect_uri = os.environ.get('SPOTIFY_REDIRECT_URI')
        if not all([client_id, client_secret, redirect_uri]):
            return Response({'detail': 'server not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        sc = SpotifyClient(client_id=client_id, client_secret=client_secret, redirect_uri=redirect_uri)
        try:
            token_data = sc.exchange_code(code)
        except Exception as exc:
            return Response({'detail': 'token exchange failed', 'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        access_token = token_data.get('access_token')
        refresh_token_enc = token_data.get('refresh_token_encrypted')
        expires_in = token_data.get('expires_in')

        # Validate that refresh token was successfully encrypted
        if not refresh_token_enc:
            return Response({'detail': 'token_encryption_failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Fetch user profile from Spotify
        me = None
        if access_token:
            try:
                resp = requests.get('https://api.spotify.com/v1/me', headers={'Authorization': f'Bearer {access_token}'})
                resp.raise_for_status()
                me = resp.json()
            except Exception:
                me = None

        spotify_id = (me or {}).get('id')
        display_name = (me or {}).get('display_name')
        email = (me or {}).get('email')

        if not spotify_id:
            return Response({'detail': 'unable to fetch spotify user'}, status=status.HTTP_502_BAD_GATEWAY)

        obj, created = UserProfile.objects.update_or_create(
            spotify_id=spotify_id,
            defaults={
                'display_name': display_name,
                'email': email,
                'refresh_token_encrypted': refresh_token_enc,
                'token_expires_at': timezone.now() + timezone.timedelta(seconds=expires_in) if expires_in else None,
            }
        )

        # Issue a JWT for the user and set it as HttpOnly cookie
        jwt_secret = os.environ.get('JWT_SECRET', settings.SECRET_KEY)
        jwt_exp_days = int(os.environ.get('JWT_EXP_DAYS', '7'))
        payload = {
            'sub': spotify_id,
            'name': display_name,
            'exp': datetime.utcnow() + timedelta(days=jwt_exp_days),
            'iat': datetime.utcnow(),
        }
        token = jwt.encode(payload, jwt_secret, algorithm='HS256')

        frontend_url = os.environ.get('FRONTEND_URL')
        response_data = {'spotify_id': spotify_id, 'created': created}
        if frontend_url:
            # redirect back to frontend; cookie is set on same top-level domain
            resp = Response(status=status.HTTP_302_FOUND)
            resp['Location'] = frontend_url
        else:
            resp = Response(response_data)

        # Cookie attributes
        secure_flag = not settings.DEBUG
        resp.set_cookie(
            key='session',
            value=token,
            httponly=True,
            secure=secure_flag,
            samesite='Strict',
            path='/',
            max_age=jwt_exp_days * 24 * 3600,
        )

        # Clear the oauth state cookie after successful auth
        if state_cookie:
            resp.delete_cookie('spotify_auth_state', path='/')

        return resp


class LoginView(APIView):
    """Start Spotify Authorization Code flow by redirecting to Spotify authorize URL."""

    def get(self, request):
        client_id = os.environ.get('SPOTIFY_CLIENT_ID')
        redirect_uri = os.environ.get('SPOTIFY_REDIRECT_URI')
        if not all([client_id, redirect_uri]):
            return Response({'detail': 'server not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Recommended scopes for the app
        scopes = os.environ.get('SPOTIFY_SCOPES', 'user-top-read user-read-email user-read-private')

        state = uuid.uuid4().hex
        params = {
            'response_type': 'code',
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'scope': scopes,
            'state': state,
        }
        url = f"https://accounts.spotify.com/authorize?{urlencode(params)}"

        secure_flag = not settings.DEBUG
        resp = Response(status=status.HTTP_302_FOUND)
        resp['Location'] = url
        # store state for verification in callback
        resp.set_cookie('spotify_auth_state', state, httponly=True, secure=secure_flag, samesite='Strict', path='/', max_age=300)
        return resp


class RefreshTokenView(APIView):
    """Use stored refresh token to obtain a fresh access token from Spotify."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not hasattr(user, 'refresh_token_encrypted') or not user.refresh_token_encrypted:
            return Response({'detail': 'no_refresh_token'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh_token = decrypt_str(user.refresh_token_encrypted)
        except Exception:
            return Response({'detail': 'invalid_refresh_token_storage'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        client_id = os.environ.get('SPOTIFY_CLIENT_ID')
        client_secret = os.environ.get('SPOTIFY_CLIENT_SECRET')
        redirect_uri = os.environ.get('SPOTIFY_REDIRECT_URI')
        if not all([client_id, client_secret, redirect_uri]):
            return Response({'detail': 'server not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        sc = SpotifyClient(client_id=client_id, client_secret=client_secret, redirect_uri=redirect_uri)
        try:
            data = sc.refresh_token(refresh_token)
        except Exception as exc:
            return Response({'detail': 'refresh_failed', 'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        access_token = data.get('access_token')
        new_refresh_enc = data.get('refresh_token_encrypted')
        expires_in = data.get('expires_in')

        if new_refresh_enc:
            user.refresh_token_encrypted = new_refresh_enc
        if expires_in:
            user.token_expires_at = timezone.now() + timezone.timedelta(seconds=expires_in)
        user.save()

        return Response({'access_token': access_token, 'expires_in': expires_in})


class LogoutView(APIView):
    """Invalidate session cookie and optionally remove stored refresh token."""

    def post(self, request):
        # If user is authenticated, clear stored refresh token
        try:
            auth = JWTAuthentication()
            result = auth.authenticate(request)
        except Exception:
            result = None

        if result:
            user, _ = result
            # optional: clear refresh token to force re-auth
            user.refresh_token_encrypted = None
            user.token_expires_at = None
            user.save()

        resp = Response({'detail': 'logged_out'}, status=status.HTTP_200_OK)
        # clear session cookie
        resp.delete_cookie('session', path='/')
        return resp


class MeView(APIView):
    """Return current user's profile based on JWT authentication."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'spotify_id': user.spotify_id,
            'display_name': user.display_name,
            'email': user.email,
            'last_sync': user.last_sync,
        }
        return Response(data)
