from django.db import models


class UserProfile(models.Model):
    spotify_id = models.CharField(max_length=128, unique=True)
    display_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    refresh_token_encrypted = models.TextField(blank=True, null=True)
    token_expires_at = models.DateTimeField(blank=True, null=True)
    scopes = models.TextField(blank=True, null=True)
    last_sync = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"UserProfile({self.spotify_id})"
