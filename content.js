// content.js — shows a full-screen block overlay when the daily limit is exceeded

let overlayEl = null;
let breathingInterval = null;

function buildOverlay(usedMinutes, limitMinutes) {
  if (overlayEl) return;

  overlayEl = document.createElement("div");
  overlayEl.id = "ig-limiter-overlay";
  overlayEl.innerHTML = `
    <div class="ig-limiter-card">
      <div class="ig-limiter-icon">⏳</div>
      <h1>You've reached your Instagram limit</h1>
      <p class="ig-limiter-sub">You used <strong>${usedMinutes} min</strong> of your <strong>${limitMinutes} min</strong> daily budget.</p>

      <div class="ig-limiter-task">
        <p class="ig-limiter-task-label">Take a mindful breath before deciding to continue.</p>
        <div class="ig-limiter-breath-circle" id="ig-breath-circle">Breathe</div>
        <p class="ig-limiter-timer" id="ig-breath-timer">30s</p>
      </div>

      <button id="ig-limiter-unlock-btn" disabled>Complete the breathing exercise to unlock +3 wh min</button>
      <button id="ig-limiter-leave-btn">Close Instagram instead</button>
    </div>
  `;
  document.documentElement.appendChild(overlayEl);
  document.body.style.overflow = "hidden";

  startBreathingTask();

  document.getElementById("ig-limiter-leave-btn").addEventListener("click", () => {
    window.location.href = "https://www.google.com";
  });

  document.getElementById("ig-limiter-unlock-btn").addEventListener("click", async () => {
    const btn = document.getElementById("ig-limiter-unlock-btn");
    if (btn.disabled) return;
    await chrome.runtime.sendMessage({ type: "GRANT_EXTRA_TIME" });
    removeOverlay();
  });
}

function startBreathingTask() {
  let secondsLeft = 30;
  const circle = document.getElementById("ig-breath-circle");
  const timerEl = document.getElementById("ig-breath-timer");
  const unlockBtn = document.getElementById("ig-limiter-unlock-btn");

  breathingInterval = setInterval(() => {
    secondsLeft -= 1;
    if (timerEl) timerEl.textContent = `${secondsLeft}s`;

    // Alternate breathe in / out every 4 seconds for a calming visual cue
    if (circle) {
      const phase = Math.floor((30 - secondsLeft) / 4) % 2;
      circle.textContent = phase === 0 ? "Breathe In" : "Breathe Out";
      circle.classList.toggle("ig-breath-expand", phase === 0);
    }

    if (secondsLeft <= 0) {
      clearInterval(breathingInterval);
      if (timerEl) timerEl.textContent = "Done";
      if (circle) circle.textContent = "✓";
      if (unlockBtn) {
        unlockBtn.disabled = false;
        unlockBtn.textContent = "Unlock +5 minutes";
      }
    }
  }, 1000);
}

function removeOverlay() {
  if (breathingInterval) clearInterval(breathingInterval);
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
  document.body.style.overflow = "";
}

async function checkAndRender() {
  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  if (!state) return;

  const now = Date.now();
  const withinGrace = state.unlockedUntil && now < state.unlockedUntil;

  if (state.usedMinutes >= state.limitMinutes && !withinGrace) {
    buildOverlay(state.usedMinutes, state.limitMinutes);
  } else {
    removeOverlay();
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "IG_LIMITER_STATE_UPDATED") {
    checkAndRender();
  }
});

// Initial check + periodic re-check in case the tab stays open across the limit
checkAndRender();
setInterval(checkAndRender, 15000);
