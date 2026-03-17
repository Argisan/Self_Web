// accounts.js — Account Library Manager for Argi Studio

(() => {
  const STORAGE_KEY = "argi_accounts";
  const LICENSE_KEY_STORAGE = "nft_checker_license";

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getLicenseKey() {
    return sessionStorage.getItem(LICENSE_KEY_STORAGE) || localStorage.getItem(LICENSE_KEY_STORAGE) || "";
  }

  function generateLocalId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "Unknown";
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  }

  // ── LocalStorage persistence ─────────────────────────────────────────────────

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveToStorage(accounts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // Storage quota exceeded or unavailable
    }
  }

  // ── Server sync ──────────────────────────────────────────────────────────────

  async function fetchFromServer() {
    const licenseKey = getLicenseKey();
    if (!licenseKey) return null;
    try {
      const res = await fetch("/api/accounts", {
        headers: { Authorization: `Bearer ${licenseKey}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) ? data : null;
    } catch {
      return null;
    }
  }

  async function saveToServer(account) {
    const licenseKey = getLicenseKey();
    if (!licenseKey) return null;
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${licenseKey}`,
        },
        body: JSON.stringify(account),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function deleteFromServer(id) {
    const licenseKey = getLicenseKey();
    if (!licenseKey) return false;
    try {
      const res = await fetch(`/api/accounts/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${licenseKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── AccountManager class ─────────────────────────────────────────────────────

  class AccountManager {
    constructor() {
      this.accounts = loadFromStorage();
      this._modal = null;
    }

    async init() {
      // Try to sync from server, fall back to localStorage
      const serverAccounts = await fetchFromServer();
      if (serverAccounts !== null) {
        this.accounts = serverAccounts;
        saveToStorage(this.accounts);
      }
      this.render();
    }

    async addAccount(data) {
      const account = {
        id: generateLocalId(),
        email: String(data.email || ""),
        tier: String(data.tier || ""),
        country: String(data.country || ""),
        memberSince: String(data.memberSince || ""),
        profiles: Number(data.profiles) || 0,
        token: String(data.token || ""),
        savedAt: new Date().toISOString(),
      };

      // Try server first for canonical ID
      const serverAccount = await saveToServer(account);
      const finalAccount = serverAccount || account;

      // Avoid duplicates by email
      this.accounts = this.accounts.filter((a) => a.email !== finalAccount.email);
      this.accounts.unshift(finalAccount);
      saveToStorage(this.accounts);
      return finalAccount;
    }

    async deleteAccount(id) {
      this.accounts = this.accounts.filter((a) => a.id !== id);
      saveToStorage(this.accounts);
      await deleteFromServer(id);
      this.render();
    }

    render() {
      const grid = document.getElementById("accountGrid");
      const emptyState = document.getElementById("emptyState");
      if (!grid) return;

      grid.innerHTML = "";

      if (this.accounts.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        return;
      }

      if (emptyState) emptyState.style.display = "none";

      this.accounts.forEach((account) => {
        grid.appendChild(this._createCard(account));
      });
    }

    _createCard(account) {
      const card = document.createElement("div");
      card.className = "account-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Account: ${account.email}`);

      const tierClass = (account.tier || "").toLowerCase().includes("premium") ? "tier-premium" : "tier-basic";
      const initials = (account.email || "?").slice(0, 2).toUpperCase();

      card.innerHTML = `
        <div class="account-card-avatar">${escapeHtml(initials)}</div>
        <div class="account-card-email">${escapeHtml(account.email)}</div>
        <div class="account-card-meta">
          <span class="account-tier ${tierClass}">${escapeHtml(account.tier || "Unknown")}</span>
          <span class="account-country">${escapeHtml(account.country || "—")}</span>
        </div>
        <div class="account-card-footer">
          <span>Saved ${escapeHtml(formatDate(account.savedAt))}</span>
        </div>`;

      card.addEventListener("click", () => this._openModal(account));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._openModal(account); }
      });

      return card;
    }

    _openModal(account) {
      const overlay = document.getElementById("modalOverlay");
      const content = document.getElementById("modalContent");
      if (!overlay || !content) return;

      const tierClass = (account.tier || "").toLowerCase().includes("premium") ? "tier-premium" : "tier-basic";
      const magicLink = account.token ? `https://www.netflix.com/?nftoken=${encodeURIComponent(account.token)}` : "";

      content.innerHTML = `
        <div class="modal-header">
          <h2 class="modal-email">${escapeHtml(account.email)}</h2>
          <button class="modal-close-btn" id="modalCloseBtn" aria-label="Close">✕</button>
        </div>
        <div class="modal-meta-grid">
          <div class="modal-meta-item"><span class="modal-meta-label">Plan</span><span class="${tierClass}">${escapeHtml(account.tier || "Unknown")}</span></div>
          <div class="modal-meta-item"><span class="modal-meta-label">Country</span><span>${escapeHtml(account.country || "—")}</span></div>
          <div class="modal-meta-item"><span class="modal-meta-label">Member Since</span><span>${escapeHtml(account.memberSince || "—")}</span></div>
          <div class="modal-meta-item"><span class="modal-meta-label">Profiles</span><span>${escapeHtml(String(account.profiles || "—"))}</span></div>
          <div class="modal-meta-item"><span class="modal-meta-label">Saved On</span><span>${escapeHtml(formatDate(account.savedAt))}</span></div>
        </div>
        ${magicLink ? `
        <div class="modal-token-section">
          <span class="modal-meta-label">Magic Login Link</span>
          <div class="modal-token-row">
            <input class="modal-token-input" type="text" readonly value="${escapeHtml(magicLink)}" id="modalTokenInput" aria-label="Magic login link">
            <button class="modal-copy-btn" id="modalCopyBtn">Copy</button>
          </div>
          <a class="modal-open-link" href="${escapeHtml(magicLink)}" target="_blank" rel="noopener noreferrer">Open Magic Link ↗</a>
        </div>` : ""}
        <div class="modal-actions">
          <button class="modal-delete-btn" id="modalDeleteBtn">🗑 Delete Account</button>
        </div>`;

      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";

      document.getElementById("modalCloseBtn").addEventListener("click", () => this._closeModal());
      document.getElementById("modalDeleteBtn").addEventListener("click", () => {
        this._closeModal();
        this.deleteAccount(account.id);
      });

      if (document.getElementById("modalCopyBtn")) {
        document.getElementById("modalCopyBtn").addEventListener("click", () => {
          const input = document.getElementById("modalTokenInput");
          if (!input) return;
          input.select();
          try {
            navigator.clipboard.writeText(input.value).catch(() => document.execCommand("copy"));
          } catch {
            document.execCommand("copy");
          }
          document.getElementById("modalCopyBtn").textContent = "Copied!";
          setTimeout(() => {
            const btn = document.getElementById("modalCopyBtn");
            if (btn) btn.textContent = "Copy";
          }, 2000);
        });
      }

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this._closeModal();
      }, { once: true });
    }

    _closeModal() {
      const overlay = document.getElementById("modalOverlay");
      if (overlay) overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }
  }

  // ── Page initialization ──────────────────────────────────────────────────────

  const manager = new AccountManager();

  document.addEventListener("DOMContentLoaded", async () => {
    // Auth check — redirect if no license key
    if (!getLicenseKey()) {
      const authNotice = document.getElementById("authNotice");
      const accountsSection = document.getElementById("accountsSection");
      if (authNotice) authNotice.style.display = "block";
      if (accountsSection) accountsSection.style.display = "none";
      return;
    }

    await manager.init();

    // Keyboard close for modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") manager._closeModal();
    });
  });

  // Expose manager for use by index.php "Save to Library" button
  window.accountManager = manager;
})();
