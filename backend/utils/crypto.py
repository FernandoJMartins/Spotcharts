"""Utilities for encrypting/decrypting sensitive strings (refresh tokens).

This module uses Fernet (symmetric AES-128 in CBC + HMAC) from the `cryptography` package.

Configuration:
- `TOKEN_ENC_KEY` (recommended): a base64 urlsafe 32-byte key for Fernet.
- Fallback: when `TOKEN_ENC_KEY` is not set, a key is derived from `DJANGO_SECRET_KEY`.

Usage:
    from backend.utils.crypto import encrypt_str, decrypt_str
    encrypted = encrypt_str(refresh_token)
    plain = decrypt_str(encrypted)
"""
from __future__ import annotations

import base64
import os
import hashlib
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken


def _derive_key_from_secret(secret: str) -> bytes:
    # Derive a 32-byte key from a secret using SHA256 and urlsafe base64 encode
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def get_fernet() -> Fernet:
    key = os.environ.get("TOKEN_ENC_KEY")
    if key:
        # allow raw or already base64-encoded key
        try:
            return Fernet(key)
        except Exception:
            # try to normalize key
            k = base64.urlsafe_b64encode(key.encode("utf-8"))
            return Fernet(k)

    django_secret = os.environ.get("DJANGO_SECRET_KEY")
    if not django_secret:
        raise RuntimeError("No TOKEN_ENC_KEY or DJANGO_SECRET_KEY available for token encryption")

    derived = _derive_key_from_secret(django_secret)
    return Fernet(derived)


def encrypt_str(value: str) -> str:
    """Encrypt a UTF-8 string and return a URL-safe base64 string.

    Raises RuntimeError if no key is available.
    """
    f = get_fernet()
    token = f.encrypt(value.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_str(token: str) -> Optional[str]:
    """Decrypt a token produced by `encrypt_str`.

    Returns the plain string, or raises InvalidToken if decryption fails.
    """
    f = get_fernet()
    try:
        data = f.decrypt(token.encode("utf-8"))
        return data.decode("utf-8")
    except InvalidToken:
        raise
