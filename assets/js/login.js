(() => {
  const loginForm = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const rememberMe = document.getElementById("rememberMe");
  const togglePassword = document.getElementById("togglePassword");
  const messageNode = document.getElementById("message");
  const sessionNotice = document.getElementById("sessionNotice");
  const sessionText = document.getElementById("sessionText");
  const clearSessionBtn = document.getElementById("clearSessionBtn");
  const successSound = document.getElementById("successSound");
  const errorSound = document.getElementById("errorSound");
  const loginBtn = document.getElementById("loginBtn");

  function setMessage(text, kind = "") {
    if (!messageNode) return;
    messageNode.textContent = text;
    messageNode.className = "message";
    if (kind) messageNode.classList.add(`is-${kind}`);
  }

  function playSound(sound) {
    if (!sound) return;

    try {
      sound.currentTime = 0;
      const playPromise = sound.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch {
      // Ignore autoplay restrictions and unsupported formats.
    }
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

  async function refreshSessionNotice() {
    try {
      const { response, data } = await fetchJson("/api/auth/session", {
        method: "GET",
        headers: {},
      });

      if (response.ok && data.authenticated && sessionNotice && sessionText) {
        sessionNotice.classList.remove("is-hidden");
        sessionText.textContent = `Signed in as ${data.username}. Continue to the portfolio or clear this session.`;
        return;
      }
    } catch {
      // Fall back to the normal login form.
    }

    sessionNotice?.classList.add("is-hidden");
  }

  async function clearSession() {
    try {
      await fetchJson("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      // Ignore logout errors and still reset the view.
    }

    sessionNotice?.classList.add("is-hidden");
    setMessage("Session cleared.", "success");
  }

  function redirectToHome() {
    window.location.assign("/home.html");
  }

  clearSessionBtn?.addEventListener("click", () => {
    clearSession();
  });

  togglePassword?.addEventListener("click", () => {
    if (!passwordInput) return;
    const showing = passwordInput.type === "text";
    passwordInput.type = showing ? "password" : "text";
    togglePassword.textContent = showing ? "Show" : "Hide";
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = (usernameInput?.value || "").trim();
    const password = passwordInput?.value || "";

    if (!username || !password) {
      setMessage("Enter both your username and password.", "error");
      return;
    }

    loginBtn?.setAttribute("disabled", "disabled");
    setMessage("Signing in...");

    try {
      const { response, data } = await fetchJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          rememberMe: Boolean(rememberMe?.checked),
        }),
      });

      if (!response.ok) {
        playSound(errorSound);
        setMessage(data.error || "Invalid username or password.", "error");
        loginBtn?.removeAttribute("disabled");
        return;
      }

      playSound(successSound);
      setMessage("Login successful. Redirecting...", "success");
      window.setTimeout(redirectToHome, 300);
    } catch {
      playSound(errorSound);
      setMessage("Could not reach the server. Start the local app and try again.", "error");
      loginBtn?.removeAttribute("disabled");
    }
  });

  const canvas = document.getElementById("particles");
  const context = canvas?.getContext("2d");
  if (!canvas || !context) {
    void refreshSessionNotice();
    return;
  }

  const particles = [];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const particleCount = reduceMotion ? 28 : 70;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 0.7 + Math.random() * 1.8,
      vx: -0.24 + Math.random() * 0.48,
      vy: -0.18 + Math.random() * 0.36,
      alpha: 0.15 + Math.random() * 0.45,
    };
  }

  function seedParticles() {
    particles.length = 0;
    for (let index = 0; index < particleCount; index += 1) {
      particles.push(createParticle());
    }
  }

  function drawParticles() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < -10) particle.x = canvas.width + 10;
      if (particle.x > canvas.width + 10) particle.x = -10;
      if (particle.y < -10) particle.y = canvas.height + 10;
      if (particle.y > canvas.height + 10) particle.y = -10;

      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(209, 141, 255, ${particle.alpha})`;
      context.fill();
    }

    if (!reduceMotion) {
      requestAnimationFrame(drawParticles);
    }
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    seedParticles();
  });

  resizeCanvas();
  seedParticles();
  drawParticles();
  void refreshSessionNotice();
})();
