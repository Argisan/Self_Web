(() => {
  const VALID_USERNAME = "argi";
  const VALID_PASSWORD = "password";

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

  const memoryStore = {
    authUser: "",
    isAuthenticated: "false",
  };

  function safeGet(storage, key) {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSet(storage, key, value) {
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function safeRemove(storage, key) {
    try {
      storage.removeItem(key);
    } catch {
      // ignore storage errors
    }
  }

  function getAuthRecord() {
    const localAuth = safeGet(localStorage, "isAuthenticated") === "true";
    const sessionAuth = safeGet(sessionStorage, "isAuthenticated") === "true";

    if (localAuth) {
      return {
        isAuthenticated: true,
        source: "local",
        username: safeGet(localStorage, "authUser") || "argi",
      };
    }

    if (sessionAuth) {
      return {
        isAuthenticated: true,
        source: "session",
        username: safeGet(sessionStorage, "authUser") || "argi",
      };
    }

    if (memoryStore.isAuthenticated === "true") {
      return {
        isAuthenticated: true,
        source: "memory",
        username: memoryStore.authUser || "argi",
      };
    }

    return { isAuthenticated: false };
  }

  function setMessage(text, kind = "") {
    if (!messageNode) return;
    messageNode.textContent = text;
    messageNode.className = "message";
    if (kind) messageNode.classList.add(`is-${kind}`);
  }

  function clearSession() {
    memoryStore.authUser = "";
    memoryStore.isAuthenticated = "false";
    safeRemove(localStorage, "authUser");
    safeRemove(localStorage, "isAuthenticated");
    safeRemove(sessionStorage, "authUser");
    safeRemove(sessionStorage, "isAuthenticated");
  }

  function saveSession(username, shouldRemember) {
    memoryStore.authUser = username;
    memoryStore.isAuthenticated = "true";

    if (shouldRemember) {
      const okUser = safeSet(localStorage, "authUser", username);
      const okAuth = safeSet(localStorage, "isAuthenticated", "true");
      return okUser && okAuth;
    }

    const okUser = safeSet(sessionStorage, "authUser", username);
    const okAuth = safeSet(sessionStorage, "isAuthenticated", "true");
    return okUser && okAuth;
  }

  function redirectToHome(withTemporaryAuth = false) {
    // assign keeps back navigation consistent while still being explicit.
    window.location.assign(withTemporaryAuth ? "home.html?auth=ok" : "home.html");
  }

  function playSound(sound) {
    if (!sound) return;
    try {
      sound.currentTime = 0;
      const playPromise = sound.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // ignore unsupported media / autoplay restrictions
        });
      }
    } catch {
      // ignore unsupported media / autoplay restrictions
    }
  }

  const savedSession = getAuthRecord();
  if (savedSession.isAuthenticated && sessionNotice && sessionText) {
    sessionNotice.classList.remove("is-hidden");
    sessionText.textContent = `Signed in as ${savedSession.username}. You can continue directly or clear this session.`;
  }

  clearSessionBtn?.addEventListener("click", () => {
    clearSession();
    sessionNotice?.classList.add("is-hidden");
    setMessage("Session cleared.", "success");
  });

  togglePassword?.addEventListener("click", () => {
    if (!passwordInput) return;
    const showing = passwordInput.type === "text";
    passwordInput.type = showing ? "password" : "text";
    togglePassword.textContent = showing ? "Show" : "Hide";
  });

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = (usernameInput?.value || "").trim();
    const password = (passwordInput?.value || "").trim();

    if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
      playSound(errorSound);
      setMessage("Invalid username or password.", "error");
      return;
    }

    loginBtn?.setAttribute("disabled", "disabled");
    clearSession();
    const persisted = saveSession(username, Boolean(rememberMe?.checked));

    playSound(successSound);

    if (!persisted) {
      setMessage("Login successful. Browser storage is blocked, session is temporary for this tab.", "success");
    } else {
      setMessage("Login successful. Redirecting...", "success");
    }

    window.setTimeout(() => {
      redirectToHome(!persisted);
    }, 350);
  });

  const canvas = document.getElementById("particles");
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;

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
})();
