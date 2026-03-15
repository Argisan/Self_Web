(() => {
  const adminPasswordStorageKey = "adminToken";

  // DOM refs — login
  const adminLoginCard = document.getElementById("adminLoginCard");
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminPasswordInput = document.getElementById("adminPassword");
  const adminLoginMessage = document.getElementById("adminLoginMessage");
  const adminLoginBtn = document.getElementById("adminLoginBtn");

  // DOM refs — dashboard
  const adminDashboard = document.getElementById("adminDashboard");
  const adminLogoutBtn = document.getElementById("adminLogoutBtn");
  const createKeyForm = document.getElementById("createKeyForm");
  const createKeyMessage = document.getElementById("createKeyMessage");
  const keysMessage = document.getElementById("keysMessage");
  const keysList = document.getElementById("keysList");
  const refreshKeysBtn = document.getElementById("refreshKeysBtn");

  // Stats
  const statTotal = document.getElementById("statTotal");
  const statActive = document.getElementById("statActive");
  const statInUse = document.getElementById("statInUse");
  const statExpired = document.getElementById("statExpired");

  // ─── State ─────────────────────────────────────────────────────

  let adminPassword = sessionStorage.getItem(adminPasswordStorageKey) || "";

  // ─── Helpers ───────────────────────────────────────────────────

  function setMessage(node, text, kind = "") {
    node.textContent = text;
    node.className = "admin-message";
    if (kind) node.classList.add(`is-${kind}`);
  }

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminPassword}`,
    };
  }

  function isExpired(key) {
    return key.expiresAt && new Date(key.expiresAt) < new Date();
  }

  function formatDate(iso) {
    if (!iso) return "never";
    return new Date(iso).toLocaleString();
  }

  // ─── Auth ───────────────────────────────────────────────────────

  function showDashboard() {
    adminLoginCard.classList.add("is-hidden");
    adminDashboard.classList.remove("is-hidden");
    loadKeys();
  }

  function showLogin() {
    adminDashboard.classList.add("is-hidden");
    adminLoginCard.classList.remove("is-hidden");
    adminPassword = "";
    sessionStorage.removeItem(adminPasswordStorageKey);
  }

  if (adminPassword) {
    showDashboard();
  }

  adminLoginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = adminPasswordInput.value.trim();
    if (!password) return;

    adminLoginBtn.disabled = true;
    setMessage(adminLoginMessage, "Checking password…");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setMessage(adminLoginMessage, "Incorrect password. Try again.", "error");
        adminLoginBtn.disabled = false;
        return;
      }

      adminPassword = password;
      sessionStorage.setItem(adminPasswordStorageKey, adminPassword);
      adminLoginBtn.disabled = false;
      setMessage(adminLoginMessage, "");
      showDashboard();
    } catch {
      setMessage(adminLoginMessage, "Could not reach the server.", "error");
      adminLoginBtn.disabled = false;
    }
  });

  adminLogoutBtn?.addEventListener("click", () => {
    showLogin();
  });

  // ─── Keys list ─────────────────────────────────────────────────

  function renderKeys(keys) {
    if (!keys.length) {
      keysList.innerHTML = '<p class="keys-empty">No license keys yet. Create one above.</p>';
      return;
    }

    keysList.innerHTML = "";

    const now = new Date();

    keys.forEach((key) => {
      const expired = isExpired(key);
      const inUse = !!key.activeSession;

      const entry = document.createElement("div");
      entry.className = "key-entry";
      if (!key.enabled) entry.classList.add("is-disabled");
      else if (inUse) entry.classList.add("is-in-use");
      else if (expired) entry.classList.add("is-expired");

      const badges = [];
      if (!key.enabled) {
        badges.push('<span class="key-badge badge-disabled">Disabled</span>');
      } else if (expired) {
        badges.push('<span class="key-badge badge-expired">Expired</span>');
      } else {
        badges.push('<span class="key-badge badge-active">Active</span>');
      }
      if (inUse) {
        badges.push('<span class="key-badge badge-in-use">In use</span>');
      }

      const labelHtml = key.label
        ? `<span class="key-label">${escapeHtml(key.label)}</span><br>`
        : "";

      const sessionHtml = inUse
        ? `<p class="key-session">🟢 Session started ${formatDate(key.activeSession.startedAt)}</p>`
        : "";

      const expiryText = key.expiresAt
        ? (expired ? `Expired ${formatDate(key.expiresAt)}` : `Expires ${formatDate(key.expiresAt)}`)
        : "No expiry";

      entry.innerHTML = `
        <div class="key-top">
          <span class="key-value">${escapeHtml(key.key)}</span>
          <div class="key-badges">${badges.join("")}</div>
        </div>
        <div class="key-meta">
          ${labelHtml}
          <span>Created ${formatDate(key.createdAt)}</span>
          <span>${expiryText}</span>
        </div>
        ${sessionHtml}
        <div class="key-actions">
          ${key.enabled
            ? `<button class="key-btn" data-action="disable" data-id="${key.id}">Disable</button>`
            : `<button class="key-btn" data-action="enable" data-id="${key.id}">Enable</button>`}
          <button class="key-btn danger" data-action="delete" data-id="${key.id}">Delete</button>
        </div>
      `;

      keysList.appendChild(entry);
    });

    // Update stats
    const total = keys.length;
    const active = keys.filter((k) => k.enabled && !isExpired(k)).length;
    const inUseCnt = keys.filter((k) => k.activeSession).length;
    const expiredCnt = keys.filter((k) => isExpired(k)).length;

    statTotal.textContent = total;
    statActive.textContent = active;
    statInUse.textContent = inUseCnt;
    statExpired.textContent = expiredCnt;
  }

  async function loadKeys() {
    setMessage(keysMessage, "Loading keys…");

    try {
      const response = await fetch("/api/admin/licenses", {
        headers: authHeaders(),
      });

      if (response.status === 401) {
        setMessage(keysMessage, "Session expired. Please sign in again.", "error");
        showLogin();
        return;
      }

      if (!response.ok) throw new Error("Failed to load keys");

      const keys = await response.json();
      setMessage(keysMessage, "");
      renderKeys(keys);
    } catch {
      setMessage(keysMessage, "Could not load keys. Make sure the server is running.", "error");
    }
  }

  refreshKeysBtn?.addEventListener("click", loadKeys);

  // ─── Key actions (enable / disable / delete) ───────────────────

  keysList?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    btn.disabled = true;

    try {
      if (action === "enable" || action === "disable") {
        const response = await fetch(`/api/admin/licenses/${id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ enabled: action === "enable" }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setMessage(keysMessage, data.error || "Failed to update key.", "error");
          btn.disabled = false;
          return;
        }
        await loadKeys();
        return;
      }

      if (action === "delete") {
        if (!window.confirm("Delete this license key? This cannot be undone.")) {
          btn.disabled = false;
          return;
        }

        const response = await fetch(`/api/admin/licenses/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setMessage(keysMessage, data.error || "Failed to delete key.", "error");
          btn.disabled = false;
          return;
        }
        await loadKeys();
      }
    } catch {
      setMessage(keysMessage, "Request failed. Check the server.", "error");
      btn.disabled = false;
    }
  });

  // ─── Create key ────────────────────────────────────────────────

  createKeyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const label = document.getElementById("newKeyLabel")?.value.trim() || "";
    const expiresAt = document.getElementById("newKeyExpiry")?.value || null;

    setMessage(createKeyMessage, "Creating key…");

    try {
      const response = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          label,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(createKeyMessage, data.error || "Failed to create key.", "error");
        return;
      }

      setMessage(createKeyMessage, `Key created: ${data.key}`, "success");
      createKeyForm.reset();
      await loadKeys();
    } catch {
      setMessage(createKeyMessage, "Request failed. Check the server.", "error");
    }
  });

  // ─── Utility ───────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
