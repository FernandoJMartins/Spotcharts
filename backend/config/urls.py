from django.urls import path, include
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

# import AuthSuccessView to expose a top-level /auth/success redirect
from apps.accounts.views import AuthSuccessView


class HealthCheckView(APIView):
    """Simple health check endpoint for the API."""
    
    def get(self, request):
        return Response(
            {'status': 'ok', 'message': 'SpotifyCharts API is running'},
            status=status.HTTP_200_OK
        )


urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('auth/success/', AuthSuccessView.as_view(), name='auth-success-root'),
    path('api/auth/', include('apps.accounts.urls')),
]
