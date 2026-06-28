import pytest
import os
from unittest.mock import patch
from cryptography.fernet import InvalidToken
from utils.crypto import encrypt_str, decrypt_str

def test_encrypt_decrypt_cycle():
    # Fernet key must be 32 bytes before base64 encoding
    import base64
    key = base64.urlsafe_b64encode(b"01234567890123456789012345678901").decode()
    with patch.dict(os.environ, {"TOKEN_ENC_KEY": key}):
        original = "super-secret-spotify-token"
        encrypted = encrypt_str(original)
        assert encrypted != original
        
        decrypted = decrypt_str(encrypted)
        assert decrypted == original

def test_encrypt_decrypt_with_32_byte_key():
    import base64
    key = base64.urlsafe_b64encode(b"01234567890123456789012345678901").decode()
    with patch.dict(os.environ, {"TOKEN_ENC_KEY": key}):
        original = "another-secret"
        encrypted = encrypt_str(original)
        decrypted = decrypt_str(encrypted)
        assert decrypted == original

def test_decrypt_invalid_token():
    import base64
    key = base64.urlsafe_b64encode(b"01234567890123456789012345678901").decode()
    with patch.dict(os.environ, {"TOKEN_ENC_KEY": key}):
        with pytest.raises(InvalidToken):
            decrypt_str("invalid-token-string")

def test_derive_key_from_django_secret():
    with patch.dict(os.environ, {"DJANGO_SECRET_KEY": "my-secret-key"}, clear=True):
        if "TOKEN_ENC_KEY" in os.environ:
            del os.environ["TOKEN_ENC_KEY"]
            
        original = "test-value"
        encrypted = encrypt_str(original)
        decrypted = decrypt_str(encrypted)
        assert decrypted == original
