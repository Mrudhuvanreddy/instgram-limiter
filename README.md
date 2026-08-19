# Instagram Time Limiter — Chrome Extension

A digital wellbeing Chrome extension that tracks real time spent on
instagram.com and enforces a daily usage budget. When the limit is hit,
a full-screen overlay blocks the page until the user completes a short
mindful-breathing task — which grants +5 minutes of extra time.

## Why this exists

Most "screen time" tools just show you a number at the end of the day.
This extension intervenes **in the moment**, forcing a pause before you
keep scrolling, instead of just reporting usage after the fact.

## Features

- Tracks time on instagram.com only while the tab is **active and the
  browser window is focused** (so background tabs don't count)
- Daily limit set by the user (in minutes) via the popup
- Automatically resets usage at midnight
- Full-screen blocking overlay with a 30-second guided breathing exercise
- Completing the breathing task grants +5 minutes; user can also just
  close the tab instead
- Live popup dashboard showing minutes used vs. limit with a progress bar

## Tech stack

- Chrome Extension Manifest V3
- `chrome.alarms` for periodic usage polling
- `chrome.storage.local` for persistence (per-device)
- `chrome.tabs` / `chrome.windows` APIs to detect active tab + window focus
- Vanilla JS content script for the overlay UI (no frameworks — keeps the
  extension lightweight and fast to load)

## How it works (architecture)

```
background.js (service worker)
  - runs a 1-minute alarm
  - checks if the focused window's active tab is instagram.com
  - if yes, increments usedMinutes in chrome.storage.local
  - checks the stored date vs. today; resets usage if the day changed
  - messages content scripts on instagram.com when state changes

content.js (runs on instagram.com)
  - asks background.js for current state on load
  - if usedMinutes >= limitMinutes, injects a full-screen overlay
  - overlay contains a 30s breathing exercise; completing it messages
    background.js to grant +5 minutes and removes the overlay

popup.html / popup.js
  - lets the user set their daily limit
  - shows today's usage with a progress bar
  - has a manual "reset today's usage" button for demo purposes
```

## Installation (for testing / demo)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this project folder (`instagram-limiter/`)
5. Click the extension icon in the toolbar to set your daily limit
   (default is 30 minutes)
6. Visit instagram.com and browse — the extension tracks time in the
   background. When you exceed your limit, the overlay appears
   automatically.

### For a fast demo

Set the limit to `1` minute in the popup, then use the popup's
**"Reset Today's Usage"** button to demonstrate resets, or just wait a
minute on instagram.com to see the overlay trigger live.

## Known limitations (worth mentioning in interviews/reports)

- Usage polling happens once per minute (Chrome's practical minimum for
  reliable repeating alarms in production), so tracking is accurate to
  within ~1 minute, not to the second
- Time is tracked per-browser-profile via `chrome.storage.local`, not
  synced across devices — could be extended with `chrome.storage.sync`
  or a backend (Node/Express + MongoDB) for cross-device tracking
- This only limits the **instagram.com website**, not the native mobile
  app — a true mobile-app blocker would require Android's
  `UsageStatsManager` API or iOS Screen Time API, which are outside the
  scope of a browser extension
- If the user opens Instagram in Incognito mode, the extension won't
  run there unless the user manually grants incognito access

## Possible extensions for a stronger resume/portfolio story

- Add a weekly usage chart (Chart.js) in the popup
- Let users pick which friction task they'd like (breathing, journal
  prompt, quiz) instead of a fixed one
- Sync settings across devices with a lightweight backend
- Add support for limiting multiple sites (YouTube, Twitter/X, etc.)
- Add a "streak" counter for days the user stayed under their limit
