# Spotify API Testing (Backend + Postman)

This document describes how to validate backend routes and Spotify integration using browser + Postman. It assumes the backend is already running and the OAuth flow is configured.

## Prerequisites
- Spotify app created in the developer dashboard.
- SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI set in .env.
- FRONTEND_URL set in .env for the post-login redirect.
- Backend running on port 8000.
- If using ngrok, the public URL is stable during the test session.

## Environment Setup
Choose one base URL:
- Local: http://localhost:8000
- Via ngrok (frontend only): https://<your-ngrok-domain>

Note: When using ngrok with frontend-only exposure, requests to /api are proxied by Vite. For Postman, target the backend directly at http://localhost:8000 unless you also expose the backend.

### Backend-only OAuth testing (no frontend)
If you want to keep the entire OAuth flow on the backend UI, set:

```
FRONTEND_URL=http://127.0.0.1:8000/
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000/api/auth/callback/
```

Then restart the backend container. This keeps the Spotify callback and final redirect on the backend page, which is easier for API-only testing.

## Step 1: Start OAuth Flow (Browser)
Spotify requires an interactive login, so start here in a browser:
- Open: {{BASE_URL}}/api/auth/login/
- Complete Spotify login and consent.
- You should be redirected to FRONTEND_URL (backend root if configured for backend-only testing).

## Step 2: Capture the Session Cookie
From the browser DevTools:
- Application -> Cookies -> session
- Copy the session cookie value.

Store it in Postman as a variable:
- JWT = <session cookie value>

## Step 3: Validate Authenticated Routes
Request: GET /api/auth/me/
- URL: {{BASE_URL}}/api/auth/me/
- Header (option A): Cookie: session={{JWT}}
- Header (option B): Authorization: Bearer {{JWT}}
Expected:
- 200 OK with user profile JSON when authenticated.
- 401 Unauthorized when missing or invalid token.

## Step 4: Manual Refresh
Request: POST /api/auth/refresh/
- URL: {{BASE_URL}}/api/auth/refresh/
- Header: Authorization: Bearer {{JWT}}
Expected:
- 200 OK with { access_token, expires_in }

## Step 5: Call Spotify API Directly (Optional)
Use the access_token returned by refresh:
- Request: GET https://api.spotify.com/v1/me
- Header: Authorization: Bearer <access_token>
Expected:
- 200 OK with Spotify profile JSON.

## Step 6: Logout
Request: POST /api/auth/logout/
- URL: {{BASE_URL}}/api/auth/logout/
- Header: Cookie: session={{JWT}}
Expected:
- 200 OK, session cookie deleted.
- Subsequent /api/auth/me/ returns 401.

## Step 7: Top Tracks (New Endpoint)
Request: GET /api/auth/top-tracks/
- URL: {{BASE_URL}}/api/auth/top-tracks/?period=short&limit=10
- Header (option A): Cookie: session={{JWT}}
- Header (option B): Authorization: Bearer {{JWT}}
Expected:
- 200 OK with a minimal list of tracks.

## Notes and Troubleshooting
- If redirect fails: verify SPOTIFY_REDIRECT_URI in Spotify dashboard matches exactly.
- If cookie is missing: ensure FRONTEND_URL is correct and you used HTTPS when secure cookies are enabled.
- If using ngrok: the public URL changes each run unless you have a reserved domain, so update .env and Spotify redirect each time.
- If Postman calls fail with 401: confirm you copied the session cookie correctly.

## Suggested Postman Collection (Minimal)
1. Auth - Me (GET) -> /api/auth/me/
2. Auth - Refresh (POST) -> /api/auth/refresh/
3. Auth - Top Tracks (GET) -> /api/auth/top-tracks/
4. Auth - Logout (POST) -> /api/auth/logout/

Variables:
- BASE_URL
- JWT
