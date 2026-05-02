from django.urls import path
from . import views

urlpatterns = [
    path('callback/', views.AuthCallbackView.as_view(), name='auth-callback'),
    path('me/', views.MeView.as_view(), name='auth-me'),
]
