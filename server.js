const http = require("http");
const https = require("https");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
loadEnvFile(path.join(ROOT, ".env"));

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 4173);
const DATA_DIR = path.join(ROOT, "data");
const GUESTBOOK_FILE = path.join(DATA_DIR, "guestbook.json");
const LICENSES_FILE = path.join(DATA_DIR, "licenses.json");
const APP_CONFIG_FILE = path.join(DATA_DIR, "app-config.json");
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, "admin-config.json");

const PORTFOLIO_COOKIE_NAME = "argi_portfolio_session";
const ADMIN_COOKIE_NAME = "argi_admin_session";
const LICENSE_SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const PORTFOLIO_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PORTFOLIO_REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const NFTOKEN_API_URL = process.env.NFTOKEN_API_URL || "https://nftoken.site/v1/api.php";
const NFTOKEN_API_KEY = process.env.NFTOKEN_API_KEY || "";
const MAX_NFTOKEN_REQUEST_BODY_SIZE = 50_000;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const DEFAULT_GUESTBOOK = [
  { name: "Mika", message: "The purple theme looks clean and stylish." },
  { name: "Jae", message: "The interactive cards make this feel more alive." }
];
const MAX_GUESTBOOK_ENTRIES = 20;
const GUESTBOOK_WINDOW_MS = 60_000;
const GUESTBOOK_MAX_POSTS_PER_WINDOW = 8;
const BLOCKED_TERMS = ["http://", "https://", "www.", "discord.gg", "<script", "</script>"];

const pageFiles = new Map([
  ["/index.html", path.join(ROOT, "index.html")],
  ["/login.html", path.join(ROOT, "login.html")],
  ["/home.html", path.join(ROOT, "home.html")],
  ["/admin.html", path.join(ROOT, "admin.html")],
  ["/argi.jpg", path.join(ROOT, "argi.jpg")],
  ["/CNAME", path.join(ROOT, "CNAME")],
  ["/argi-nfcc.html", path.join(ROOT, "argi-nfcc.html")],
]);

const fileWriteQueue = new Map();
const guestbookRateLimits = new Map();
const portfolioSessions = new Map();
const adminSessions = new Map();

let portfolioAuth = null;
let adminAuth = null;

function loadEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (!match) continue;

      const key = match[1];
      let value = match[2] || "";

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not read .env file: ${error.message}`);
    }
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function createGeneratedPassword() {
  return crypto.randomBytes(12).toString("hex");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function buildPasswordRecord(password) {
  const passwordSalt = crypto.randomBytes(16).toString("hex");
  return {
    passwordSalt,
    passwordHash: hashPassword(password, passwordSalt)
  };
}

function secureCompareText(left, right) {
  const leftBuffer = Buffer.from(String(left), "utf8");
  const rightBuffer = Buffer.from(String(right), "utf8");

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function secureCompareHex(left, right) {
  try {
    const leftBuffer = Buffer.from(String(left), "hex");
    const rightBuffer = Buffer.from(String(right), "hex");
    if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

function verifyStoredPassword(password, record) {
  if (!record || typeof record.passwordHash !== "string") {
    return false;
  }

  if (typeof record.passwordSalt === "string" && record.passwordSalt) {
    return secureCompareHex(hashPassword(password, record.passwordSalt), record.passwordHash);
  }

  return secureCompareHex(sha256Hex(password), record.passwordHash);
}

async function queueJsonWrite(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });

  const runWrite = async () => {
    const serialized = JSON.stringify(value, null, 2);
    const tempPath = `${filePath}.${process.pid}.tmp`;
    await fsp.writeFile(tempPath, serialized, "utf8");
    await fsp.rename(tempPath, filePath);
  };

  const previousWrite = fileWriteQueue.get(filePath) || Promise.resolve();
  const nextWrite = previousWrite.catch(() => {}).then(runWrite);
  fileWriteQueue.set(filePath, nextWrite);

  try {
    await nextWrite;
  } finally {
    if (fileWriteQueue.get(filePath) === nextWrite) {
      fileWriteQueue.delete(filePath);
    }
  }
}

async function backupCorruptFile(filePath, raw) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(path.dirname(filePath), `${path.basename(filePath)}.corrupt-${stamp}`);
  await fsp.writeFile(backupPath, raw, "utf8");
}

async function readJsonArrayFile(filePath, fallbackValue) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });

  try {
    const raw = await fsp.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("Expected an array.");
    }

    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      const fallback = cloneJson(fallbackValue);
      await queueJsonWrite(filePath, fallback);
      return fallback;
    }

    try {
      const raw = await fsp.readFile(filePath, "utf8").catch(() => "");
      if (raw) {
        await backupCorruptFile(filePath, raw);
      }
    } catch {
      // Ignore backup errors and continue with a reset.
    }

    const fallback = cloneJson(fallbackValue);
    await queueJsonWrite(filePath, fallback);
    console.warn(`${path.basename(filePath)} was corrupted and has been reset.`);
    return fallback;
  }
}

async function readOptionalJsonObject(filePath, validator) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return validator(parsed) ? parsed : null;
  } catch (error) {
    if (error.code === "ENOENT") return null;

    const raw = await fsp.readFile(filePath, "utf8").catch(() => "");
    if (raw) {
      await backupCorruptFile(filePath, raw).catch(() => {});
    }
    return null;
  }
}

async function readGuestbook() {
  return readJsonArrayFile(GUESTBOOK_FILE, DEFAULT_GUESTBOOK);
}

async function writeGuestbook(entries) {
  await queueJsonWrite(GUESTBOOK_FILE, entries.slice(0, MAX_GUESTBOOK_ENTRIES));
}

async function readLicenses() {
  return readJsonArrayFile(LICENSES_FILE, []);
}

async function writeLicenses(licenses) {
  await queueJsonWrite(LICENSES_FILE, licenses);
}
async function ensurePortfolioAuth() {
  const envUsername = String(process.env.APP_USERNAME || "").trim();
  const envPassword = String(process.env.APP_PASSWORD || "");

  if (envUsername && envPassword) {
    return {
      username: envUsername,
      verify(username, password) {
        return secureCompareText(username, envUsername) && secureCompareText(password, envPassword);
      }
    };
  }

  const stored = await readOptionalJsonObject(
    APP_CONFIG_FILE,
    (value) =>
      value &&
      typeof value === "object" &&
      typeof value.username === "string" &&
      typeof value.passwordHash === "string"
  );

  if (stored) {
    return {
      username: stored.username,
      verify(username, password) {
        return secureCompareText(username, stored.username) && verifyStoredPassword(password, stored);
      }
    };
  }

  const username = envUsername || "portfolio";
  const password = createGeneratedPassword();
  const config = {
    username,
    createdAt: nowIso(),
    ...buildPasswordRecord(password)
  };

  await queueJsonWrite(APP_CONFIG_FILE, config);
  console.log("Generated portfolio credentials for first-time setup:");
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password}`);
  console.log("  Save these now. Only the password hash is stored in data/app-config.json.");

  return {
    username,
    verify(inputUsername, inputPassword) {
      return secureCompareText(inputUsername, username) && verifyStoredPassword(inputPassword, config);
    }
  };
}

async function ensureAdminAuth() {
  const envPassword = String(process.env.ADMIN_PASSWORD || "");

  if (envPassword) {
    return {
      verify(password) {
        return secureCompareText(password, envPassword);
      }
    };
  }

  const stored = await readOptionalJsonObject(
    ADMIN_CONFIG_FILE,
    (value) =>
      value &&
      typeof value === "object" &&
      typeof value.passwordHash === "string"
  );

  if (stored) {
    return {
      verify(password) {
        return verifyStoredPassword(password, stored);
      }
    };
  }

  const password = createGeneratedPassword();
  const config = {
    createdAt: nowIso(),
    ...buildPasswordRecord(password)
  };

  await queueJsonWrite(ADMIN_CONFIG_FILE, config);
  console.log("Generated admin password for first-time setup:");
  console.log(`  Password: ${password}`);
  console.log("  Save this now. Only the password hash is stored in data/admin-config.json.");

  return {
    verify(inputPassword) {
      return verifyStoredPassword(inputPassword, config);
    }
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

function sendRedirect(response, location) {
  response.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store"
  });
  response.end();
}

function appendSetCookie(response, cookieValue) {
  const current = response.getHeader("Set-Cookie");

  if (!current) {
    response.setHeader("Set-Cookie", cookieValue);
    return;
  }

  if (Array.isArray(current)) {
    response.setHeader("Set-Cookie", [...current, cookieValue]);
    return;
  }

  response.setHeader("Set-Cookie", [current, cookieValue]);
}

function buildCookie(request, name, value, maxAgeMs) {
  const isSecure =
    Boolean(request.socket.encrypted) ||
    String(request.headers["x-forwarded-proto"] || "").toLowerCase() === "https";

  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax"
  ];

  if (typeof maxAgeMs === "number") {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeMs / 1000))}`);
  }

  if (isSecure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function clearCookie(response, request, name) {
  appendSetCookie(
    response,
    `${buildCookie(request, name, "", 0)}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
}

function parseCookies(request) {
  const header = request.headers.cookie || "";
  const cookies = {};

  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.split("=");
    const key = rawKey ? rawKey.trim() : "";
    if (!key) continue;
    cookies[key] = decodeURIComponent(rawValue.join("=").trim());
  }

  return cookies;
}

function getSession(store, request, cookieName) {
  const cookies = parseCookies(request);
  const sessionId = cookies[cookieName];
  if (!sessionId) return null;

  const session = store.get(sessionId);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    store.delete(sessionId);
    return null;
  }

  return { id: sessionId, ...session };
}

function destroySession(store, request, cookieName) {
  const cookies = parseCookies(request);
  const sessionId = cookies[cookieName];
  if (sessionId) {
    store.delete(sessionId);
  }
}

function createSession(store, payload, ttlMs) {
  const sessionId = crypto.randomBytes(24).toString("hex");
  store.set(sessionId, {
    ...payload,
    expiresAt: Date.now() + ttlMs
  });
  return sessionId;
}

function getClientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return request.socket.remoteAddress || "unknown";
}

function isGuestbookRateLimited(request) {
  const ip = getClientIp(request);
  const currentTime = Date.now();
  const state = guestbookRateLimits.get(ip);

  if (!state || currentTime > state.resetAt) {
    guestbookRateLimits.set(ip, {
      count: 1,
      resetAt: currentTime + GUESTBOOK_WINDOW_MS
    });
    return false;
  }

  if (state.count >= GUESTBOOK_MAX_POSTS_PER_WINDOW) {
    return true;
  }

  state.count += 1;
  return false;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasBlockedTerm(value) {
  const normalized = String(value || "").toLowerCase();
  return BLOCKED_TERMS.some((term) => normalized.includes(term));
}

function isValidName(value) {
  return /^[a-zA-Z0-9 .,'-]{2,24}$/.test(value);
}

function readBody(request, maxBytes = 10_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    let settled = false;

    request.on("data", (chunk) => {
      if (settled) return;

      body += chunk;
      if (Buffer.byteLength(body, "utf8") > maxBytes) {
        settled = true;
        const error = new Error("Payload too large.");
        error.statusCode = 413;
        reject(error);
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!settled) {
        resolve(body);
      }
    });

    request.on("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
  });
}

async function readJsonBody(request, maxBytes = 10_000) {
  const body = await readBody(request, maxBytes);

  try {
    return JSON.parse(body || "{}");
  } catch {
    const error = new Error("Invalid request body.");
    error.statusCode = 400;
    throw error;
  }
}

function generateId() {
  return crypto.randomBytes(16).toString("hex");
}

function generateLicenseKey() {
  return `LK-${crypto.randomBytes(16).toString("hex")}`;
}
function expireOldLicenseSessions(licenses) {
  const currentTime = Date.now();
  let changed = false;

  const nextLicenses = licenses.map((license) => {
    if (!license.activeSession) {
      return license;
    }

    const startedAt = Date.parse(license.activeSession.startedAt || "");
    if (!Number.isFinite(startedAt) || currentTime - startedAt > LICENSE_SESSION_TIMEOUT_MS) {
      changed = true;
      return { ...license, activeSession: null };
    }

    return license;
  });

  return { licenses: nextLicenses, changed };
}

async function loadFreshLicenses() {
  let licenses = await readLicenses();
  const result = expireOldLicenseSessions(licenses);

  if (result.changed) {
    licenses = result.licenses;
    await writeLicenses(licenses);
  }

  return licenses;
}

function validateLicenseEntry(license) {
  if (!license) {
    return { valid: false, statusCode: 403, message: "Invalid license key." };
  }

  if (!license.enabled) {
    return { valid: false, statusCode: 403, message: "License key is disabled." };
  }

  if (license.expiresAt && Date.parse(license.expiresAt) < Date.now()) {
    return { valid: false, statusCode: 403, message: "License key has expired." };
  }

  if (license.activeSession) {
    return {
      valid: false,
      statusCode: 409,
      message: "This license key is already in use. Try again shortly."
    };
  }

  return { valid: true };
}

async function claimLicenseSession(licenseKey, request) {
  const licenses = await loadFreshLicenses();
  const license = licenses.find((entry) => entry.key === licenseKey);
  const validation = validateLicenseEntry(license);

  if (!validation.valid) {
    const error = new Error(validation.message);
    error.statusCode = validation.statusCode;
    throw error;
  }

  const sessionId = generateId();
  license.activeSession = {
    id: sessionId,
    startedAt: nowIso(),
    userAgent: String(request.headers["user-agent"] || "").slice(0, 200)
  };

  await writeLicenses(licenses);
  return { sessionId };
}

async function releaseLicenseSession(licenseKey, sessionId) {
  if (!licenseKey || !sessionId) return;

  const licenses = await readLicenses();
  const license = licenses.find((entry) => entry.key === licenseKey);

  if (license && license.activeSession && license.activeSession.id === sessionId) {
    license.activeSession = null;
    await writeLicenses(licenses);
  }
}

async function handlePortfolioAuth(request, response, pathname) {
  if (pathname === "/api/auth/session") {
    if (request.method !== "GET") {
      response.writeHead(405, { Allow: "GET" });
      response.end("Method Not Allowed");
      return;
    }

    const session = getSession(portfolioSessions, request, PORTFOLIO_COOKIE_NAME);
    sendJson(response, 200, {
      authenticated: Boolean(session),
      username: session ? session.username : null
    });
    return;
  }

  if (pathname === "/api/auth/login") {
    if (request.method !== "POST") {
      response.writeHead(405, { Allow: "POST" });
      response.end("Method Not Allowed");
      return;
    }

    let payload;
    try {
      payload = await readJsonBody(request);
    } catch (error) {
      sendJson(response, error.statusCode || 400, { error: error.message });
      return;
    }

    const username = normalizeText(payload.username).slice(0, 64);
    const password = String(payload.password || "");
    const rememberMe = Boolean(payload.rememberMe);

    if (!portfolioAuth.verify(username, password)) {
      sendJson(response, 401, { error: "Invalid username or password." });
      return;
    }

    destroySession(portfolioSessions, request, PORTFOLIO_COOKIE_NAME);
    const ttlMs = rememberMe ? PORTFOLIO_REMEMBER_TTL_MS : PORTFOLIO_SESSION_TTL_MS;
    const sessionId = createSession(
      portfolioSessions,
      {
        username: portfolioAuth.username
      },
      ttlMs
    );

    appendSetCookie(response, buildCookie(request, PORTFOLIO_COOKIE_NAME, sessionId, ttlMs));
    sendJson(response, 200, {
      ok: true,
      username: portfolioAuth.username
    });
    return;
  }

  if (pathname === "/api/auth/logout") {
    if (request.method !== "POST") {
      response.writeHead(405, { Allow: "POST" });
      response.end("Method Not Allowed");
      return;
    }

    destroySession(portfolioSessions, request, PORTFOLIO_COOKIE_NAME);
    clearCookie(response, request, PORTFOLIO_COOKIE_NAME);
    sendJson(response, 200, { ok: true });
  }
}

async function handleGuestbook(request, response) {
  if (request.method === "GET") {
    const entries = await readGuestbook();
    sendJson(response, 200, entries);
    return;
  }

  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "GET, POST" });
    response.end("Method Not Allowed");
    return;
  }

  if (isGuestbookRateLimited(request)) {
    sendJson(response, 429, {
      error: "Too many submissions. Please wait before posting again."
    });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: error.message });
    return;
  }

  const name = normalizeText(payload.name).slice(0, 24);
  const message = normalizeText(payload.message).slice(0, 90);

  if (!name || !message || !isValidName(name)) {
    sendJson(response, 400, { error: "Please enter a valid name and message." });
    return;
  }

  if (message.length < 3) {
    sendJson(response, 400, { error: "Message is too short." });
    return;
  }

  if (hasBlockedTerm(name) || hasBlockedTerm(message)) {
    sendJson(response, 400, {
      error: "Links or blocked terms are not allowed in the guestbook."
    });
    return;
  }

  const entries = await readGuestbook();
  entries.unshift({ name, message });
  await writeGuestbook(entries);
  sendJson(response, 201, entries.slice(0, MAX_GUESTBOOK_ENTRIES));
}

async function handleLicenseValidate(request, response) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    response.end("Method Not Allowed");
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: error.message });
    return;
  }

  const licenseKey = String(payload.licenseKey || "").trim();
  if (!licenseKey) {
    sendJson(response, 400, { error: "licenseKey is required." });
    return;
  }

  try {
    const { sessionId } = await claimLicenseSession(licenseKey, request);
    sendJson(response, 200, { ok: true, sessionId });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message });
  }
}

async function handleLicenseRelease(request, response) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    response.end("Method Not Allowed");
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: error.message });
    return;
  }

  const licenseKey = String(payload.licenseKey || "").trim();
  const sessionId = String(payload.sessionId || "").trim();

  if (!licenseKey || !sessionId) {
    sendJson(response, 400, { error: "licenseKey and sessionId are required." });
    return;
  }

  await releaseLicenseSession(licenseKey, sessionId);
  sendJson(response, 200, { ok: true });
}
function httpsPostJson(url, payload) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify(payload);
    const target = new URL(url);

    const req = https.request(
      {
        hostname: target.hostname,
        path: target.pathname + target.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
          "User-Agent": "ArgiStudio/1.0"
        },
        timeout: 20_000
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 502,
            body
          });
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });
    req.write(requestBody);
    req.end();
  });
}

async function handleNFToken(request, response) {
  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "POST" });
    response.end("Method Not Allowed");
    return;
  }

  if (!NFTOKEN_API_KEY) {
    sendJson(response, 503, {
      error: "NFTOKEN_API_KEY is not configured on the server."
    });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request, MAX_NFTOKEN_REQUEST_BODY_SIZE);
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: error.message });
    return;
  }

  let managedLicenseSession = null;
  if (payload.licenseKey) {
    try {
      const licenseKey = String(payload.licenseKey).trim();
      const { sessionId } = await claimLicenseSession(licenseKey, request);
      managedLicenseSession = { licenseKey, sessionId };
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message });
      return;
    }
  }

  let cookieHeader = "";
  if (typeof payload.cookie === "string" && payload.cookie.trim()) {
    cookieHeader = payload.cookie.trim();
  } else {
    const netflixId = String(payload.netflixId || "").trim();
    const secureNetflixId = String(payload.secureNetflixId || "").trim();
    const nfvdid = String(payload.nfvdid || "").trim();

    if (!netflixId || !secureNetflixId) {
      if (managedLicenseSession) {
        await releaseLicenseSession(managedLicenseSession.licenseKey, managedLicenseSession.sessionId);
      }
      sendJson(response, 400, {
        error: "netflixId and secureNetflixId are required."
      });
      return;
    }

    cookieHeader = `NetflixId=${netflixId}; SecureNetflixId=${secureNetflixId}`;
    if (nfvdid) {
      cookieHeader += `; nfvdid=${nfvdid}`;
    }
  }

  try {
    const upstream = await httpsPostJson(NFTOKEN_API_URL, {
      key: NFTOKEN_API_KEY,
      cookie: cookieHeader
    });

    let upstreamPayload;
    try {
      upstreamPayload = JSON.parse(upstream.body);
    } catch {
      upstreamPayload = { raw: upstream.body };
    }

    response.writeHead(upstream.statusCode, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(JSON.stringify(upstreamPayload));
  } catch (error) {
    sendJson(response, 502, {
      error: "Could not reach the NFToken provider.",
      detail: error.message
    });
  } finally {
    if (managedLicenseSession) {
      await releaseLicenseSession(managedLicenseSession.licenseKey, managedLicenseSession.sessionId);
    }
  }
}

function requireAdminSession(request, response) {
  const session = getSession(adminSessions, request, ADMIN_COOKIE_NAME);
  if (!session) {
    sendJson(response, 401, { error: "Unauthorized." });
    return null;
  }

  return session;
}

async function handleAdmin(request, response, pathname) {
  if (pathname === "/api/admin/session") {
    if (request.method !== "GET") {
      response.writeHead(405, { Allow: "GET" });
      response.end("Method Not Allowed");
      return;
    }

    const session = getSession(adminSessions, request, ADMIN_COOKIE_NAME);
    sendJson(response, 200, { authenticated: Boolean(session) });
    return;
  }

  if (pathname === "/api/admin/login") {
    if (request.method !== "POST") {
      response.writeHead(405, { Allow: "POST" });
      response.end("Method Not Allowed");
      return;
    }

    let payload;
    try {
      payload = await readJsonBody(request);
    } catch (error) {
      sendJson(response, error.statusCode || 400, { error: error.message });
      return;
    }

    const password = String(payload.password || "");
    if (!adminAuth.verify(password)) {
      sendJson(response, 401, { error: "Invalid admin password." });
      return;
    }

    destroySession(adminSessions, request, ADMIN_COOKIE_NAME);
    const sessionId = createSession(adminSessions, { role: "admin" }, ADMIN_SESSION_TTL_MS);

    appendSetCookie(response, buildCookie(request, ADMIN_COOKIE_NAME, sessionId, ADMIN_SESSION_TTL_MS));
    sendJson(response, 200, { ok: true });
    return;
  }

  if (pathname === "/api/admin/logout") {
    if (request.method !== "POST") {
      response.writeHead(405, { Allow: "POST" });
      response.end("Method Not Allowed");
      return;
    }

    destroySession(adminSessions, request, ADMIN_COOKIE_NAME);
    clearCookie(response, request, ADMIN_COOKIE_NAME);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (!requireAdminSession(request, response)) {
    return;
  }

  if (pathname === "/api/admin/licenses" && request.method === "GET") {
    const licenses = await loadFreshLicenses();
    sendJson(response, 200, licenses);
    return;
  }

  if (pathname === "/api/admin/licenses" && request.method === "POST") {
    let payload;
    try {
      payload = await readJsonBody(request);
    } catch (error) {
      sendJson(response, error.statusCode || 400, { error: error.message });
      return;
    }

    const label = String(payload.label || "").trim().slice(0, 80);
    const expiresAt = payload.expiresAt ? String(payload.expiresAt) : null;

    if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
      sendJson(response, 400, { error: "Invalid expiresAt date." });
      return;
    }

    const newLicense = {
      id: generateId(),
      key: generateLicenseKey(),
      label,
      createdAt: nowIso(),
      expiresAt: expiresAt || null,
      enabled: true,
      activeSession: null
    };

    const licenses = await readLicenses();
    licenses.push(newLicense);
    await writeLicenses(licenses);
    sendJson(response, 201, newLicense);
    return;
  }

  const licenseMatch = pathname.match(/^\/api\/admin\/licenses\/([a-f0-9]+)$/);
  if (licenseMatch && request.method === "PATCH") {
    let payload;
    try {
      payload = await readJsonBody(request);
    } catch (error) {
      sendJson(response, error.statusCode || 400, { error: error.message });
      return;
    }

    const licenses = await readLicenses();
    const license = licenses.find((entry) => entry.id === licenseMatch[1]);

    if (!license) {
      sendJson(response, 404, { error: "License key not found." });
      return;
    }

    if (typeof payload.enabled === "boolean") {
      license.enabled = payload.enabled;
      if (!payload.enabled) {
        license.activeSession = null;
      }
    }

    if (typeof payload.label === "string") {
      license.label = payload.label.trim().slice(0, 80);
    }

    if ("expiresAt" in payload) {
      const nextExpiresAt = payload.expiresAt ? String(payload.expiresAt) : null;
      if (nextExpiresAt && Number.isNaN(Date.parse(nextExpiresAt))) {
        sendJson(response, 400, { error: "Invalid expiresAt date." });
        return;
      }
      license.expiresAt = nextExpiresAt;
    }

    await writeLicenses(licenses);
    sendJson(response, 200, license);
    return;
  }

  if (licenseMatch && request.method === "DELETE") {
    let licenses = await readLicenses();
    const initialCount = licenses.length;
    licenses = licenses.filter((entry) => entry.id !== licenseMatch[1]);

    if (licenses.length === initialCount) {
      sendJson(response, 404, { error: "License key not found." });
      return;
    }

    await writeLicenses(licenses);
    sendJson(response, 200, { ok: true });
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "Not found." }));
}
async function serveFile(filePath, request, response) {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  try {
    const content = await fsp.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || "application/octet-stream";
    const isHtml = contentType.includes("text/html");

    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": isHtml ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    response.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    throw error;
  }
}

async function serveAssets(request, response, pathname) {
  if (!pathname.startsWith("/assets/")) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  const normalized = path.normalize(pathname).replace(/^[/\\]+/, "");
  const filePath = path.join(ROOT, normalized);
  const assetsRoot = path.join(ROOT, "assets") + path.sep;

  if (!filePath.startsWith(assetsRoot)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  await serveFile(filePath, request, response);
}

const server = http.createServer(async (request, response) => {
  const originHost = request.headers.host || `localhost:${PORT}`;
  const url = new URL(request.url, `http://${originHost}`);

  try {
    if (url.pathname === "/") {
      await serveFile(path.join(ROOT, "login.html"), request, response);
      return;
    }

    if (url.pathname.startsWith("/api/auth/")) {
      await handlePortfolioAuth(request, response, url.pathname);
      return;
    }

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

    if (url.pathname === "/home.html") {
      const session = getSession(portfolioSessions, request, PORTFOLIO_COOKIE_NAME);
      if (!session) {
        sendRedirect(response, "/login.html");
        return;
      }
    }

    if (pageFiles.has(url.pathname)) {
      await serveFile(pageFiles.get(url.pathname), request, response);
      return;
    }

    if (url.pathname.startsWith("/assets/")) {
      await serveAssets(request, response, url.pathname);
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
  } catch (error) {
    console.error("Server error:", error);
    if (!response.headersSent) {
      sendJson(response, 500, {
        error: "Server error",
        detail: error.message
      });
    } else {
      response.end();
    }
  }
});

async function initialize() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await readGuestbook();
  await readLicenses();
  portfolioAuth = await ensurePortfolioAuth();
  adminAuth = await ensureAdminAuth();

  if (!NFTOKEN_API_KEY) {
    console.warn("Warning: NFTOKEN_API_KEY is not set. NFToken generation will stay disabled.");
  }

  server.listen(PORT, HOST, () => {
    console.log(`Argi Studio running at http://localhost:${PORT}`);
    console.log(`Argi Studio running at http://127.0.0.1:${PORT}`);
  });
}

initialize().catch((error) => {
  console.error("Failed to initialize storage:", error);
  process.exit(1);
});
