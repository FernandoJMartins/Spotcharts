from django.urls import path, include
from django.shortcuts import redirect


def root_redirect(_request):
    return redirect('/api/auth/login/')

urlpatterns = [
    path('', root_redirect),
    path('api/auth/', include('apps.accounts.urls')),
]
