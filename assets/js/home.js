(() => {
  const isAuthenticated =
    localStorage.getItem("isAuthenticated") === "true" ||
    sessionStorage.getItem("isAuthenticated") === "true";

  if (!isAuthenticated) {
    window.location.href = "index.html";
    return;
  }

  const navLinks = document.querySelectorAll(".nav-link");
  const panels = document.querySelectorAll(".panel");
  const moreAboutBtn = document.getElementById("moreAboutBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const sectionJumpLinks = document.querySelectorAll("[data-section-jump]");

  function animateSkills() {
    document.querySelectorAll(".skill-fill").forEach((fill) => {
      const target = Number(fill.dataset.percent || 0);
      const label = fill.closest(".skill-row")?.querySelector(".percent");
      let current = 0;

      fill.style.width = "0%";
      if (label) label.textContent = "0%";

      requestAnimationFrame(() => {
        fill.style.width = `${target}%`;
      });

      const intervalId = window.setInterval(() => {
        current += 1;
        if (label) label.textContent = `${Math.min(current, target)}%`;
        if (current >= target) window.clearInterval(intervalId);
      }, 12);
    });
  }

  function showPanel(panelId) {
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.section === panelId);
    });

    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === panelId);
    });

    if (panelId === "about") animateSkills();
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showPanel(link.dataset.section);
    });
  });

  sectionJumpLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showPanel(link.dataset.sectionJump);
    });
  });

  moreAboutBtn?.addEventListener("click", () => {
    showPanel("about");
  });

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("isAuthenticated");
    sessionStorage.removeItem("authUser");
    sessionStorage.removeItem("isAuthenticated");
    window.location.href = "index.html";
  });

  const reactionButtons = document.querySelectorAll(".reaction-btn");
  const reactionBoard = document.getElementById("reactionBoard");
  const reactionResult = document.getElementById("reactionResult");
  const reactionLabels = {
    clean: "Clean",
    cool: "Cool",
    creative: "Creative",
    wild: "Wild",
  };
  const reactionStorageKey = "portfolioReactions";

  function getReactionState() {
    const defaults = {
      clean: 3,
      cool: 5,
      creative: 8,
      wild: 2,
      selected: "",
    };

    try {
      const parsed = JSON.parse(localStorage.getItem(reactionStorageKey) || "null");
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }

  function setReactionState(state) {
    localStorage.setItem(reactionStorageKey, JSON.stringify(state));
  }

  function renderReactionBoard() {
    const state = getReactionState();
    const total = ["clean", "cool", "creative", "wild"].reduce(
      (sum, key) => sum + Number(state[key] || 0),
      0,
    );

    reactionButtons.forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.reaction === state.selected);
    });

    reactionBoard.innerHTML = "";
    Object.keys(reactionLabels).forEach((key) => {
      const count = Number(state[key] || 0);
      const item = document.createElement("div");
      const fill = Math.max(8, total ? (count / total) * 100 : 0);
      item.className = "reaction-item";
      item.innerHTML = `
        <span class="reaction-label">${reactionLabels[key]}</span>
        <div class="reaction-track"><div class="reaction-fill" style="width: ${fill}%"></div></div>
        <span class="reaction-count">${count}</span>
      `;
      reactionBoard.appendChild(item);
    });

    reactionResult.textContent = state.selected
      ? `You picked ${reactionLabels[state.selected]}. Counts are saved locally on this device.`
      : "Pick one and the board updates instantly on this device.";
  }

  reactionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const state = getReactionState();
      const key = button.dataset.reaction;

      if (state.selected) {
        state[state.selected] = Math.max(0, Number(state[state.selected] || 0) - 1);
      }

      state[key] = Number(state[key] || 0) + 1;
      state.selected = key;
      setReactionState(state);
      renderReactionBoard();
    });
  });

  const cookieForm = document.getElementById("cookieForm");
  const generateNFTokenBtn = document.getElementById("generateNFTokenBtn");
  const cookieStatusPanel = document.getElementById("cookieStatusPanel");
  const cookieStatusTitle = document.getElementById("cookieStatusTitle");
  const cookieStatusCopy = document.getElementById("cookieStatusCopy");
  const cookieStorageKey = "netflixCookies";

  function setCookieStatus(title, copy, kind) {
    if (!cookieStatusPanel) return;
    cookieStatusTitle.textContent = title;
    cookieStatusCopy.textContent = copy;
    cookieStatusPanel.className = "cookie-status-panel";
    if (kind) cookieStatusPanel.classList.add(`is-${kind}`);
  }

  function loadCookieStatus() {
    try {
      const stored = localStorage.getItem(cookieStorageKey);
      if (stored) {
        const data = JSON.parse(stored);
        setCookieStatus(
          "Cookies stored",
          `NetflixId and SecureNetflixId are saved locally. Stored at ${data.storedAt || "unknown time"}.`,
          "success",
        );
      }
    } catch {
      /* no stored cookies — leave default state */
    }
  }

  cookieForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const netflixId = document.getElementById("netflixId")?.value.trim();
    const secureNetflixId = document.getElementById("secureNetflixId")?.value.trim();
    const nfvdid = document.getElementById("nfvdid")?.value.trim();

    if (!netflixId || !secureNetflixId) {
      setCookieStatus("Missing required fields", "Please enter both NetflixId and SecureNetflixId.", "error");
      return;
    }

    const payload = {
      netflixId,
      secureNetflixId,
      nfvdid: nfvdid || "",
      storedAt: new Date().toLocaleString(),
    };

    try {
      localStorage.setItem(cookieStorageKey, JSON.stringify(payload));
      setCookieStatus("Cookies stored", `Saved locally at ${payload.storedAt}. Ready to generate NFToken.`, "success");
      cookieForm.reset();
    } catch {
      setCookieStatus("Storage error", "Could not save cookies to localStorage.", "error");
    }
  });

  generateNFTokenBtn?.addEventListener("click", async () => {
    let payload;

    try {
      const stored = localStorage.getItem(cookieStorageKey);
      if (!stored) {
        setCookieStatus("No cookies found", "Store your Netflix cookies first before generating a token.", "error");
        return;
      }
      payload = JSON.parse(stored);
    } catch {
      setCookieStatus("Storage error", "Could not read stored cookies.", "error");
      return;
    }

    setCookieStatus("Generating NFToken…", "Contacting nftoken.site, please wait.", "");

    try {
      const response = await fetch("https://nftoken.site/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          netflixId: payload.netflixId,
          secureNetflixId: payload.secureNetflixId,
          nfvdid: payload.nfvdid,
        }),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const data = await response.json();
      const token = data.nftoken || data.token || "";
      const magicLink = token ? `https://www.netflix.com/?nftoken=${token}` : "";

      if (token) {
        setCookieStatus("NFToken generated", "Magic login link ready — click below to open.", "success");
        if (cookieStatusCopy) {
          const link = document.createElement("a");
          link.href = magicLink;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.style.cssText = "color:inherit;text-decoration:underline;";
          link.textContent = "Open magic login link";
          cookieStatusCopy.textContent = "";
          cookieStatusCopy.appendChild(link);
        }
      } else {
        setCookieStatus("Unexpected response", "The server responded but no token was found.", "error");
      }
    } catch (error) {
      console.error("[NFToken] Generation error:", error);
      setCookieStatus("Generation failed", "Could not reach nftoken.site. Check your connection or cookies.", "error");
    }
  });

  loadCookieStatus();

  const paletteGrid = document.getElementById("paletteGrid");
  const paletteNote = document.getElementById("paletteNote");
  const paletteNotes = {
    royal: "Royal violet is selected.",
    frost: "White frost is selected.",
    shadow: "Shadow black is selected.",
  };

  paletteGrid?.addEventListener("click", (event) => {
    const swatch = event.target.closest(".palette-swatch");
    if (!swatch) return;

    document.querySelectorAll(".palette-swatch").forEach((item) => {
      item.classList.toggle("active", item === swatch);
    });

    paletteNote.textContent = paletteNotes[swatch.dataset.color] || "Palette selected.";
  });

  const quizButtons = document.querySelectorAll(".quiz-btn");
  const quizResult = document.getElementById("quizResult");
  const vibeMessages = {
    glow: "You picked Glossy and glowing. This version feels best for social shares, reels, and attention-grabbing visuals.",
    soft: "You picked Soft and dreamy. This version feels more artistic, gentle, and premium.",
    chaos: "You picked Bold and chaotic. This version feels loud, playful, and built to be remembered fast.",
  };

  quizButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const vibe = button.dataset.vibe;
      quizButtons.forEach((item) => item.classList.toggle("active", item === button));
      quizResult.textContent = vibeMessages[vibe] || "Choose a vibe to see your result.";
    });
  });

  const guestbookForm = document.getElementById("guestbookForm");
  const guestbookList = document.getElementById("guestbookList");
  const guestbookStatus = document.getElementById("guestbookStatus");
  const guestbookEndpoint = "/api/guestbook";

  function setGuestbookStatus(text, kind = "") {
    guestbookStatus.textContent = text;
    guestbookStatus.className = "guestbook-status";
    if (kind) guestbookStatus.classList.add(`is-${kind}`);
  }

  function renderGuestbook(entries) {
    guestbookList.innerHTML = "";

    entries.forEach((entry) => {
      const item = document.createElement("article");
      const nameNode = document.createElement("strong");
      const messageNode = document.createElement("p");
      item.className = "guestbook-entry";
      nameNode.textContent = entry.name;
      messageNode.textContent = entry.message;
      item.append(nameNode, messageNode);
      guestbookList.appendChild(item);
    });
  }

  async function loadGuestbook() {
    setGuestbookStatus("Loading messages...");

    try {
      const response = await fetch(guestbookEndpoint);
      if (!response.ok) throw new Error("Unable to load guestbook");
      const entries = await response.json();
      renderGuestbook(entries);
      setGuestbookStatus("Guestbook is live.", "success");
    } catch {
      renderGuestbook([]);
      setGuestbookStatus("Guestbook server not found. Run the local server instead of opening the HTML file directly.", "error");
    }
  }

  guestbookForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(guestbookForm);
    const name = String(formData.get("guestName") || "").trim();
    const message = String(formData.get("guestMessage") || "").trim();
    if (!name || !message) return;

    setGuestbookStatus("Posting message...");

    try {
      const response = await fetch(guestbookEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, message }),
      });

      if (!response.ok) throw new Error("Unable to post message");
      const entries = await response.json();
      renderGuestbook(entries);
      guestbookForm.reset();
      setGuestbookStatus("Message posted to the live guestbook.", "success");
    } catch {
      setGuestbookStatus("Could not post. Make sure the local guestbook server is running.", "error");
    }
  });

  const canvas = document.getElementById("gameCanvas");
  const startButton = document.getElementById("startButton");
  const scoreNode = document.getElementById("score");
  const context = canvas.getContext("2d");
  const grid = 20;
  let animationFrameId = 0;
  let tick = 0;
  let score = 0;
  let direction = "RIGHT";
  let snake = [];
  let food = { x: 0, y: 0 };
  let gameOver = true;

  function updateScore() {
    scoreNode.textContent = `Score: ${score}`;
  }

  function randomGridPosition(limit) {
    return Math.floor(Math.random() * limit) * grid;
  }

  function placeFood() {
    food = {
      x: randomGridPosition(canvas.width / grid),
      y: randomGridPosition(canvas.height / grid),
    };
  }

  function resetGame() {
    snake = [
      { x: grid * 5, y: grid * 5 },
      { x: grid * 4, y: grid * 5 },
      { x: grid * 3, y: grid * 5 },
    ];
    direction = "RIGHT";
    score = 0;
    tick = 0;
    gameOver = false;
    placeFood();
    updateScore();
  }

  function drawBoard() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#f7efff";
    context.shadowBlur = 18;
    context.shadowColor = "rgba(255, 255, 255, 0.4)";
    context.fillRect(food.x, food.y, grid, grid);

    snake.forEach((segment, index) => {
      context.fillStyle = index === 0 ? "#bb86ff" : "#6e38d9";
      context.shadowBlur = index === 0 ? 14 : 6;
      context.shadowColor = "rgba(187, 134, 255, 0.55)";
      context.fillRect(segment.x, segment.y, grid - 1, grid - 1);
    });

    context.shadowBlur = 0;
  }

  function endGame() {
    gameOver = true;
    startButton.textContent = "Restart game";
    startButton.disabled = false;
    cancelAnimationFrame(animationFrameId);
  }

  function moveSnake() {
    const head = { ...snake[0] };

    if (direction === "UP") head.y -= grid;
    if (direction === "DOWN") head.y += grid;
    if (direction === "LEFT") head.x -= grid;
    if (direction === "RIGHT") head.x += grid;

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      placeFood();
    } else {
      snake.pop();
    }
  }

  function hasCollision() {
    const [head, ...body] = snake;

    if (head.x < 0 || head.y < 0 || head.x >= canvas.width || head.y >= canvas.height) {
      return true;
    }

    return body.some((segment) => segment.x === head.x && segment.y === head.y);
  }

  function loop() {
    if (gameOver) return;

    animationFrameId = requestAnimationFrame(loop);
    tick += 1;
    if (tick < 5) return;

    tick = 0;
    moveSnake();
    if (hasCollision()) {
      endGame();
      return;
    }

    drawBoard();
    updateScore();
  }

  startButton?.addEventListener("click", () => {
    resetGame();
    startButton.textContent = "Game running";
    startButton.disabled = true;
    drawBoard();
    loop();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
    if (event.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
    if (event.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
    if (event.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
  });

  const contactForm = document.getElementById("contactForm");
  const formResponse = document.getElementById("formResponse");
  contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    formResponse?.classList.remove("is-hidden");
    contactForm.reset();
  });

  const featherCanvas = document.getElementById("featherBg");
  const featherContext = featherCanvas.getContext("2d");
  const feathers = [];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const featherCount = reduceMotion ? 8 : 18;

  function resizeFeatherCanvas() {
    featherCanvas.width = window.innerWidth;
    featherCanvas.height = window.innerHeight;
  }

  function createFeather() {
    return {
      x: Math.random() * featherCanvas.width,
      y: Math.random() * featherCanvas.height,
      length: 110 + Math.random() * 170,
      width: 18 + Math.random() * 20,
      driftX: -0.25 + Math.random() * 0.5,
      driftY: 0.18 + Math.random() * 0.62,
      rotation: Math.random() * Math.PI,
      rotationSpeed: -0.002 + Math.random() * 0.004,
      alpha: 0.12 + Math.random() * 0.2,
      hueShift: Math.random() * 40,
    };
  }

  function seedFeathers() {
    feathers.length = 0;
    for (let index = 0; index < featherCount; index += 1) {
      feathers.push(createFeather());
    }
  }

  function drawFeather(feather) {
    featherContext.save();
    featherContext.translate(feather.x, feather.y);
    featherContext.rotate(feather.rotation);

    const gradient = featherContext.createLinearGradient(0, -feather.length / 2, 0, feather.length / 2);
    gradient.addColorStop(0, `hsla(${270 + feather.hueShift}, 100%, 85%, 0)`);
    gradient.addColorStop(0.35, `hsla(${275 + feather.hueShift}, 100%, 76%, ${feather.alpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    featherContext.strokeStyle = gradient;
    featherContext.lineWidth = 2;
    featherContext.beginPath();
    featherContext.moveTo(0, -feather.length / 2);
    featherContext.quadraticCurveTo(feather.width * 0.42, 0, 0, feather.length / 2);
    featherContext.stroke();

    featherContext.strokeStyle = `rgba(255, 255, 255, ${feather.alpha * 0.7})`;
    featherContext.lineWidth = 1;
    featherContext.beginPath();
    featherContext.moveTo(0, -feather.length / 2);
    featherContext.lineTo(0, feather.length / 2);
    featherContext.stroke();

    for (let offset = -feather.length / 2 + 10; offset < feather.length / 2; offset += 14) {
      const spread = feather.width * (1 - Math.abs(offset) / (feather.length / 2));

      featherContext.strokeStyle = `rgba(187, 134, 255, ${feather.alpha * 0.55})`;
      featherContext.beginPath();
      featherContext.moveTo(0, offset);
      featherContext.quadraticCurveTo(spread, offset + 5, spread * 0.3, offset + 12);
      featherContext.stroke();

      featherContext.beginPath();
      featherContext.moveTo(0, offset);
      featherContext.quadraticCurveTo(-spread, offset + 5, -spread * 0.3, offset + 12);
      featherContext.stroke();
    }

    featherContext.restore();
  }

  function animateFeathers() {
    featherContext.clearRect(0, 0, featherCanvas.width, featherCanvas.height);

    feathers.forEach((feather) => {
      feather.x += feather.driftX;
      feather.y += feather.driftY;
      feather.rotation += feather.rotationSpeed;

      if (feather.y - feather.length > featherCanvas.height) {
        feather.y = -feather.length;
        feather.x = Math.random() * featherCanvas.width;
      }

      if (feather.x < -feather.length) feather.x = featherCanvas.width + feather.length * 0.5;
      if (feather.x > featherCanvas.width + feather.length) feather.x = -feather.length * 0.5;

      drawFeather(feather);
    });

    if (!reduceMotion) requestAnimationFrame(animateFeathers);
  }

  window.addEventListener("resize", () => {
    resizeFeatherCanvas();
    seedFeathers();
  });

  resizeFeatherCanvas();
  seedFeathers();
  animateFeathers();
  renderReactionBoard();
  loadGuestbook();
  drawBoard();
})();
