"""Cliente simples para interação com Spotify Web API (placeholder).
Responsabilidade: trocar authorization code por token, renovar token, encapsular chamadas.
"""

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
        # If Spotify returns a refresh_token, encrypt it for safe storage
        if 'refresh_token' in data and data.get('refresh_token'):
            try:
                encrypted = encrypt_str(data.pop('refresh_token'))
                data['refresh_token_encrypted'] = encrypted
            except Exception:
                # If encryption fails, propagate original response (fail-open)
                pass
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
        # If a new refresh_token is issued, encrypt it
        if 'refresh_token' in data and data.get('refresh_token'):
            try:
                encrypted = encrypt_str(data.pop('refresh_token'))
                data['refresh_token_encrypted'] = encrypted
            except Exception:
                pass
        return data

    def get_top_tracks(self, access_token: str, period: str = 'short', limit: int = 20):
        # period mapping: short = short_term, medium = medium_term, long = long_term
        mapping = {'short': 'short_term', 'medium': 'medium_term', 'long': 'long_term'}
        time_range = mapping.get(period, 'short_term')
        headers = {'Authorization': f'Bearer {access_token}'}
        resp = requests.get(f"{SPOTIFY_API_BASE}/me/top/tracks", params={'time_range': time_range, 'limit': limit}, headers=headers)
        resp.raise_for_status()
        return resp.json()
