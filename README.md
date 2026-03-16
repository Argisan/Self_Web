# Argi Studio Website

Portfolio website built with plain HTML, CSS, JavaScript, and a small Node server for the shared guestbook.

## Structure

- `index.html`: redirect entry page to `login.html`
- `login.html`: login page
- `home.html`: portfolio page
- `assets/css/base.css`: shared design tokens and base styles
- `assets/css/login.css`: login page styles
- `assets/css/home.css`: portfolio styles (including mobile Snake controls)
- `assets/js/login.js`: login and session logic
- `assets/js/home.js`: portfolio interactions (nav, guestbook, snake, animated feather background)
- `assets/images/`: image assets
- `assets/audio/`: audio assets
- `data/guestbook.json`: guestbook storage
- `server.js`: static server and guestbook API
- `package.json`: start script for the local server

## Demo Login

- Username: `argi`
- Password: `password`

## Run Locally

1. Start the local server:
   `node server.js`
2. Open:
   `http://localhost:4173`

## Configure Social Links

Edit `SOCIAL_LINKS` in `assets/js/home.js`:

```js
const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/argisan23?igsh=aWRteG00MzRqdmNt",
  tiktok: "https://www.tiktok.com/@wkwkargi",
  facebook: "https://facebook.com/argi.sumaylo/",
};
```

## Guestbook API Notes

- Endpoint: `GET /api/guestbook` and `POST /api/guestbook`
- Entries are capped to the latest 20 records.
- POST requests are rate-limited per IP.
- Basic blocked-term filtering is enabled for spam and link drops.
