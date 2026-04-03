# Argi Studio Website

Argi Studio is a plain HTML/CSS/JavaScript portfolio served by a small Node.js server. The server is the real runtime entry point and now owns both portfolio and admin authentication.

## Entry flow

- Runtime entry: `server.js`
- Browser entry: `http://localhost:4173/`
- App flow: `login.html` -> `home.html` -> `admin.html`

`index.html` only redirects to `/`. `index.php`, `accounts.html`, and the old placeholder account script were removed because they were not part of the real app flow.

## Stack

- Frontend: plain HTML, CSS, and vanilla JavaScript
- Backend: Node.js `http` server in `server.js`
- Storage: JSON files in `data/`
- External integration: NFToken proxy route at `/api/nftoken`

## Environment

Copy `.env.example` to `.env` and set strong secrets:

```env
PORT=4173
APP_USERNAME=portfolio
APP_PASSWORD=replace-with-a-strong-portfolio-password
ADMIN_PASSWORD=replace-with-a-strong-admin-password
NFTOKEN_API_KEY=replace-with-a-rotated-nftoken-api-key
```

Notes:

- `.env` is gitignored and should stay local only.
- If `APP_USERNAME` and `APP_PASSWORD` are missing, the server will generate a portfolio login on first run and store only a password hash in `data/app-config.json`.
- If `ADMIN_PASSWORD` is missing, the server will generate an admin password on first run and store only a password hash in `data/admin-config.json`.
- If `NFTOKEN_API_KEY` was ever committed or shared, rotate it with the provider before using the app again.

## Run locally

```bash
npm install
npm start
```

Then open:

```text
http://localhost:4173/
```

## Auth model

- Portfolio login is handled by `POST /api/auth/login`
- Portfolio sessions use an HTTP-only cookie managed by `server.js`
- Admin login is handled by `POST /api/admin/login`
- Admin sessions also use an HTTP-only cookie managed by `server.js`
- `home.html` is server-protected and redirects to `/login.html` if no portfolio session exists

The frontend no longer contains hardcoded portfolio credentials or admin password storage.

## Routes

### Pages

- `GET /` -> serves the login page
- `GET /login.html` -> portfolio login page
- `GET /home.html` -> protected portfolio page
- `GET /admin.html` -> admin UI with server-backed session checks

### Portfolio auth API

- `GET /api/auth/session`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Guestbook API

- `GET /api/guestbook`
- `POST /api/guestbook`

### License and NFToken API

- `POST /api/license/validate`
- `POST /api/license/release`
- `POST /api/nftoken`

### Admin API

- `GET /api/admin/session`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/licenses`
- `POST /api/admin/licenses`
- `PATCH /api/admin/licenses/:id`
- `DELETE /api/admin/licenses/:id`

## Data files

- `data/guestbook.json`: guestbook entries
- `data/licenses.json`: license key records
- `data/app-config.json`: generated portfolio auth hash when env credentials are not set
- `data/admin-config.json`: generated admin auth hash when `ADMIN_PASSWORD` is not set

The server now serializes file writes per JSON file and resets corrupted guestbook/license files into safe defaults after saving a `.corrupt-*` backup.

## Utilities

- `npm run reset:admin` -> deletes `data/admin-config.json` so the next server start can create a new admin password
