"""Cliente simples para interação com Spotify Web API (placeholder).
Responsabilidade: trocar authorization code por token, renovar token, encapsular chamadas.
"""

from typing import Sequence
import os
import requests
from urllib.parse import urlencode

from utils.crypto import encrypt_str

SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"

class SpotifyClient:
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

    def exchange_code(self, code: str):
        payload = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self.redirect_uri,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
        }
        resp = requests.post(SPOTIFY_TOKEN_URL, data=payload)
        resp.raise_for_status()
        data = resp.json()
        if 'refresh_token' in data and data.get('refresh_token'):
            encrypted = encrypt_str(data.pop('refresh_token'))
            data['refresh_token_encrypted'] = encrypted
        return data

    def refresh_token(self, refresh_token: str):
        payload = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
        }
        resp = requests.post(SPOTIFY_TOKEN_URL, data=payload)
        resp.raise_for_status()
        data = resp.json()
        if 'refresh_token' in data and data.get('refresh_token'):
            encrypted = encrypt_str(data.pop('refresh_token'))
            data['refresh_token_encrypted'] = encrypted
        return data

    def get_top_tracks(self, access_token: str, period: str = 'short', limit: int = 20, offset: int = 0):
        mapping = {'short': 'short_term', 'medium': 'medium_term', 'long': 'long_term'}
        time_range = mapping.get(period, 'short_term')
        headers = {'Authorization': f'Bearer {access_token}'}
        params = {
            'time_range': time_range,
            'limit': limit,
            'offset': offset,
        }
        resp = requests.get(
            f"{SPOTIFY_API_BASE}/me/top/tracks",
            params=params,
            headers=headers,
        )
        resp.raise_for_status()
        return resp.json()    
    
    def get_playlist(
        self,
        access_token: str,
        playlist_id: str,
        market: str | None = None,
        ) -> dict[str, str]:
            params = {"market": market} if market else None
            return self._request("GET", f"/playlists/{playlist_id}", access_token, params=params)
        
    def get_saved_tracks(
        self,
        access_token: str,
        limit: int = 20,
        offset: int = 0,
        market: str | None = None,
    ) -> dict[str, str]:
        params: dict[str, str] = {"limit": limit, "offset": offset}
        if market:
            params["market"] = market
            
    def get_user_top_items(
        self,
        access_token: str,
        item_type: str = "tracks",
        period: str = "short",
        limit: int = 20,
        offset: int = 0,
    ) -> dict[str, str]:
        mapping = {
            "short": "short_term",
            "medium": "medium_term",
            "long": "long_term",
        }
        time_range = mapping.get(period, "short_term")
        item_type = item_type if item_type in {"tracks", "artists"} else "tracks"

        params = {
            "time_range": time_range,
            "limit": limit,
            "offset": offset,
        }
        return self._request("GET", f"/me/top/{item_type}", access_token, params=params)
    
    def get_recently_played(
        self,
        access_token: str,
        limit: int = 20,
        after: int | None = None,
        before: int | None = None,
    ) -> dict[str, str]:
        params: dict[str, str] = {"limit": limit}
        if after is not None:
            params["after"] = after
        if before is not None:
            params["before"] = before
            
    def resume_playback(
        self,
        access_token: str,
        *,
        device_id: str | None = None,
        context_uri: str | None = None,
        uris: Sequence[str] | None = None,
        offset: dict[str, str] | None = None,
        position_ms: int | None = None,
    ) -> None:
        params = {"device_id": device_id} if device_id else None

        body: dict[str, str] = {}
        if context_uri:
            body["context_uri"] = context_uri
        if uris:
            body["uris"] = list(uris)
        if offset:
            body["offset"] = offset
        if position_ms is not None:
            body["position_ms"] = position_ms

        self._request("PUT", "/me/player/play", access_token, params=params, json_body=body or None)

    def get_recommendations(
        self,
        access_token: str,
        seed_artists: Sequence[str] | None = None,
        seed_tracks: Sequence[str] | None = None,
        seed_genres: Sequence[str] | None = None,
        limit: int = 20,
        market: str | None = None,
        min_energy: float | None = None,
        max_energy: float | None = None,
        target_energy: float | None = None,
        min_popularity: int | None = None,
        max_popularity: int | None = None,
        target_popularity: int | None = None,
    ) -> dict[str, str]:
        params: dict[str, str] = {"limit": limit}

        if seed_artists:
            params["seed_artists"] = ",".join(seed_artists)
        if seed_tracks:
            params["seed_tracks"] = ",".join(seed_tracks)
        if seed_genres:
            params["seed_genres"] = ",".join(seed_genres)
        if market:
            params["market"] = market

        if min_energy is not None:
            params["min_energy"] = min_energy
        if max_energy is not None:
            params["max_energy"] = max_energy
        if target_energy is not None:
            params["target_energy"] = target_energy
        if min_popularity is not None:
            params["min_popularity"] = min_popularity
        if max_popularity is not None:
            params["max_popularity"] = max_popularity
        if target_popularity is not None:
            params["target_popularity"] = target_popularity

        return self._request("GET", "/recommendations", access_token, params=params)

