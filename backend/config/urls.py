from django.urls import path, include
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from apps.accounts.views import JWTAuthentication


class RootView(APIView):
    def get(self, request):
        # Try to authenticate user
        auth = JWTAuthentication()
        try:
            result = auth.authenticate(request)
            if result:
                user, _ = result
                # User is authenticated, return user info
                return Response({
                    'authenticated': True,
                    'user': {
                        'spotify_id': user.spotify_id,
                        'display_name': user.display_name or 'Anonymous',
                        'email': user.email or 'No email provided',
                    },
                    'message': f'Welcome {user.display_name or user.spotify_id}! 🎵'
                }, status=status.HTTP_200_OK)
        except Exception:
            pass
        
        # User not authenticated, redirect to login
        return Response({
            'authenticated': False,
            'message': 'Please log in with Spotify to continue',
            'action': 'redirect_to_login'
        }, status=status.HTTP_401_UNAUTHORIZED, headers={'Location': '/api/auth/login/'})


urlpatterns = [
    path('', RootView.as_view()),
    path('api/auth/', include('apps.accounts.urls')),
]
