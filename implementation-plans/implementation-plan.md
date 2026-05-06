# Implementation Plan

## Overview
Finalize the frontend experience and integrate it with the existing Spotify OAuth backend. Add a data endpoint for Spotify charts so the UI can render real content. Ensure auth state is consistent in the UI and validate flows with Postman and browser.

## Goals
- Complete the React UI for Home, Login, Register, and Charts pages.
- Integrate login via Spotify OAuth (authorization code flow).
- Add a backend endpoint to return Spotify data for charts.
- Maintain consistent auth state across routes and navigation.
- Validate the end-to-end flow in dev (local or ngrok).

## Non-goals
- No production deployment or CI/CD changes in this phase.
- No local account system beyond Spotify OAuth.
- No advanced caching or analytics yet.

## Current State (Key Findings)
- OAuth flow is implemented in the backend (login, callback, refresh, logout).
- Frontend routes exist but most pages are placeholders.
- Header auth state is currently mocked (always unauthenticated).
- Protected route uses localStorage token check, but no UI sets that token.

## Implementation Steps
1. Align frontend with existing auth endpoints:
   - Use GET /api/auth/login/ to start the OAuth flow.
   - Use GET /api/auth/me/ to fetch the current user.
   - Use POST /api/auth/logout/ to clear the session.
   - Use POST /api/auth/refresh/ for manual token refresh tests.
2. Add a backend data endpoint for charts:
   - Use SpotifyClient.get_top_tracks to fetch data.
   - Require auth and rely on middleware to refresh tokens if needed.
   - Return a stable JSON response shape for the UI.
3. Normalize backend responses and error handling:
   - 401 for unauthenticated requests.
   - 502 for Spotify upstream failures.
   - Consistent error payloads for UI.
4. Add a thin API client layer in the frontend:
   - Use relative base URL and /api proxy in dev.
   - Handle loading and error states.
5. Implement the Login and Register UX:
   - Both pages should send the user to /api/auth/login/.
   - After redirect back to the frontend, call /api/auth/me/ to hydrate user state.
6. Update Header and PrivateRoute:
   - Use real auth state from the backend (not mocked).
   - Hide and show protected links based on user state.
7. Implement the Charts page:
   - Fetch data from the new backend endpoint.
   - Render a list or chart with a loading state.
8. End-to-end validation:
   - Validate login, redirect, and session cookie.
   - Validate protected route access and logout behavior.

## Deliverables
- A backend endpoint for top tracks (or similar Spotify data).
- Implemented UI for Home, Login, Register, Charts.
- Centralized auth state in the frontend.
- A documented test procedure for Postman and browser.

## Validation Checklist
- OAuth flow redirects and sets session cookie.
- /api/auth/me returns user data when authenticated and 401 otherwise.
- Charts endpoint returns data and UI renders it.
- Logout clears the session and protected routes redirect.

## Risks
- Cookie scope and SameSite rules when using ngrok.
- Spotify redirect URI must match exactly in the developer console.
- Token refresh flow depends on correct encryption key and DB state.

## Open Questions
- Final route name for charts endpoint: /api/charts/top-tracks/ or /api/auth/top-tracks/ ?
- UI design direction for charts (list vs. chart).
- Whether to cache Spotify data server-side in this phase.
