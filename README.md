# PGF Budget Dashboard (Private)

This project is now served by a small Node server with HTTP Basic Auth, so the app is protected before any frontend code is loaded.

## Local run

1. Create env vars:
   - `APP_USER`
   - `APP_PASS`
2. Start:
   - `npm start`
3. Open:
   - `http://localhost:3000`

## Render setup

1. Create a Web Service from this repository (or update existing one).
2. Render detects `render.yaml`.
3. Set environment variables in Render:
   - `APP_USER`
   - `APP_PASS`
4. Deploy.

Without `APP_USER` / `APP_PASS`, access is denied by design.
