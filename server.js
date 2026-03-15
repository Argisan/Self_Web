const http = require("http");
const https = require("https");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const GUESTBOOK_FILE = path.join(DATA_DIR, "guestbook.json");
const LICENSES_FILE = path.join(DATA_DIR, "licenses.json");
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, "admin-config.json");

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const NFTOKEN_API_URL = "https://nftoken.site/v1/api.php";
// Set NFTOKEN_API_KEY env var in production to keep the key out of source code.
const NFTOKEN_API_KEY = process.env.NFTOKEN_API_KEY || "NFT_017907d1b1db8a6256c9b33a";
const MAX_NFTOKEN_REQUEST_BODY_SIZE = 50_000; // 50 KB

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

// ─── License key storage ─────────────────────────────────────────────────────

async function readLicenses() {
  try {
    const raw = await fsp.readFile(LICENSES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLicenses(keys) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(LICENSES_FILE, JSON.stringify(keys, null, 2));
}

async function readAdminConfig() {
  try {
    const raw = await fsp.readFile(ADMIN_CONFIG_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function ensureAdminConfig() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(ADMIN_CONFIG_FILE, fs.constants.F_OK);
  } catch {
    const defaultPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString("hex");
    const passwordHash = crypto.createHash("sha256").update(defaultPassword).digest("hex");
    await fsp.writeFile(ADMIN_CONFIG_FILE, JSON.stringify({ passwordHash }, null, 2));
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`\n🔑 Admin panel password (first-time setup): ${defaultPassword}`);
      console.log("   Store this safely — it will not be shown again.\n");
    }
  }
}

function generateLicenseKey() {
  return `LK-${crypto.randomBytes(16).toString("hex")}`;
}

function generateId() {
  return crypto.randomBytes(16).toString("hex");
}

function isAdminAuthorized(request, adminConfig) {
  const auth = request.headers["authorization"] || "";
  if (!auth.startsWith("Bearer ")) return false;
  const provided = auth.slice(7).trim();
  const hash = crypto.createHash("sha256").update(provided).digest("hex");
  try {
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(adminConfig.passwordHash, "hex");
    if (a.length !== 32 || b.length !== 32) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function expireOldSessions(keys) {
  const now = Date.now();
  return keys.map((k) => {
    if (k.activeSession && now - new Date(k.activeSession.startedAt).getTime() > SESSION_TIMEOUT_MS) {
      return { ...k, activeSession: null };
    }
    return k;
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── License validation API ────────────────────────────────────────────────

function readBody(request, maxBytes = 10_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        request.destroy();
        reject(new Error("Payload too large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleLicenseValidate(request, response) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    response.end("Method Not Allowed");
    return;
  }

  let payload;
  try {
    const body = await readBody(request);
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(response, 400, { error: "Invalid request body." });
    return;
  }

  const licenseKey = String(payload.licenseKey || "").trim();
  if (!licenseKey) {
    sendJson(response, 400, { error: "licenseKey is required." });
    return;
  }

  let keys = await readLicenses();
  keys = expireOldSessions(keys);

  const keyEntry = keys.find((k) => k.key === licenseKey);
  if (!keyEntry) {
    sendJson(response, 403, { error: "Invalid license key." });
    return;
  }
  if (!keyEntry.enabled) {
    sendJson(response, 403, { error: "License key is disabled." });
    return;
  }
  if (keyEntry.expiresAt && new Date(keyEntry.expiresAt) < new Date()) {
    sendJson(response, 403, { error: "License key has expired." });
    return;
  }
  if (keyEntry.activeSession) {
    sendJson(response, 409, { error: "This license key is already in use. Try again shortly." });
    return;
  }

  const sessionId = generateId();
  keyEntry.activeSession = {
    id: sessionId,
    startedAt: new Date().toISOString(),
    userAgent: String(request.headers["user-agent"] || "").slice(0, 200),
  };

  await writeLicenses(keys);
  sendJson(response, 200, { ok: true, sessionId });
}

async function handleLicenseRelease(request, response) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    response.end("Method Not Allowed");
    return;
  }

  let payload;
  try {
    const body = await readBody(request);
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(response, 400, { error: "Invalid request body." });
    return;
  }

  const licenseKey = String(payload.licenseKey || "").trim();
  const sessionId = String(payload.sessionId || "").trim();

  if (!licenseKey || !sessionId) {
    sendJson(response, 400, { error: "licenseKey and sessionId are required." });
    return;
  }

  let keys = await readLicenses();
  const keyEntry = keys.find((k) => k.key === licenseKey);
  if (keyEntry && keyEntry.activeSession && keyEntry.activeSession.id === sessionId) {
    keyEntry.activeSession = null;
    await writeLicenses(keys);
  }

  sendJson(response, 200, { ok: true });
}

// ─── NFToken proxy ─────────────────────────────────────────────────────────

function httpsPost(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "ArgiStudio/1.0",
      },
      timeout: 20000,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.write(body);
    req.end();
  });
}

async function handleNFToken(request, response) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    response.end("Method Not Allowed");
    return;
  }

  let payload;
  try {
    const body = await readBody(request, MAX_NFTOKEN_REQUEST_BODY_SIZE);
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(response, 400, { error: "Invalid request body." });
    return;
  }

  // Build cookie string from individual values or use a raw cookie string
  let cookieStr = "";
  if (typeof payload.cookie === "string" && payload.cookie.trim()) {
    cookieStr = payload.cookie.trim();
  } else {
    const netflixId = String(payload.netflixId || "").trim();
    const secureNetflixId = String(payload.secureNetflixId || "").trim();
    const nfvdid = String(payload.nfvdid || "").trim();

    if (!netflixId || !secureNetflixId) {
      sendJson(response, 400, { error: "netflixId and secureNetflixId are required." });
      return;
    }

    cookieStr = `NetflixId=${netflixId}; SecureNetflixId=${secureNetflixId}`;
    if (nfvdid) cookieStr += `; nfvdid=${nfvdid}`;
  }

  try {
    const upstream = await httpsPost(NFTOKEN_API_URL, {
      key: NFTOKEN_API_KEY,
      cookie: cookieStr,
    });

    let upstreamData;
    try {
      upstreamData = JSON.parse(upstream.body);
    } catch {
      upstreamData = { raw: upstream.body };
    }

    response.writeHead(upstream.status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(upstreamData));
  } catch (error) {
    sendJson(response, 502, { error: "Could not reach nftoken.site.", detail: error.message });
  }
}

// ─── Admin API ─────────────────────────────────────────────────────────────

async function handleAdmin(request, response, pathname) {
  const adminConfig = await readAdminConfig();
  if (!adminConfig) {
    sendJson(response, 500, { error: "Admin configuration not found." });
    return;
  }

  // Admin login check
  if (pathname === "/api/admin/login") {
    if (request.method !== "POST") {
      response.writeHead(405, { Allow: "POST" });
      response.end("Method Not Allowed");
      return;
    }
    let payload;
    try {
      const body = await readBody(request);
      payload = JSON.parse(body || "{}");
    } catch {
      sendJson(response, 400, { error: "Invalid request body." });
      return;
    }
    const password = String(payload.password || "");
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    let valid = false;
    try {
      const a = Buffer.from(hash, "hex");
      const b = Buffer.from(adminConfig.passwordHash, "hex");
      if (a.length === 32 && b.length === 32) {
        valid = crypto.timingSafeEqual(a, b);
      }
    } catch {
      valid = false;
    }
    if (!valid) {
      sendJson(response, 401, { error: "Invalid admin password." });
      return;
    }
    sendJson(response, 200, { ok: true });
    return;
  }

  if (!isAdminAuthorized(request, adminConfig)) {
    sendJson(response, 401, { error: "Unauthorized." });
    return;
  }

  // GET /api/admin/licenses
  if (pathname === "/api/admin/licenses" && request.method === "GET") {
    let keys = await readLicenses();
    keys = expireOldSessions(keys);
    await writeLicenses(keys);
    sendJson(response, 200, keys);
    return;
  }

  // POST /api/admin/licenses — create new key
  if (pathname === "/api/admin/licenses" && request.method === "POST") {
    let payload;
    try {
      const body = await readBody(request);
      payload = JSON.parse(body || "{}");
    } catch {
      sendJson(response, 400, { error: "Invalid request body." });
      return;
    }

    const label = String(payload.label || "").trim().slice(0, 80);
    const expiresAt = payload.expiresAt ? String(payload.expiresAt) : null;
    if (expiresAt && isNaN(Date.parse(expiresAt))) {
      sendJson(response, 400, { error: "Invalid expiresAt date." });
      return;
    }

    const newKey = {
      id: generateId(),
      key: generateLicenseKey(),
      label,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      enabled: true,
      activeSession: null,
    };

    const keys = await readLicenses();
    keys.push(newKey);
    await writeLicenses(keys);
    sendJson(response, 201, newKey);
    return;
  }

  // PATCH /api/admin/licenses/:id — update (enable/disable, label, expiry)
  const patchMatch = pathname.match(/^\/api\/admin\/licenses\/([a-f0-9]+)$/);
  if (patchMatch && request.method === "PATCH") {
    const id = patchMatch[1];
    let payload;
    try {
      const body = await readBody(request);
      payload = JSON.parse(body || "{}");
    } catch {
      sendJson(response, 400, { error: "Invalid request body." });
      return;
    }

    const keys = await readLicenses();
    const keyEntry = keys.find((k) => k.id === id);
    if (!keyEntry) {
      sendJson(response, 404, { error: "License key not found." });
      return;
    }

    if (typeof payload.enabled === "boolean") keyEntry.enabled = payload.enabled;
    if (typeof payload.label === "string") keyEntry.label = payload.label.trim().slice(0, 80);
    if ("expiresAt" in payload) {
      const d = payload.expiresAt ? String(payload.expiresAt) : null;
      if (d && isNaN(Date.parse(d))) {
        sendJson(response, 400, { error: "Invalid expiresAt date." });
        return;
      }
      keyEntry.expiresAt = d;
    }

    await writeLicenses(keys);
    sendJson(response, 200, keyEntry);
    return;
  }

  // DELETE /api/admin/licenses/:id
  const deleteMatch = pathname.match(/^\/api\/admin\/licenses\/([a-f0-9]+)$/);
  if (deleteMatch && request.method === "DELETE") {
    const id = deleteMatch[1];
    let keys = await readLicenses();
    const before = keys.length;
    keys = keys.filter((k) => k.id !== id);
    if (keys.length === before) {
      sendJson(response, 404, { error: "License key not found." });
      return;
    }
    await writeLicenses(keys);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 404, { error: "Not found." });
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

    if (url.pathname === "/api/license/validate") {
      await handleLicenseValidate(request, response);
      return;
    }

    if (url.pathname === "/api/license/release") {
      await handleLicenseRelease(request, response);
      return;
    }

    if (url.pathname === "/api/nftoken") {
      await handleNFToken(request, response);
      return;
    }

    if (url.pathname.startsWith("/api/admin/")) {
      await handleAdmin(request, response, url.pathname);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, { error: "Server error", detail: error.message });
  }
});

ensureGuestbookFile()
  .then(() => ensureAdminConfig())
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Argi Studio running at http://localhost:${PORT}`);
      console.log(`Argi Studio running at http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize storage:", error);
    process.exit(1);
  });
