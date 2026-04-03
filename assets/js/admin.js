(() => {
  const adminLoginCard = document.getElementById("adminLoginCard");
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminPasswordInput = document.getElementById("adminPassword");
  const adminLoginMessage = document.getElementById("adminLoginMessage");
  const adminLoginBtn = document.getElementById("adminLoginBtn");

  const adminDashboard = document.getElementById("adminDashboard");
  const adminLogoutBtn = document.getElementById("adminLogoutBtn");
  const createKeyForm = document.getElementById("createKeyForm");
  const createKeyMessage = document.getElementById("createKeyMessage");
  const keysMessage = document.getElementById("keysMessage");
  const keysList = document.getElementById("keysList");
  const refreshKeysBtn = document.getElementById("refreshKeysBtn");

  const statTotal = document.getElementById("statTotal");
  const statActive = document.getElementById("statActive");
  const statInUse = document.getElementById("statInUse");
  const statExpired = document.getElementById("statExpired");

  function setMessage(node, text, kind = "") {
    if (!node) return;
    node.textContent = text;
    node.className = "admin-message";
    if (kind) node.classList.add(`is-${kind}`);
  }

  function isExpired(key) {
    return Boolean(key.expiresAt) && new Date(key.expiresAt) < new Date();
  }

  function formatDate(iso) {
    if (!iso) return "never";
    return new Date(iso).toLocaleString();
  }

  function showDashboard() {
    adminLoginCard?.classList.add("is-hidden");
    adminDashboard?.classList.remove("is-hidden");
  }

  function showLogin() {
    adminDashboard?.classList.add("is-hidden");
    adminLoginCard?.classList.remove("is-hidden");
    if (adminPasswordInput) adminPasswordInput.value = "";
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  function renderKeys(keys) {
    if (!keys.length) {
      keysList.innerHTML = '<p class="keys-empty">No license keys yet. Create one above.</p>';
      statTotal.textContent = "0";
      statActive.textContent = "0";
      statInUse.textContent = "0";
      statExpired.textContent = "0";
      return;
    }

    keysList.innerHTML = "";

    keys.forEach((key) => {
      const expired = isExpired(key);
      const inUse = Boolean(key.activeSession);
      const entry = document.createElement("div");
      entry.className = "key-entry";

      if (!key.enabled) entry.classList.add("is-disabled");
      else if (inUse) entry.classList.add("is-in-use");
      else if (expired) entry.classList.add("is-expired");

      const badges = [];
      if (!key.enabled) badges.push('<span class="key-badge badge-disabled">Disabled</span>');
      else if (expired) badges.push('<span class="key-badge badge-expired">Expired</span>');
      else badges.push('<span class="key-badge badge-active">Active</span>');
      if (inUse) badges.push('<span class="key-badge badge-in-use">In use</span>');

      const labelHtml = key.label ? `<span class="key-label">${escapeHtml(key.label)}</span><br>` : "";
      const sessionHtml = inUse
        ? `<p class="key-session">Session started ${formatDate(key.activeSession.startedAt)}</p>`
        : "";
      const expiryText = key.expiresAt
        ? expired
          ? `Expired ${formatDate(key.expiresAt)}`
          : `Expires ${formatDate(key.expiresAt)}`
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

    statTotal.textContent = String(keys.length);
    statActive.textContent = String(keys.filter((key) => key.enabled && !isExpired(key)).length);
    statInUse.textContent = String(keys.filter((key) => key.activeSession).length);
    statExpired.textContent = String(keys.filter((key) => isExpired(key)).length);
  }

  async function loadKeys() {
    setMessage(keysMessage, "Loading keys...");

    try {
      const { response, data } = await fetchJson("/api/admin/licenses", {
        method: "GET",
        headers: {},
      });

      if (response.status === 401) {
        setMessage(keysMessage, "Session expired. Please sign in again.", "error");
        showLogin();
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to load keys.");
      }

      setMessage(keysMessage, "");
      renderKeys(data);
    } catch (error) {
      setMessage(keysMessage, error.message || "Could not load keys.", "error");
    }
  }

  async function checkSession() {
    try {
      const { response, data } = await fetchJson("/api/admin/session", {
        method: "GET",
        headers: {},
      });

      if (response.ok && data.authenticated) {
        showDashboard();
        await loadKeys();
        return;
      }
    } catch {
      // Fall through to the login form.
    }

    showLogin();
  }

  adminLoginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = adminPasswordInput?.value || "";
    if (!password) return;

    adminLoginBtn.disabled = true;
    setMessage(adminLoginMessage, "Checking password...");

    try {
      const { response, data } = await fetchJson("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setMessage(adminLoginMessage, data.error || "Incorrect password.", "error");
        adminLoginBtn.disabled = false;
        return;
      }

      setMessage(adminLoginMessage, "");
      adminLoginBtn.disabled = false;
      showDashboard();
      await loadKeys();
    } catch {
      setMessage(adminLoginMessage, "Could not reach the server.", "error");
      adminLoginBtn.disabled = false;
    }
  });

  adminLogoutBtn?.addEventListener("click", async () => {
    try {
      await fetchJson("/api/admin/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      // Ignore logout errors and still reset the local view.
    }

    showLogin();
    setMessage(adminLoginMessage, "Signed out.", "success");
    setMessage(keysMessage, "");
  });

  refreshKeysBtn?.addEventListener("click", () => {
    loadKeys();
  });

  keysList?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    if (!id) return;

    button.disabled = true;

    try {
      if (action === "enable" || action === "disable") {
        const { response, data } = await fetchJson(`/api/admin/licenses/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: action === "enable" }),
        });

        if (response.status === 401) {
          showLogin();
          setMessage(keysMessage, "Session expired. Please sign in again.", "error");
          return;
        }

        if (!response.ok) {
          setMessage(keysMessage, data.error || "Failed to update key.", "error");
          button.disabled = false;
          return;
        }

        await loadKeys();
        return;
      }

      if (action === "delete") {
        if (!window.confirm("Delete this license key? This cannot be undone.")) {
          button.disabled = false;
          return;
        }

        const { response, data } = await fetchJson(`/api/admin/licenses/${id}`, {
          method: "DELETE",
          body: JSON.stringify({}),
        });

        if (response.status === 401) {
          showLogin();
          setMessage(keysMessage, "Session expired. Please sign in again.", "error");
          return;
        }

        if (!response.ok) {
          setMessage(keysMessage, data.error || "Failed to delete key.", "error");
          button.disabled = false;
          return;
        }

        await loadKeys();
      }
    } catch {
      setMessage(keysMessage, "Request failed. Check the server.", "error");
      button.disabled = false;
    }
  });

  createKeyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const label = document.getElementById("newKeyLabel")?.value.trim() || "";
    const expiresAtValue = document.getElementById("newKeyExpiry")?.value || "";

    setMessage(createKeyMessage, "Creating key...");

    try {
      const { response, data } = await fetchJson("/api/admin/licenses", {
        method: "POST",
        body: JSON.stringify({
          label,
          expiresAt: expiresAtValue ? new Date(expiresAtValue).toISOString() : null,
        }),
      });

      if (response.status === 401) {
        showLogin();
        setMessage(createKeyMessage, "Session expired. Please sign in again.", "error");
        return;
      }

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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  checkSession();
})();
