export interface ThemeCacheRecord<T = unknown> {
  themes: T;
  fingerprint: string;
}

export function getThemeCacheState<T = unknown>(): ThemeCacheRecord<T> | null;
export function setThemeCacheState<T = unknown>(next: ThemeCacheRecord<T> | null): void;
export function resetThemeCache(): void;
