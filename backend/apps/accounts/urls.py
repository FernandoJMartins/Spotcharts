from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='auth-login'),
    path('callback/', views.AuthCallbackView.as_view(), name='auth-callback'),
    path('success/', views.AuthSuccessView.as_view(), name='auth-success'),
    path('me/', views.MeView.as_view(), name='auth-me'),
    path('top-tracks/', views.TopTracksView.as_view(), name='auth-top-tracks'),
    path('refresh/', views.RefreshTokenView.as_view(), name='auth-refresh'),
    path('logout/', views.LogoutView.as_view(), name='auth-logout'),
]
