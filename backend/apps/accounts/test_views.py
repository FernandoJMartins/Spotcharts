import pytest
from django.urls import reverse
from rest_framework import status
from apps.accounts.models import UserProfile
import jwt
from django.conf import settings


@pytest.fixture
def spotify_user(db):
    return UserProfile.objects.create(
        spotify_id="spotify_123",
        display_name="Spotify User",
        email="spotify@example.com",
    )


def test_me_view_unauthenticated(api_client):
    url = "/api/auth/me/"
    response = api_client.get(url)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_view_authenticated(api_client, spotify_user):
    payload = {"sub": "spotify_123", "exp": 9999999999}
    import os

    jwt_secret = os.environ.get("JWT_SECRET", settings.SECRET_KEY)
    token = jwt.encode(payload, jwt_secret, algorithm="HS256")

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    url = "/api/auth/me/"
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["mode"] == "spotify"
    assert response.data["display_name"] == "Spotify User"
