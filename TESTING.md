# Testing Guide

This project runs through `server.js`. Start the server first:

```bash
npm start
```

Base URL:

```text
http://localhost:4173
```

## Manual app flow

1. Open `/`
2. Sign in at `/login.html` with the portfolio credentials from `.env` or the generated first-run credentials
3. Confirm you are redirected to `/home.html`
4. Open `/admin.html`
5. Sign in with the admin password from `.env` or the generated first-run password
6. Create, disable, enable, and delete a license key from the admin panel

## Portfolio auth API

Check the current portfolio session:

```bash
curl -i http://localhost:4173/api/auth/session
```

Log in and save the cookie:

```bash
curl -i -c portfolio-cookie.txt ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"portfolio\",\"password\":\"replace-me\",\"rememberMe\":true}" ^
  http://localhost:4173/api/auth/login
```

Use that cookie to verify the session:

```bash
curl -i -b portfolio-cookie.txt http://localhost:4173/api/auth/session
```

Log out:

```bash
curl -i -b portfolio-cookie.txt -X POST http://localhost:4173/api/auth/logout
```

## Guestbook API

Fetch entries:

```bash
curl -i http://localhost:4173/api/guestbook
```

Post an entry:

```bash
curl -i ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"message\":\"Guestbook check\"}" ^
  http://localhost:4173/api/guestbook
```

## Admin API

Log in and save the admin cookie:

```bash
curl -i -c admin-cookie.txt ^
  -H "Content-Type: application/json" ^
  -d "{\"password\":\"replace-admin-password\"}" ^
  http://localhost:4173/api/admin/login
```

Check the admin session:

```bash
curl -i -b admin-cookie.txt http://localhost:4173/api/admin/session
```

Create a license:

```bash
curl -i -b admin-cookie.txt ^
  -H "Content-Type: application/json" ^
  -d "{\"label\":\"QA key\",\"expiresAt\":null}" ^
  http://localhost:4173/api/admin/licenses
```

List licenses:

```bash
curl -i -b admin-cookie.txt http://localhost:4173/api/admin/licenses
```

Update a license:

```bash
curl -i -b admin-cookie.txt ^
  -X PATCH ^
  -H "Content-Type: application/json" ^
  -d "{\"enabled\":false}" ^
  http://localhost:4173/api/admin/licenses/YOUR_LICENSE_ID
```

Delete a license:

```bash
curl -i -b admin-cookie.txt ^
  -X DELETE ^
  http://localhost:4173/api/admin/licenses/YOUR_LICENSE_ID
```

Log out of admin:

```bash
curl -i -b admin-cookie.txt -X POST http://localhost:4173/api/admin/logout
```

## License validation API

Validate a key:

```bash
curl -i ^
  -H "Content-Type: application/json" ^
  -d "{\"licenseKey\":\"YOUR_LICENSE_KEY\"}" ^
  http://localhost:4173/api/license/validate
```

Release a validated session:

```bash
curl -i ^
  -H "Content-Type: application/json" ^
  -d "{\"licenseKey\":\"YOUR_LICENSE_KEY\",\"sessionId\":\"YOUR_SESSION_ID\"}" ^
  http://localhost:4173/api/license/release
```

## NFToken proxy API

Send cookie parts through the server proxy:

```bash
curl -i ^
  -H "Content-Type: application/json" ^
  -d "{\"netflixId\":\"VALUE\",\"secureNetflixId\":\"VALUE\",\"nfvdid\":\"VALUE\"}" ^
  http://localhost:4173/api/nftoken
```

Or send a raw cookie string plus a license key in one request:

```bash
curl -i ^
  -H "Content-Type: application/json" ^
  -d "{\"cookie\":\"NetflixId=VALUE; SecureNetflixId=VALUE\",\"licenseKey\":\"YOUR_LICENSE_KEY\"}" ^
  http://localhost:4173/api/nftoken
```

## What to verify after the refactor

- `home.html` is not reachable without a valid portfolio session
- Admin actions return `401` when the admin cookie is missing or expired
- No frontend file contains hardcoded portfolio credentials
- `.env` is ignored by Git and `.env.example` contains placeholders only
- `accounts.html`, `assets/js/accounts.js`, and `index.php` are gone from the real app flow
