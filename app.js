(() => {
  const doses = {
    beginner: {
      squat: { value: "3 × 8–10", meta: "RPE 6–7 · Descanso 2 min" },
      rdl: { value: "2–3 × 10 /pierna", meta: "Apoyo / peso corporal" },
      combo: { value: "2 × 8 /pierna", meta: "Ejercicios separados" },
      copenhagen: { value: "3 × 12–15 s /lado", meta: "Palanca corta (rodilla)" },
      ankle: { value: "3 × 12", meta: "Peso corporal o carga ligera" },
    },
    intermediate: {
      squat: { value: "3–4 × 5–6", meta: "RPE 7–8 · Descanso 2–3 min" },
      rdl: { value: "3 × 8–10 /pierna", meta: "RPE 7 · Descanso 90 s" },
      combo: { value: "3 × 8 + 8 /pierna", meta: "Biserie · Descanso 2 min" },
      copenhagen: { value: "3 × 20–30 s /lado", meta: "Isométrico · Descanso 60 s" },
      ankle: { value: "3–4 × 12–15", meta: "Excéntrica 3 s · Descanso 60 s" },
    },
    advanced: {
      squat: { value: "4–5 × 3–5", meta: "RPE 8.5 · Pesado / velocidad" },
      rdl: { value: "4 × 6–8 /pierna", meta: "Carga excéntrica aumentada" },
      combo: { value: "4 × 10 + 10 /pierna", meta: "Con mancuernas" },
      copenhagen: { value: "3–4 × 30–45 s", meta: "Palanca larga + dinámico" },
      ankle: { value: "4 × 15–20", meta: "Sobrecarga progresiva" },
    },
  };

  const levelSelect = document.getElementById("runner-level");
  const navButtons = [...document.querySelectorAll("[data-nav]")];
  const sections = [...document.querySelectorAll("[data-exercise]")];

  function applyDoses(level) {
    const table = doses[level] || doses.intermediate;
    Object.entries(table).forEach(([key, dose]) => {
      const el = document.querySelector(`[data-dose="${key}"]`);
      if (!el) return;
      el.querySelector(".dose__value").textContent = dose.value;
      el.querySelector(".dose__meta").textContent = dose.meta;
    });
  }

  levelSelect?.addEventListener("change", () => applyDoses(levelSelect.value));
  applyDoses(levelSelect?.value || "intermediate");

  /* Active nav on scroll */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute("data-exercise");
        navButtons.forEach((btn) => {
          btn.classList.toggle("is-active", btn.getAttribute("data-nav") === id);
        });
      });
    },
    { rootMargin: "-40% 0px -50% 0px", threshold: 0.01 }
  );
  sections.forEach((section) => observer.observe(section));

  /* Rest timer */
  let timerSeconds = 90;
  let timerRunning = false;
  let timerInterval = null;
  const display = document.getElementById("timer-display");
  const toggleBtn = document.getElementById("timer-toggle");
  const resetBtn = document.getElementById("timer-reset");
  const presets = [...document.querySelectorAll(".chip-btn[data-seconds]")];

  function formatTime(total) {
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function renderTimer() {
    if (display) display.textContent = formatTime(timerSeconds);
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch (_) {
      /* ignore */
    }
  }

  function stopTimer(label = "Iniciar") {
    clearInterval(timerInterval);
    timerRunning = false;
    if (toggleBtn) toggleBtn.textContent = label;
  }

  function setTimer(seconds) {
    stopTimer();
    timerSeconds = seconds;
    renderTimer();
    presets.forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.seconds) === seconds);
    });
  }

  function toggleTimer() {
    if (timerRunning) {
      stopTimer("Continuar");
      return;
    }
    timerRunning = true;
    if (toggleBtn) toggleBtn.textContent = "Pausar";
    timerInterval = setInterval(() => {
      if (timerSeconds <= 0) {
        stopTimer("¡Listo!");
        playBeep();
        return;
      }
      timerSeconds -= 1;
      renderTimer();
    }, 1000);
  }

  presets.forEach((btn) => {
    btn.addEventListener("click", () => setTimer(Number(btn.dataset.seconds)));
  });
  toggleBtn?.addEventListener("click", toggleTimer);
  resetBtn?.addEventListener("click", () => setTimer(90));
  renderTimer();

  /* Session tracker */
  const boxes = [...document.querySelectorAll("#tracker-grid input[type='checkbox']")];
  const percentEl = document.getElementById("tracker-percent");
  const barEl = document.getElementById("tracker-bar");
  const trackerReset = document.getElementById("tracker-reset");

  function updateTracker() {
    const done = boxes.filter((b) => b.checked).length;
    const pct = boxes.length ? Math.round((done / boxes.length) * 100) : 0;
    if (percentEl) percentEl.textContent = `${pct}%`;
    if (barEl) barEl.style.width = `${pct}%`;
  }

  boxes.forEach((box) => box.addEventListener("change", updateTracker));
  trackerReset?.addEventListener("click", () => {
    boxes.forEach((box) => {
      box.checked = false;
    });
    updateTracker();
  });
  updateTracker();
})();
