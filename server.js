const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const GUESTBOOK_FILE = path.join(DATA_DIR, "guestbook.json");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
};

const DEFAULT_GUESTBOOK = [
  { name: "Mika", message: "The purple theme looks clean and stylish." },
  { name: "Jae", message: "The interactive cards make this feel more alive." },
];

async function ensureGuestbookFile() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(GUESTBOOK_FILE, fs.constants.F_OK);
  } catch {
    await fsp.writeFile(GUESTBOOK_FILE, JSON.stringify(DEFAULT_GUESTBOOK, null, 2));
  }
}

async function readGuestbook() {
  await ensureGuestbookFile();
  const raw = await fsp.readFile(GUESTBOOK_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : DEFAULT_GUESTBOOK;
}

async function writeGuestbook(entries) {
  await ensureGuestbookFile();
  await fsp.writeFile(GUESTBOOK_FILE, JSON.stringify(entries.slice(0, 20), null, 2));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function handleGuestbook(request, response) {
  if (request.method === "GET") {
    const entries = await readGuestbook();
    sendJson(response, 200, entries);
    return;
  }

  if (request.method === "POST") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000) request.destroy();
    });

    request.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const name = String(payload.name || "").trim().slice(0, 24);
        const message = String(payload.message || "").trim().slice(0, 90);

        if (!name || !message) {
          sendJson(response, 400, { error: "Name and message are required." });
          return;
        }

        const entries = await readGuestbook();
        entries.unshift({ name, message });
        await writeGuestbook(entries);
        sendJson(response, 201, entries.slice(0, 20));
      } catch {
        sendJson(response, 400, { error: "Invalid guestbook payload." });
      }
    });

    return;
  }

  response.writeHead(405, { Allow: "GET, POST" });
  response.end("Method Not Allowed");
}

async function serveStatic(requestPath, response) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    const finalPath = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const ext = path.extname(finalPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = await fsp.readFile(finalPath);
    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);

  try {
    if (url.pathname === "/api/guestbook") {
      await handleGuestbook(request, response);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, { error: "Server error", detail: error.message });
  }
});

ensureGuestbookFile()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Argi Studio running at http://localhost:${PORT}`);
      console.log(`Argi Studio running at http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize guestbook storage:", error);
    process.exit(1);
  });
