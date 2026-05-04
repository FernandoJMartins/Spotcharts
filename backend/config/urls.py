from django.urls import path, include
from django.template.response import TemplateResponse
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from apps.accounts.views import JWTAuthentication


class RootView(APIView):
    def get(self, request):
        # Verifica se a requisição aceita JSON ou HTML
        accept_header = request.META.get('HTTP_ACCEPT', '')
        
        # Se aceita JSON, retorna dados (para o JavaScript)
        if 'application/json' in accept_header or 'text/html' not in accept_header:
            return self._get_json_response(request)
        
        # Caso contrário, serve o HTML
        return self._get_html_response(request)
    
    def _get_json_response(self, request):
        """Retorna dados em JSON para requisições AJAX do JavaScript"""
        auth = JWTAuthentication()
        try:
            result = auth.authenticate(request)
            if result:
                user, _ = result
                return Response({
                    'authenticated': True,
                    'user': {
                        'spotify_id': user.spotify_id,
                        'display_name': user.display_name or 'Anonymous',
                        'email': user.email or 'No email provided',
                    }
                }, status=status.HTTP_200_OK)
        except Exception:
            pass
        
        return Response({
            'authenticated': False,
        }, status=status.HTTP_200_OK)
    
    def _get_html_response(self, request):
        """Retorna o template HTML"""
        return TemplateResponse(request, 'index.html', status=200)


urlpatterns = [
    path('', RootView.as_view()),
    path('api/auth/', include('apps.accounts.urls')),
]
