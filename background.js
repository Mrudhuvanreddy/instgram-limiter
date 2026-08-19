// background.js — tracks time spent on instagram.com and resets daily at midnight

const ALARM_TICK = "ig-limiter-tick";      // fires every 1 minute to add usage
const ALARM_MIDNIGHT = "ig-limiter-midnight-check";

const DEFAULT_LIMIT_MINUTES = 30;
const EXTRA_GRANT_MINUTES = 2;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function getState() {
  const data = await chrome.storage.local.get([
    "limitMinutes",
    "usedMinutes",
    "date",
    "unlockedUntil" // timestamp; if now < unlockedUntil, block is temporarily lifted
  ]);

  const today = todayKey();
  if (data.date !== today) {
    // New day: reset usage
    const fresh = {
      limitMinutes: data.limitMinutes ?? DEFAULT_LIMIT_MINUTES,
      usedMinutes: 0,
      date: today,
      unlockedUntil: 0
    };
    await chrome.storage.local.set(fresh);
    return fresh;
  }

  return {
    limitMinutes: data.limitMinutes ?? DEFAULT_LIMIT_MINUTES,
    usedMinutes: data.usedMinutes ?? 0,
    date: data.date,
    unlockedUntil: data.unlockedUntil ?? 0
  };
}

async function isInstagramActiveAndFocused() {
  const windows = await chrome.windows.getAll({ populate: true });
  for (const win of windows) {
    if (!win.focused) continue;
    const activeTab = win.tabs.find((t) => t.active);
    if (activeTab && activeTab.url && activeTab.url.includes("instagram.com")) {
      return true;
    }
  }
  return false;
}

async function tick() {
  const state = await getState();
  const active = await isInstagramActiveAndFocused();
  if (!active) return;

  state.usedMinutes += 1;
  await chrome.storage.local.set({ usedMinutes: state.usedMinutes });

  // Notify any open instagram tabs so the overlay can update immediately
  const tabs = await chrome.tabs.query({ url: "*://*.instagram.com/*" });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: "IG_LIMITER_STATE_UPDATED" }).catch(() => {});
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await getState();
  chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
  chrome.alarms.create(ALARM_MIDNIGHT, { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(async () => {
  await getState();
  chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
  chrome.alarms.create(ALARM_MIDNIGHT, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_TICK) {
    await tick();
  } else if (alarm.name === ALARM_MIDNIGHT) {
    await getState(); // getState() itself performs the midnight reset check
  }
});

// Messages from content script / popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "GET_STATE") {
      const state = await getState();
      sendResponse(state);
    } else if (message.type === "SET_LIMIT") {
      await chrome.storage.local.set({ limitMinutes: message.limitMinutes });
      sendResponse({ ok: true });
    } else if (message.type === "GRANT_EXTRA_TIME") {
      // Friction task completed — reduce effective used time by EXTRA_GRANT_MINUTE
      const unlockedUntil = Date.now() + EXTRA_GRANT_MINUTES * 60 * 1000;
      await chrome.storage.local.set({ unlockedUntil });
      sendResponse({ ok: true, unlockedUntil });
    } else if (message.type === "RESET_TODAY") {
      await chrome.storage.local.set({ usedMinutes: 0 });
      sendResponse({ ok: true });
    }
  })();
  return true; // keep sendResponse alive for async work
});
