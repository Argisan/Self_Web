# Argi Studio Website

Portfolio website built with plain HTML, CSS, JavaScript, and a small Node server for the shared guestbook.

## Structure

- `index.html`: login page
- `home.html`: portfolio page
- `assets/css/base.css`: shared design tokens and base styles
- `assets/css/login.css`: login page styles
- `assets/css/home.css`: portfolio page styles
- `assets/js/login.js`: login and session logic
- `assets/js/home.js`: portfolio interactions (nav, guestbook, snake, animated feather background)
- `assets/images/`: local image assets
- `assets/audio/`: local audio assets
- `data/guestbook.json`: shared guestbook storage
- `server.js`: local static server and guestbook API
- `package.json`: start script for the local server
- `.vscode/launch.json`: VS Code browser launch config

## Demo Login

- Username: `argi`
- Password: `password`

## Run Locally

1. Start the local server:
   `node server.js`
2. Open:
   `http://localhost:4173`

## Notes

- The guestbook tries the `/api/guestbook` backend first. When the server is not running (e.g. on static hosting), it falls back to localStorage so visitors can still post and read messages on their device.
- Authentication is still client-side only and intended for demo use.
- The home page includes a live feather-style animated background tuned for a black, radiant purple, and silver theme.
