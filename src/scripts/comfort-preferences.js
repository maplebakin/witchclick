const STORAGE_KEY = 'witchclick-comfort';
const LEGACY_KEYS = ['comfort-preferences'];

const defaults = { theme: 'midnight', font: 'serif' };

const listeners = new Set();
let current = { ...defaults };
let initialized = false;

function migrateLegacyStorage() {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
    for (const legacyKey of LEGACY_KEYS) {
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue) {
        localStorage.setItem(STORAGE_KEY, legacyValue);
        localStorage.removeItem(legacyKey);
        break;
      }
    }
  } catch {
    /* no-op */
  }
}

function parsePreferences(raw) {
  const base = { ...defaults };

  if (typeof raw !== 'object' || !raw) {
    return base;
  }

  const record = raw;
  const theme = record.theme === 'dawn' ? 'dawn' : undefined;
  const font = record.font === 'sans' ? 'sans' : undefined;

  return {
    theme: theme ?? base.theme,
    font: font ?? base.font,
  };
}

function readPreferences() {
  migrateLegacyStorage();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...defaults };
    }
    const parsed = JSON.parse(stored);
    return parsePreferences(parsed);
  } catch {
    return { ...defaults };
  }
}

function persistPreferences(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* no-op */
  }
}

function applyToDom(prefs) {
  const root = document.documentElement;
  const body = document.body;
  if (!root) return;
  const midnightSlug = root.getAttribute('data-theme-midnight');
  const dawnSlug = root.getAttribute('data-theme-dawn');
  const setThemeSlug = (slug) => {
    if (!slug) return;
    root.setAttribute('data-theme', slug);
    if (body) {
      body.setAttribute('data-theme', slug);
    }
  };

  if (prefs.theme === 'dawn') {
    root.setAttribute('data-comfort-theme', 'dawn');
    body?.setAttribute('data-comfort-theme', 'dawn');
    setThemeSlug(dawnSlug);
  } else {
    root.removeAttribute('data-comfort-theme');
    body?.removeAttribute('data-comfort-theme');
    setThemeSlug(midnightSlug);
  }

  if (prefs.font === 'sans') {
    root.setAttribute('data-comfort-font', 'sans');
    body?.setAttribute('data-comfort-font', 'sans');
  } else {
    root.removeAttribute('data-comfort-font');
    body?.removeAttribute('data-comfort-font');
  }
}

function notify() {
  for (const listener of listeners) {
    try {
      listener({ ...current });
    } catch {
      /* no-op */
    }
  }
}

function setPreferences(partial) {
  const next = {
    theme:
      partial.theme === 'dawn'
        ? 'dawn'
        : partial.theme === 'midnight'
          ? 'midnight'
          : current.theme,
    font:
      partial.font === 'sans'
        ? 'sans'
        : partial.font === 'serif'
          ? 'serif'
          : current.font,
  };

  current = next;
  applyToDom(current);
  persistPreferences(current);
  notify();
}

function subscribe(listener) {
  listeners.add(listener);
  listener({ ...current });
  return () => {
    listeners.delete(listener);
  };
}

function init() {
  if (initialized) return;
  initialized = true;
  current = readPreferences();
  applyToDom(current);
  window.addEventListener('storage', (event) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    current = readPreferences();
    applyToDom(current);
    notify();
  });
}

if (typeof window !== 'undefined') {
  init();
  window.__wcComfort = window.__wcComfort ?? {
    storageKey: STORAGE_KEY,
    get: () => ({ ...current }),
    set: setPreferences,
    subscribe,
    apply: applyToDom,
  };
}

export {};
