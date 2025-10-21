(function () {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const STORAGE_KEY = "wc-affiliate-clicks";
  const DATASET_FLAG = "affiliateBound";
  const MAX_ENTRIES = 100;

  function readLog() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Affiliate click logging unavailable", error);
      return [];
    }
  }

  function writeLog(entries) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
    } catch (error) {
      console.warn("Affiliate click log persistence failed", error);
    }
  }

  function recordClick(url) {
    if (!url) return;
    const entries = readLog();
    entries.push({ url, ts: new Date().toISOString() });
    writeLog(entries);
  }

  function sendClickBeacon(payload) {
    // TODO: Wire up server-side tracking endpoint when ready.
    if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
      return;
    }
    const _body = JSON.stringify(payload);
    // navigator.sendBeacon("/api/track-click", _body);
  }

  function handleClick(event) {
    const link = event.currentTarget;
    if (!(link instanceof HTMLAnchorElement)) return;
    const url = link.href;

    recordClick(url);
    sendClickBeacon({ url, ts: new Date().toISOString() });
  }

  function bind(link) {
    if (!(link instanceof HTMLAnchorElement)) return;
    if (link.dataset[DATASET_FLAG] === "true") return;

    link.addEventListener("click", handleClick, { passive: true });
    link.dataset[DATASET_FLAG] = "true";
  }

  function scan() {
    const anchors = document.querySelectorAll('a[data-affiliate="true"]');
    anchors.forEach(bind);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const { addedNodes } = mutation;
      for (const node of addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches && node.matches('a[data-affiliate="true"]')) {
          bind(node);
        }
        node.querySelectorAll && node.querySelectorAll('a[data-affiliate="true"]').forEach(bind);
      }
    }
  });

  function init() {
    scan();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
