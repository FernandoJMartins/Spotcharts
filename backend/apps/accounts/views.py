import os
import requests
import jwt
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import UserProfile
from ...services.spotify_client import SpotifyClient
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
