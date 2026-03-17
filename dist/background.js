// ── Context menu setup ─────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "jsoncraft-open",
    title: "Open in JSONcraft",
    contexts: ["selection"],
  });
});

// ── Extension icon click — open new tab ────────────────────
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "https://jsoncraft-red.vercel.app" });
});

// ── Context menu click ─────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "jsoncraft-open" && info.selectionText) {
    // Store selected text then open popup
    chrome.storage.local.set({ jsoncraft_inject: info.selectionText }, () => {
      chrome.action.openPopup().catch(() => {
        // Fallback — open in new tab if openPopup fails
        chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
      });
    });
  }
});

// ── Message from content script ───────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "JSONCRAFT_INJECT") {
    chrome.storage.local.set({ jsoncraft_inject: msg.data }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});