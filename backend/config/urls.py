from django.urls import path, include
from django.shortcuts import redirect
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.views import JWTAuthentication


class RootView(APIView):
    def get(self, request):
        # Try to authenticate user
        auth = JWTAuthentication()
        try:
            result = auth.authenticate(request)
            if result:
                # User is authenticated, serve the frontend
                return Response({'authenticated': True, 'message': 'Welcome! Frontend should be served from here.'})
        except Exception:
            pass
        
        # User not authenticated, redirect to login
        return Response(status=302, headers={'Location': '/api/auth/login/'})


urlpatterns = [
    path('', RootView.as_view()),
    path('api/auth/', include('apps.accounts.urls')),
]
