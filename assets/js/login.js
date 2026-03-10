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

  function setMessage(text, kind = "") {
    messageNode.textContent = text;
    messageNode.className = "message";
    if (kind) messageNode.classList.add(`is-${kind}`);
  }

  function clearSession() {
    localStorage.removeItem("authUser");
    localStorage.removeItem("isAuthenticated");
    sessionStorage.removeItem("authUser");
    sessionStorage.removeItem("isAuthenticated");
  }

  function getSavedSession() {
    const localAuth = localStorage.getItem("isAuthenticated") === "true";
    const sessionAuth = sessionStorage.getItem("isAuthenticated") === "true";

    if (localAuth) {
      return {
        isAuthenticated: true,
        source: "local",
        username: localStorage.getItem("authUser") || "argi",
      };
    }

    if (sessionAuth) {
      return {
        isAuthenticated: true,
        source: "session",
        username: sessionStorage.getItem("authUser") || "argi",
      };
    }

    return { isAuthenticated: false };
  }

  const savedSession = getSavedSession();
  if (savedSession.isAuthenticated) {
    sessionNotice.classList.remove("is-hidden");
    sessionText.textContent = `Signed in as ${savedSession.username}. You can continue directly or clear this session.`;
  }

  clearSessionBtn?.addEventListener("click", () => {
    clearSession();
    sessionNotice.classList.add("is-hidden");
    setMessage("Session cleared.", "success");
  });

  togglePassword?.addEventListener("click", () => {
    const showing = passwordInput.type === "text";
    passwordInput.type = showing ? "password" : "text";
    togglePassword.textContent = showing ? "Show" : "Hide";
  });

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (username !== VALID_USERNAME || password !== VALID_PASSWORD) {
      setMessage("Invalid username or password.", "error");
      return;
    }

    clearSession();

    if (rememberMe.checked) {
      localStorage.setItem("authUser", username);
      localStorage.setItem("isAuthenticated", "true");
    } else {
      sessionStorage.setItem("authUser", username);
      sessionStorage.setItem("isAuthenticated", "true");
    }

    try {
      successSound?.play();
    } catch {
      // ignore autoplay restrictions
    }

    setMessage("Login successful. Redirecting...", "success");
    window.setTimeout(() => {
      window.location.href = "home.html";
    }, 500);
  });

  const canvas = document.getElementById("particles");
  const context = canvas.getContext("2d");
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