const THEME_CACHE_KEY = Symbol.for("witchclick.themeCache");

function readStore() {
  const existing = globalThis[THEME_CACHE_KEY];
  return typeof existing === "undefined" ? null : (existing ?? null);
}

/**
 * Retrieve the current theme cache state shared between Node and Astro runtimes.
 * @returns {unknown | null}
 */
export function getThemeCacheState() {
  const state = readStore();
  return state === undefined ? null : state;
}

/**
 * Persist a new theme cache payload so subsequent lookups can reuse it.
 * @param {unknown | null} next
 */
export function setThemeCacheState(next) {
  if (next === null || typeof next === "undefined") {
    delete globalThis[THEME_CACHE_KEY];
    return;
  }

  globalThis[THEME_CACHE_KEY] = next;
}

/**
 * Clears the shared theme cache payload.
 */
export function resetThemeCache() {
  setThemeCacheState(null);
}
