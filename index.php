<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Argi Studio | NFToken Checker</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-900: #060509;
      --bg-850: #0b0912;
      --bg-800: #12101d;
      --bg-700: #19162a;
      --surface: rgba(19,17,31,0.88);
      --surface-strong: rgba(24,21,38,0.96);
      --border: rgba(201,192,214,0.22);
      --text-strong: #f2f0f7;
      --text-muted: #c0bbcc;
      --silver: #cfd2dc;
      --purple: #b257ff;
      --purple-bright: #d18dff;
      --success: #85f1c6;
      --danger: #ff8ea5;
      --warning: #ffd57e;
      --radius-md: 14px;
      --radius-lg: 20px;
      --shadow-lg: 0 20px 50px rgba(0,0,0,0.45);
    }

    *{ box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      min-height: 100%;
      font-family: "Space Grotesk","Segoe UI",sans-serif;
      color: var(--text-strong);
      background:
        radial-gradient(circle at 10% -10%, rgba(178,87,255,0.28), transparent 40%),
        radial-gradient(circle at 90% 0%, rgba(178,87,255,0.18), transparent 35%),
        linear-gradient(160deg, var(--bg-900), var(--bg-850) 55%, #05040a);
    }

    h1, h2, h3, strong { font-family: "Sora","Space Grotesk",sans-serif; }

    a { color: var(--purple-bright); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ── Layout ──────────────────────────────────────────────── */
    .page-shell {
      max-width: 820px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }

    .page-header {
      text-align: center;
      margin-bottom: 36px;
    }
    .page-header .eyebrow {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--purple);
      margin-bottom: 8px;
    }
    .page-header h1 { font-size: clamp(1.6rem, 4vw, 2.2rem); }
    .page-header p { color: var(--text-muted); margin-top: 8px; font-size: 0.95rem; }

    /* ── Card ────────────────────────────────────────────────── */
    .card {
      background: var(--surface-strong);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 28px 28px 24px;
      margin-bottom: 24px;
      box-shadow: var(--shadow-lg);
    }
    .card h2 {
      font-size: 1rem;
      color: var(--silver);
      margin-bottom: 16px;
    }

    /* ── Fields ──────────────────────────────────────────────── */
    .field { margin-bottom: 14px; }
    .field label {
      display: block;
      font-size: 0.8rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .field input, .field textarea {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--text-strong);
      font-family: inherit;
      font-size: 0.92rem;
      padding: 10px 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .field input:focus, .field textarea:focus {
      border-color: var(--purple);
    }
    .field textarea {
      resize: vertical;
      min-height: 130px;
      font-family: "Courier New", monospace;
      font-size: 0.82rem;
      line-height: 1.5;
    }

    /* ── Buttons ─────────────────────────────────────────────── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 22px;
      border-radius: var(--radius-md);
      font-family: "Sora", sans-serif;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.2s, transform 0.15s;
    }
    .btn:active { transform: scale(0.97); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary {
      background: linear-gradient(135deg, var(--purple), var(--purple-deep, #6f2ca3));
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-ghost {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
    }
    .btn-ghost:hover:not(:disabled) { border-color: var(--purple); color: var(--text-strong); }

    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }

    /* ── Status bar ──────────────────────────────────────────── */
    .status-bar {
      padding: 10px 16px;
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.03);
      min-height: 40px;
      color: var(--text-muted);
    }
    .status-bar.is-error { border-color: var(--danger); color: var(--danger); }
    .status-bar.is-success { border-color: var(--success); color: var(--success); }
    .status-bar.is-info { border-color: var(--purple); color: var(--purple-bright); }

    /* ── Progress ────────────────────────────────────────────── */
    .progress-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .progress-track {
      flex: 1;
      height: 6px;
      background: rgba(255,255,255,0.08);
      border-radius: 99px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--purple), var(--purple-bright));
      border-radius: 99px;
      transition: width 0.3s;
      width: 0%;
    }

    /* ── Results list ────────────────────────────────────────── */
    .results-list { display: flex; flex-direction: column; gap: 14px; }

    .result-item {
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px 18px;
      animation: fadeSlide 0.3s ease both;
    }
    @keyframes fadeSlide {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .result-item.is-success { border-color: rgba(133,241,198,0.3); }
    .result-item.is-error   { border-color: rgba(255,142,165,0.25); }

    .result-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 9px;
      border-radius: 99px;
      margin-bottom: 10px;
    }
    .badge-success { background: rgba(133,241,198,0.15); color: var(--success); }
    .badge-error   { background: rgba(255,142,165,0.15); color: var(--danger); }

    .result-email {
      font-size: 1rem;
      font-family: "Sora", sans-serif;
      color: var(--purple-bright);
      margin-bottom: 10px;
    }

    .result-meta {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 6px 16px;
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .result-meta span strong { color: var(--text-strong); }
    .result-meta .tier-premium { color: var(--success); font-weight: 700; }
    .result-meta .tier-basic   { color: var(--silver); }

    .result-links {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .result-links a {
      flex: 1;
      min-width: 80px;
      text-align: center;
      padding: 7px 10px;
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 0.8rem;
      color: var(--text-muted);
      transition: border-color 0.2s, color 0.2s;
    }
    .result-links a:hover { border-color: var(--purple); color: var(--purple-bright); text-decoration: none; }

    .result-error-msg { font-size: 0.85rem; color: var(--text-muted); }

    /* ── Save to Library ─────────────────────────────────────────────── */
    .save-library-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 10px;
      background: rgba(178,87,255,0.12);
      border: 1px solid rgba(178,87,255,0.4);
      color: var(--purple-bright);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, box-shadow 0.2s;
      font-family: inherit;
    }
    .save-library-btn:hover { background: rgba(178,87,255,0.24); box-shadow: 0 0 10px rgba(128,0,128,0.3); }
    .save-library-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .save-library-btn.saved { background: rgba(133,241,198,0.1); border-color: rgba(133,241,198,0.4); color: var(--success); }

    /* ── Helpers ─────────────────────────────────────────────── */
    .hidden { display: none !important; }
    .eyebrow {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--purple);
    }

    @media (max-width: 540px) {
      .page-shell { padding: 24px 16px 60px; }
      .card { padding: 20px 16px; }
    }
  </style>
</head>
<body>
  <div class="page-shell">

    <header class="page-header">
      <p class="eyebrow">Argi Studio</p>
      <h1>NFToken Checker</h1>
      <p>Validate Netflix cookies and retrieve account info using your license key.</p>
    </header>

    <!-- Config card -->
    <div class="card" id="configCard">
      <h2>Configuration</h2>
      <div class="field">
        <label for="licenseKeyInput">License Key</label>
        <input type="text" id="licenseKeyInput" placeholder="LK-…" autocomplete="one-time-code" spellcheck="false">
      </div>
      <div class="field">
        <label for="cookieInput">
          Cookies — one per line
          <span style="color:var(--text-muted);font-size:0.75rem;margin-left:6px;">(Private use only - Paste Netflix cookies in JSON or raw format)</span>
        </label>
        <textarea id="cookieInput" placeholder="Paste one cookie string per line…"></textarea>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="startBtn">▶ Start Checking</button>
        <button class="btn btn-ghost" id="clearBtn">Clear results</button>
      </div>
    </div>

    <!-- Status + progress -->
    <div class="card hidden" id="progressCard">
      <div class="progress-row">
        <span id="progressLabel">Preparing…</span>
        <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
        <span id="progressCounter">0 / 0</span>
      </div>
      <div class="status-bar" id="statusBar">Waiting…</div>
    </div>

    <!-- Results -->
    <div class="card hidden" id="resultsCard">
      <h2>Results</h2>
      <div class="results-list" id="resultsList"></div>
    </div>

  </div>

  <script>
  (() => {
    const licenseKeyInput = document.getElementById("licenseKeyInput");
    const cookieInput = document.getElementById("cookieInput");
    const startBtn = document.getElementById("startBtn");
    const clearBtn = document.getElementById("clearBtn");
    const progressCard = document.getElementById("progressCard");
    const progressLabel = document.getElementById("progressLabel");
    const progressFill = document.getElementById("progressFill");
    const progressCounter = document.getElementById("progressCounter");
    const statusBar = document.getElementById("statusBar");
    const resultsCard = document.getElementById("resultsCard");
    const resultsList = document.getElementById("resultsList");

    const STORAGE_KEY_LICENSE = "nft_checker_license";
    const COOLDOWN_DELAY_MS = 2000; // polite delay between upstream API requests

    // Restore license key from session storage
    const savedKey = sessionStorage.getItem(STORAGE_KEY_LICENSE);
    if (savedKey) licenseKeyInput.value = savedKey;

    // ── Helpers ──────────────────────────────────────────────
    function setStatus(text, kind = "") {
      statusBar.textContent = text;
      statusBar.className = "status-bar" + (kind ? ` is-${kind}` : "");
    }

    function setProgress(done, total) {
      progressCounter.textContent = `${done} / ${total}`;
      progressFill.style.width = total ? `${Math.round((done / total) * 100)}%` : "0%";
    }

    function sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }

    function parseCookiesFromJson(raw) {
      // Try to parse as JSON first
      try {
        const jsonCookies = JSON.parse(raw);
        if (Array.isArray(jsonCookies)) {
          // Convert JSON cookie array to raw format
          // Extract name and value from each cookie object
          return jsonCookies
            .filter(cookie => cookie && typeof cookie.name === "string" && typeof cookie.value === "string")
            .map(cookie => `${cookie.name}=${cookie.value}`);
        }
      } catch (e) {
        // Not JSON, fall through to normal parsing
      }

      // Otherwise, parse as raw format (one per line or semicolon-separated)
      return raw
        .split(/[;\n]/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }

    function parseCookies(raw) {
      return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function renderSuccess(data) {
      const tier = data.x_tier || "Unknown";
      const tierClass = tier.toLowerCase().includes("premium") ? "tier-premium" : "tier-basic";

      const directLink = data.x_l1 || "#";
      const mobileLink = data.x_l2 || "#";
      const tvLink     = data.x_l3 || "#";

      // Extract NFToken from any of the magic links
      const tokenMatch = (directLink + mobileLink + tvLink).match(/nftoken=([^&\s"]+)/);
      const nftoken = tokenMatch ? tokenMatch[1] : "";

      const item = document.createElement("div");
      item.className = "result-item is-success";
      item.innerHTML = `
        <span class="result-badge badge-success">SUCCESS</span>
        <div class="result-email">${escapeHtml(data.x_mail || "Unknown email")}</div>
        <div class="result-meta">
          <span><strong>Plan:</strong> <span class="${tierClass}">${escapeHtml(tier)}</span></span>
          <span><strong>Country:</strong> ${escapeHtml(data.x_loc || "N/A")}</span>
          <span><strong>Renewal:</strong> ${escapeHtml(data.x_ren || "N/A")}</span>
          <span><strong>Member since:</strong> ${escapeHtml(data.x_mem || "N/A")}</span>
          <span><strong>Payment:</strong> ${escapeHtml(data.x_bil || "N/A")}</span>
          <span><strong>Phone:</strong> ${escapeHtml(data.x_tel || "N/A")}</span>
          <span style="grid-column:1/-1"><strong>Profiles:</strong> ${escapeHtml(data.x_usr || "N/A")}</span>
        </div>
        <div class="result-links">
          <a href="${escapeHtml(directLink)}" target="_blank" rel="noopener noreferrer">🖥 PC</a>
          <a href="${escapeHtml(mobileLink)}" target="_blank" rel="noopener noreferrer">📱 Mobile</a>
          <a href="${escapeHtml(tvLink)}" target="_blank" rel="noopener noreferrer">📺 TV</a>
        </div>
        <div style="margin-top:10px;">
          <button class="save-library-btn" data-email="${escapeHtml(data.x_mail || "")}" data-tier="${escapeHtml(tier)}" data-country="${escapeHtml(data.x_loc || "")}" data-membersince="${escapeHtml(data.x_mem || "")}" data-profiles="${escapeHtml(data.x_usr || "0")}" data-token="${escapeHtml(nftoken)}">📚 Save to Library</button>
          <span class="save-library-status" style="margin-left:8px;font-size:0.8rem;color:var(--text-muted);"></span>
        </div>`;

      // Wire up Save to Library button
      const saveBtn = item.querySelector(".save-library-btn");
      const saveStatus = item.querySelector(".save-library-status");
      saveBtn.addEventListener("click", async () => {
        saveBtn.disabled = true;
        saveStatus.textContent = "Saving…";

        const accountData = {
          email: saveBtn.dataset.email,
          tier: saveBtn.dataset.tier,
          country: saveBtn.dataset.country,
          memberSince: saveBtn.dataset.membersince,
          profiles: parseInt(saveBtn.dataset.profiles, 10) || 0,
          token: saveBtn.dataset.token,
        };

        try {
          // Save to localStorage immediately
          const STORAGE_KEY = "argi_accounts";
          const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
          const deduped = existing.filter((a) => a.email !== accountData.email);
          const newEntry = {
            id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
            ...accountData,
            savedAt: new Date().toISOString(),
          };
          deduped.unshift(newEntry);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));

          // Also try server sync
          const licenseKey = sessionStorage.getItem("nft_checker_license") || "";
          if (licenseKey) {
            await fetch("/api/accounts", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${licenseKey}`,
              },
              body: JSON.stringify(accountData),
            }).catch(() => {});
          }

          saveBtn.classList.add("saved");
          saveBtn.textContent = "✓ Saved";
          saveStatus.style.color = "var(--success)";
          saveStatus.textContent = "Account saved to library.";
        } catch {
          saveBtn.disabled = false;
          saveStatus.style.color = "var(--danger)";
          saveStatus.textContent = "Failed to save. Try again.";
        }
      });

      return item;
    }

    function renderError(message) {
      const item = document.createElement("div");
      item.className = "result-item is-error";
      item.innerHTML = `
        <span class="result-badge badge-error">DEAD / ERROR</span>
        <p class="result-error-msg">${escapeHtml(message)}</p>`;
      return item;
    }

    function renderSystemError(message) {
      const item = document.createElement("div");
      item.className = "result-item is-error";
      item.innerHTML = `
        <span class="result-badge badge-error">SYSTEM ERROR</span>
        <p class="result-error-msg">${escapeHtml(message)}</p>`;
      return item;
    }

    // ── Main flow ────────────────────────────────────────────
    startBtn.addEventListener("click", async () => {
      const licenseKey = licenseKeyInput.value.trim();
      if (!licenseKey) {
        setStatus("Please enter your license key before starting.", "error");
        progressCard.classList.remove("hidden");
        return;
      }

      const raw = cookieInput.value.trim();
      if (!raw) {
        setStatus("Paste at least one cookie string to check.", "error");
        progressCard.classList.remove("hidden");
        return;
      }

      const cookies = parseCookiesFromJson(raw);
      if (cookies.length === 0) {
        setStatus("No valid cookie lines found.", "error");
        progressCard.classList.remove("hidden");
        return;
      }

      // Save license key for convenience
      sessionStorage.setItem(STORAGE_KEY_LICENSE, licenseKey);

      // Reset UI
      resultsList.innerHTML = "";
      resultsCard.classList.add("hidden");
      progressCard.classList.remove("hidden");
      startBtn.disabled = true;
      setProgress(0, cookies.length);
      progressLabel.textContent = "Starting…";
      setStatus("Sending requests…", "info");

      let successCount = 0;
      let errorCount = 0;
      let licenseRejected = false;

      for (let i = 0; i < cookies.length; i++) {
        progressLabel.textContent = `Checking cookie ${i + 1} of ${cookies.length}…`;
        setProgress(i, cookies.length);

        try {
          const res = await fetch("/api/validate-netflix", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cookies: cookies[i], licenseKey }),
          });

          // License-level errors (403/409) should stop the whole run
          if (res.status === 403 || res.status === 409) {
            const errData = await res.json().catch(() => ({}));
            setStatus(errData.error || `License error (HTTP ${res.status})`, "error");
            licenseRejected = true;
            break;
          }

          let data;
          try {
            const text = await res.text();
            data = JSON.parse(text);
          } catch {
            throw new Error("Invalid JSON response from server");
          }

          if (data.status === "SUCCESS") {
            successCount++;
            resultsCard.classList.remove("hidden");
            resultsList.appendChild(renderSuccess(data));
          } else {
            errorCount++;
            resultsCard.classList.remove("hidden");
            resultsList.appendChild(renderError(data.message || data.error || "Invalid cookie"));
          }
        } catch (err) {
          errorCount++;
          resultsCard.classList.remove("hidden");
          resultsList.appendChild(renderSystemError(err.message || "Unknown error"));
        }

        // Small delay between requests to be polite to the upstream API
        if (i < cookies.length - 1 && !licenseRejected) {
          progressLabel.textContent = `Cooling down… (${i + 1}/${cookies.length})`;
          await sleep(COOLDOWN_DELAY_MS);
        }
      }

      setProgress(cookies.length, cookies.length);
      startBtn.disabled = false;

      if (!licenseRejected) {
        progressLabel.textContent = `Done — ${successCount} success, ${errorCount} failed`;
        setStatus(
          `Finished processing ${cookies.length} cookie${cookies.length !== 1 ? "s" : ""}. ${successCount} hit${successCount !== 1 ? "s" : ""}, ${errorCount} dead.`,
          successCount > 0 ? "success" : ""
        );
      }
    });

    clearBtn.addEventListener("click", () => {
      resultsList.innerHTML = "";
      resultsCard.classList.add("hidden");
      progressCard.classList.add("hidden");
      setProgress(0, 0);
      progressLabel.textContent = "Preparing…";
    });
  })();
  </script>
</body>
</html>
