from unittest.mock import MagicMock, patch, call
import pytest
import requests

from django.test import TestCase
from services.spotify_client import SpotifyClient

# Fixtures / helpers
CLIENT_ID = "test_client_id"
CLIENT_SECRET = "test_client_secret"
REDIRECT_URI = "https://example.com/callback"
ACCESS_TOKEN = "test_access_token"
REFRESH_TOKEN_PLAIN = "plain_refresh_token"
REFRESH_TOKEN_ENCRYPTED = "encrypted_refresh_token"
AUTH_CODE = "auth_code_abc"


def make_client() -> SpotifyClient:
    return SpotifyClient(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
    )


def make_response(status_code: int = 200, json_data: dict | None = None) -> MagicMock:
    """Cria um mock de requests.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    if status_code >= 400:
        http_err = requests.exceptions.HTTPError(response=resp)
        resp.raise_for_status.side_effect = http_err
    else:
        resp.raise_for_status.return_value = None
    return resp


# _request
class TestRequest(TestCase):
    """Testa o método interno _request."""

    @patch("services.spotify_client.requests.request")
    def test_get_sets_bearer_header(self, mock_request):
        mock_request.return_value = make_response(200, {"ok": True})
        client = make_client()

        result = client._request("GET", "/me", ACCESS_TOKEN)

        mock_request.assert_called_once()
        _, kwargs = mock_request.call_args
        assert kwargs["headers"]["Authorization"] == f"Bearer {ACCESS_TOKEN}"
        assert result == {"ok": True}

    @patch("services.spotify_client.requests.request")
    def test_json_body_sets_content_type(self, mock_request):
        mock_request.return_value = make_response(200, {})
        client = make_client()

        client._request("POST", "/endpoint", ACCESS_TOKEN, json_body={"key": "val"})

        _, kwargs = mock_request.call_args
        assert kwargs["headers"]["Content-Type"] == "application/json"
        assert kwargs["json"] == {"key": "val"}

    @patch("services.spotify_client.requests.request")
    def test_204_returns_none(self, mock_request):
        mock_request.return_value = make_response(204)
        client = make_client()

        result = client._request("PUT", "/me/player/play", ACCESS_TOKEN)

        assert result is None

    @patch("services.spotify_client.requests.request")
    def test_http_error_is_raised(self, mock_request):
        mock_request.return_value = make_response(401)
        client = make_client()

        with pytest.raises(requests.exceptions.HTTPError):
            client._request("GET", "/me", ACCESS_TOKEN)


# exchange_code
class TestExchangeCode(TestCase):
    """Testa a troca do authorization code por token."""

    @patch("services.spotify_client.encrypt_str", return_value=REFRESH_TOKEN_ENCRYPTED)
    @patch("services.spotify_client.requests.post")
    def test_returns_tokens_and_encrypts_refresh(self, mock_post, mock_encrypt):
        mock_post.return_value = make_response(200, {
            "access_token": "acc",
            "refresh_token": REFRESH_TOKEN_PLAIN,
            "expires_in": 3600,
        })
        client = make_client()

        result = client.exchange_code(AUTH_CODE)

        # refresh_token original deve ser removido e substituído pela versão criptografada
        assert "refresh_token" not in result
        assert result["refresh_token_encrypted"] == REFRESH_TOKEN_ENCRYPTED
        assert result["access_token"] == "acc"
        mock_encrypt.assert_called_once_with(REFRESH_TOKEN_PLAIN)

    @patch("services.spotify_client.requests.post")
    def test_no_refresh_token_in_response(self, mock_post):
        """Quando a resposta não traz refresh_token, não deve criar a chave encrypted."""
        mock_post.return_value = make_response(200, {"access_token": "acc"})
        client = make_client()

        result = client.exchange_code(AUTH_CODE)

        assert "refresh_token_encrypted" not in result
        assert result["access_token"] == "acc"

    @patch("services.spotify_client.requests.post")
    def test_http_error_returns_json_body(self, mock_post):
        """Em erro HTTP, retorna o corpo JSON em vez de lançar exceção."""
        error_body = {"error": "invalid_grant"}
        mock_post.return_value = make_response(400, error_body)
        client = make_client()

        result = client.exchange_code(AUTH_CODE)

        assert result == error_body

    @patch("services.spotify_client.requests.post")
    def test_http_error_without_json_raises(self, mock_post):
        """Se o corpo não for JSON, relança a HTTPError."""
        resp = make_response(500)
        resp.json.side_effect = ValueError("no json")
        mock_post.return_value = resp
        client = make_client()

        with pytest.raises(requests.exceptions.HTTPError):
            client.exchange_code(AUTH_CODE)

    @patch("services.spotify_client.requests.post")
    def test_correct_payload_sent(self, mock_post):
        mock_post.return_value = make_response(200, {"access_token": "a"})
        client = make_client()

        client.exchange_code(AUTH_CODE)

        _, kwargs = mock_post.call_args
        payload = kwargs["data"]
        assert payload["grant_type"] == "authorization_code"
        assert payload["code"] == AUTH_CODE
        assert payload["redirect_uri"] == REDIRECT_URI
        assert payload["client_id"] == CLIENT_ID
        assert payload["client_secret"] == CLIENT_SECRET


# refresh_token
class TestRefreshToken(TestCase):
    """Testa a renovação do access token."""

    @patch("services.spotify_client.encrypt_str", return_value=REFRESH_TOKEN_ENCRYPTED)
    @patch("services.spotify_client.requests.post")
    def test_encrypts_new_refresh_token(self, mock_post, mock_encrypt):
        mock_post.return_value = make_response(200, {
            "access_token": "new_acc",
            "refresh_token": "new_plain_refresh",
        })
        client = make_client()

        result = client.refresh_token(REFRESH_TOKEN_PLAIN)

        assert "refresh_token" not in result
        assert result["refresh_token_encrypted"] == REFRESH_TOKEN_ENCRYPTED

    @patch("services.spotify_client.requests.post")
    def test_no_new_refresh_token(self, mock_post):
        """Spotify pode não retornar novo refresh_token — só access_token."""
        mock_post.return_value = make_response(200, {"access_token": "new_acc"})
        client = make_client()

        result = client.refresh_token(REFRESH_TOKEN_PLAIN)

        assert result == {"access_token": "new_acc"}

    @patch("services.spotify_client.requests.post")
    def test_correct_payload_sent(self, mock_post):
        mock_post.return_value = make_response(200, {"access_token": "a"})
        client = make_client()

        client.refresh_token(REFRESH_TOKEN_PLAIN)

        _, kwargs = mock_post.call_args
        payload = kwargs["data"]
        assert payload["grant_type"] == "refresh_token"
        assert payload["refresh_token"] == REFRESH_TOKEN_PLAIN

    @patch("services.spotify_client.requests.post")
    def test_http_error_returns_json_body(self, mock_post):
        error_body = {"error": "invalid_token"}
        mock_post.return_value = make_response(400, error_body)
        client = make_client()

        result = client.refresh_token(REFRESH_TOKEN_PLAIN)

        assert result == error_body


# get_top_tracks

class TestGetTopTracks(TestCase):
    """Testa a busca das músicas mais ouvidas."""

    @patch("services.spotify_client.requests.request")
    def test_default_params(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        client.get_top_tracks(ACCESS_TOKEN)

        _, kwargs = mock_request.call_args
        params = kwargs["params"]
        assert params["time_range"] == "short_term"
        assert params["limit"] == 20
        assert params["offset"] == 0

    @patch("services.spotify_client.requests.request")
    def test_period_mapping(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        for short, expected in [("short", "short_term"), ("medium", "medium_term"), ("long", "long_term")]:
            client.get_top_tracks(ACCESS_TOKEN, period=short)
            _, kwargs = mock_request.call_args
            assert kwargs["params"]["time_range"] == expected

    @patch("services.spotify_client.requests.request")
    def test_invalid_period_defaults_to_short_term(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        client.get_top_tracks(ACCESS_TOKEN, period="invalid")

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["time_range"] == "short_term"

    @patch("services.spotify_client.requests.request")
    def test_custom_limit_and_offset(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        client.get_top_tracks(ACCESS_TOKEN, limit=5, offset=10)

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["limit"] == 5
        assert kwargs["params"]["offset"] == 10


# get_playlist

class TestGetPlaylist(TestCase):
    PLAYLIST_ID = "37i9dQZF1DXcBWIGoYBM5M"

    @patch("services.spotify_client.requests.request")
    def test_builds_correct_endpoint(self, mock_request):
        mock_request.return_value = make_response(200, {"id": self.PLAYLIST_ID})
        client = make_client()

        result = client.get_playlist(ACCESS_TOKEN, self.PLAYLIST_ID)

        _, kwargs = mock_request.call_args
        assert f"/playlists/{self.PLAYLIST_ID}" in kwargs["url"]
        assert result["id"] == self.PLAYLIST_ID

    @patch("services.spotify_client.requests.request")
    def test_market_param_included(self, mock_request):
        mock_request.return_value = make_response(200, {})
        client = make_client()

        client.get_playlist(ACCESS_TOKEN, self.PLAYLIST_ID, market="BR")

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["market"] == "BR"

    @patch("services.spotify_client.requests.request")
    def test_no_market_sends_none_params(self, mock_request):
        mock_request.return_value = make_response(200, {})
        client = make_client()

        client.get_playlist(ACCESS_TOKEN, self.PLAYLIST_ID)

        _, kwargs = mock_request.call_args
        assert kwargs["params"] is None


# get_saved_tracks

class TestGetSavedTracks(TestCase):

    @patch("services.spotify_client.requests.request")
    def test_default_params(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        client.get_saved_tracks(ACCESS_TOKEN)

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["limit"] == 20
        assert kwargs["params"]["offset"] == 0
        assert "market" not in kwargs["params"]

    @patch("services.spotify_client.requests.request")
    def test_market_added_when_provided(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        client.get_saved_tracks(ACCESS_TOKEN, market="US")

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["market"] == "US"

    @patch("services.spotify_client.requests.request")
    def test_http_error_is_raised(self, mock_request):
        mock_request.return_value = make_response(403)
        client = make_client()

        with pytest.raises(requests.exceptions.HTTPError):
            client.get_saved_tracks(ACCESS_TOKEN)


# get_user_top_items

class TestGetUserTopItems(TestCase):

    @patch("services.spotify_client.requests.request")
    def test_tracks_endpoint(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        client.get_user_top_items(ACCESS_TOKEN, item_type="tracks")

        _, kwargs = mock_request.call_args
        assert "/me/top/tracks" in kwargs["url"]

    @patch("services.spotify_client.requests.request")
    def test_artists_endpoint(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        client.get_user_top_items(ACCESS_TOKEN, item_type="artists")

        _, kwargs = mock_request.call_args
        assert "/me/top/artists" in kwargs["url"]

    @patch("services.spotify_client.requests.request")
    def test_invalid_item_type_defaults_to_tracks(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        client.get_user_top_items(ACCESS_TOKEN, item_type="podcasts")

        _, kwargs = mock_request.call_args
        assert "/me/top/tracks" in kwargs["url"]

    @patch("services.spotify_client.requests.request")
    def test_period_mapping(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        for short, expected in [("short", "short_term"), ("medium", "medium_term"), ("long", "long_term")]:
            client.get_user_top_items(ACCESS_TOKEN, period=short)
            _, kwargs = mock_request.call_args
            assert kwargs["params"]["time_range"] == expected


# get_recently_played

class TestGetRecentlyPlayed(TestCase):

    @patch("services.spotify_client.requests.request")
    def test_default_only_limit(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        client.get_recently_played(ACCESS_TOKEN)

        _, kwargs = mock_request.call_args
        params = kwargs["params"]
        assert params["limit"] == 20
        assert "after" not in params
        assert "before" not in params

    @patch("services.spotify_client.requests.request")
    def test_after_param(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        client.get_recently_played(ACCESS_TOKEN, after=1700000000000)

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["after"] == 1700000000000
        assert "before" not in kwargs["params"]

    @patch("services.spotify_client.requests.request")
    def test_before_param(self, mock_request):
        mock_request.return_value = make_response(200, {"items": []})
        client = make_client()

        client.get_recently_played(ACCESS_TOKEN, before=1700000000000)

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["before"] == 1700000000000
        assert "after" not in kwargs["params"]

    @patch("services.spotify_client.requests.request")
    def test_http_error_raised(self, mock_request):
        mock_request.return_value = make_response(401)
        client = make_client()

        with pytest.raises(requests.exceptions.HTTPError):
            client.get_recently_played(ACCESS_TOKEN)


# resume_playback

class TestResumePlayback(TestCase):

    @patch("services.spotify_client.requests.request")
    def test_put_method_used(self, mock_request):
        mock_request.return_value = make_response(204)
        client = make_client()

        client.resume_playback(ACCESS_TOKEN)

        args, kwargs = mock_request.call_args
        assert kwargs["method"] == "PUT"
        assert "/me/player/play" in kwargs["url"]

    @patch("services.spotify_client.requests.request")
    def test_device_id_as_query_param(self, mock_request):
        mock_request.return_value = make_response(204)
        client = make_client()

        client.resume_playback(ACCESS_TOKEN, device_id="dev123")

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["device_id"] == "dev123"

    @patch("services.spotify_client.requests.request")
    def test_context_uri_in_body(self, mock_request):
        mock_request.return_value = make_response(204)
        client = make_client()

        client.resume_playback(ACCESS_TOKEN, context_uri="spotify:playlist:abc")

        _, kwargs = mock_request.call_args
        assert kwargs["json"]["context_uri"] == "spotify:playlist:abc"

    @patch("services.spotify_client.requests.request")
    def test_uris_converted_to_list(self, mock_request):
        mock_request.return_value = make_response(204)
        client = make_client()

        client.resume_playback(ACCESS_TOKEN, uris=("spotify:track:1", "spotify:track:2"))

        _, kwargs = mock_request.call_args
        assert kwargs["json"]["uris"] == ["spotify:track:1", "spotify:track:2"]

    @patch("services.spotify_client.requests.request")
    def test_empty_body_sends_none(self, mock_request):
        mock_request.return_value = make_response(204)
        client = make_client()

        client.resume_playback(ACCESS_TOKEN)

        _, kwargs = mock_request.call_args
        assert kwargs["json"] is None

    @patch("services.spotify_client.requests.request")
    def test_position_ms_in_body(self, mock_request):
        mock_request.return_value = make_response(204)
        client = make_client()

        client.resume_playback(ACCESS_TOKEN, position_ms=30000)

        _, kwargs = mock_request.call_args
        assert kwargs["json"]["position_ms"] == 30000


# get_recommendations
class TestGetRecommendations(TestCase):

    @patch("services.spotify_client.requests.request")
    def test_default_seed_genres_when_no_seeds(self, mock_request):
        """Sem seeds, deve usar pop e rock para satisfazer requisito da API."""
        mock_request.return_value = make_response(200, {"tracks": []})
        client = make_client()

        client.get_recommendations(ACCESS_TOKEN)

        _, kwargs = mock_request.call_args
        assert "pop" in kwargs["params"]["seed_genres"]
        assert "rock" in kwargs["params"]["seed_genres"]

    @patch("services.spotify_client.requests.request")
    def test_seed_artists_joined(self, mock_request):
        mock_request.return_value = make_response(200, {"tracks": []})
        client = make_client()

        client.get_recommendations(ACCESS_TOKEN, seed_artists=["artist1", "artist2"])

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["seed_artists"] == "artist1,artist2"

    @patch("services.spotify_client.requests.request")
    def test_seed_tracks_joined(self, mock_request):
        mock_request.return_value = make_response(200, {"tracks": []})
        client = make_client()

        client.get_recommendations(ACCESS_TOKEN, seed_tracks=["track1"])

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["seed_tracks"] == "track1"

    @patch("services.spotify_client.requests.request")
    def test_energy_params(self, mock_request):
        mock_request.return_value = make_response(200, {"tracks": []})
        client = make_client()

        client.get_recommendations(
            ACCESS_TOKEN,
            seed_genres=["pop"],
            min_energy=0.3,
            max_energy=0.9,
            target_energy=0.6,
        )

        _, kwargs = mock_request.call_args
        params = kwargs["params"]
        assert params["min_energy"] == 0.3
        assert params["max_energy"] == 0.9
        assert params["target_energy"] == 0.6

    @patch("services.spotify_client.requests.request")
    def test_popularity_params(self, mock_request):
        mock_request.return_value = make_response(200, {"tracks": []})
        client = make_client()

        client.get_recommendations(
            ACCESS_TOKEN,
            seed_genres=["rock"],
            min_popularity=20,
            max_popularity=80,
            target_popularity=50,
        )

        _, kwargs = mock_request.call_args
        params = kwargs["params"]
        assert params["min_popularity"] == 20
        assert params["max_popularity"] == 80
        assert params["target_popularity"] == 50

    @patch("services.spotify_client.requests.request")
    def test_optional_params_omitted_when_none(self, mock_request):
        """Parâmetros opcionais não devem aparecer quando não informados."""
        mock_request.return_value = make_response(200, {"tracks": []})
        client = make_client()

        client.get_recommendations(ACCESS_TOKEN, seed_genres=["pop"])

        _, kwargs = mock_request.call_args
        params = kwargs["params"]
        assert "min_energy" not in params
        assert "market" not in params
        assert "min_popularity" not in params

    @patch("services.spotify_client.requests.request")
    def test_limit_param(self, mock_request):
        mock_request.return_value = make_response(200, {"tracks": []})
        client = make_client()

        client.get_recommendations(ACCESS_TOKEN, seed_genres=["jazz"], limit=10)

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["limit"] == 10

    @patch("services.spotify_client.requests.request")
    def test_market_param(self, mock_request):
        mock_request.return_value = make_response(200, {"tracks": []})
        client = make_client()

        client.get_recommendations(ACCESS_TOKEN, seed_genres=["jazz"], market="BR")

        _, kwargs = mock_request.call_args
        assert kwargs["params"]["market"] == "BR"