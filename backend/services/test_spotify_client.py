from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from services.spotify_client import (
    SpotifyClient,
    SPOTIFY_API_BASE,
    SPOTIFY_TOKEN_URL,
)


class SpotifyClientTest(SimpleTestCase):

    def setUp(self):
        self.client = SpotifyClient(
            client_id="test_id",
            client_secret="test_secret",
            redirect_uri="http://localhost:8000/callback",
        )

    @patch("services.spotify_client.encrypt_str")
    @patch("services.spotify_client.requests.post")
    def test_exchange_code(self, mock_post, mock_encrypt):
        mock_encrypt.return_value = "encrypted_token"

        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {
            "access_token": "acc_123",
            "refresh_token": "ref_123",
            "expires_in": 3600,
        }

        mock_post.return_value = response

        result = self.client.exchange_code("auth_code")

        self.assertEqual(result["access_token"], "acc_123")
        self.assertEqual(
            result["refresh_token_encrypted"],
            "encrypted_token",
        )

    @patch("services.spotify_client.requests.request")
    def test_get_top_tracks(self, mock_get):
        response = Mock()
        response.json.return_value = {
            "items": [
                {"name": "Song 1"},
                {"name": "Song 2"},
            ]
        }
        response.raise_for_status.return_value = None

        mock_get.return_value = response

        result = self.client.get_top_tracks("acc_123")

        self.assertEqual(len(result["items"]), 2)
        self.assertEqual(result["items"][0]["name"], "Song 1")

        mock_get.assert_called_once()

    @patch("services.spotify_client.requests.request")
    def test_get_audio_features(self, mock_request):
        response = Mock()
        response.json.return_value = {
            "audio_features": [
                {"id": "track_1", "danceability": 0.8},
                None,
            ]
        }
        response.raise_for_status.return_value = None

        mock_request.return_value = response

        result = self.client.get_audio_features(
            "acc_123",
            ["track_1", "track_2"],
        )

        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["id"], "track_1")

        mock_request.assert_called_once()

    @patch("services.spotify_client.requests.post")
    def test_refresh_token(self, mock_post):
        response = Mock()
        response.json.return_value = {
            "access_token": "new_acc_123",
            "expires_in": 3600,
        }
        response.raise_for_status.return_value = None

        mock_post.return_value = response

        result = self.client.refresh_token("ref_123")

        self.assertEqual(result["access_token"], "new_acc_123")

    @patch("services.spotify_client.requests.get")
    def test_request_error(self, mock_get):
        response = Mock()
        response.raise_for_status.side_effect = Exception("401 Unauthorized")

        mock_get.return_value = response

        with self.assertRaises(Exception):
            self.client.get_top_tracks("bad_token")
