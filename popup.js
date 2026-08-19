async function refresh() {
  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  document.getElementById("used-label").textContent = `${state.usedMinutes} min`;
  document.getElementById("limit-label").textContent = `${state.limitMinutes} min`;
  document.getElementById("limit-input").value = state.limitMinutes;

  const pct = Math.min(100, Math.round((state.usedMinutes / state.limitMinutes) * 100));
  document.getElementById("progress-fill").style.width = `${pct}%`;
}

document.getElementById("save-btn").addEventListener("click", async () => {
  const val = parseInt(document.getElementById("limit-input").value, 10);
  if (!val || val < 1) return;
  await chrome.runtime.sendMessage({ type: "SET_LIMIT", limitMinutes: val });
  refresh();
});

document.getElementById("reset-btn").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "RESET_TODAY" });
  refresh();
});

refresh();
