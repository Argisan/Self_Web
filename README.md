# Argi Studio Website

Portfolio website built with plain HTML, CSS, JavaScript, and a small Node server for the shared guestbook and license key management.

## Structure

- `index.html` — login page
- `home.html` — portfolio page (includes Netflix Cookie Storage tool)
- `admin.html` — admin panel for managing license keys
- `assets/css/base.css` — shared design tokens and base styles
- `assets/css/login.css` — login page styles
- `assets/css/home.css` — portfolio page styles
- `assets/css/admin.css` — admin panel styles
- `assets/js/login.js` — login and session logic
- `assets/js/home.js` — portfolio interactions, NFToken cookie tool
- `assets/js/admin.js` — admin panel logic
- `assets/images/` — local image assets
- `assets/audio/` — local audio assets
- `data/guestbook.json` — shared guestbook storage (auto-created)
- `data/licenses.json` — license key storage (auto-created, gitignored)
- `data/admin-config.json` — admin password hash (auto-created, gitignored)
- `server.js` — local static server, guestbook API, license key API, NFToken proxy
- `package.json` — start script for the local server

## Demo Login

- Username: `argi`
- Password: `password`

## Run Locally

1. Start the local server (optionally set the admin password):
   ```
   ADMIN_PASSWORD=Argisan123 node server.js
   ```
   If `ADMIN_PASSWORD` is not set, a random password is generated and printed to the console on first run.
2. Open: `http://localhost:4173`

## Admin Panel

Visit `http://localhost:4173/admin.html` to manage license keys.

- Sign in with the admin password (default: set via `ADMIN_PASSWORD` env var, printed on first run if not set).
- Create new license keys with optional labels and expiry dates.
- Enable, disable, or delete existing keys.
- Monitor active sessions.

## License Key System

The Netflix Cookie Storage tool on the portfolio page requires a valid license key to generate NFTokens.

- Each key allows **one active session at a time** to prevent abuse.
- Keys can have an expiry date.
- Keys can be enabled or disabled by the owner at any time.
- Sessions expire automatically after 5 minutes of inactivity.

## NFToken Proxy

The server provides a `/api/nftoken` endpoint that proxies cookie-based NFToken generation requests to `nftoken.site` using the configured API key, avoiding browser CORS restrictions.

## Notes

- The guestbook uses a local backend at `/api/guestbook` and stores posts in `data/guestbook.json`.
- Authentication is client-side only and intended for demo use.
- The home page includes a live feather-style animated background tuned for a black, radiant purple, and silver theme.
