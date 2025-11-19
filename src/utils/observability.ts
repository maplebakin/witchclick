import type { ObservabilityEnvironment } from "./settings";

const MAX_CONSOLE_BREADCRUMBS = 200;
const MAX_NETWORK_ERRORS = 50;
const COPY_BUTTON_RESET_MS = 2500;

export type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

type BrowserEnv = ObservabilityEnvironment | string;

export interface ObservabilityInitOptions {
  enabled: boolean;
  dsn?: string | null;
  environment?: BrowserEnv | null;
  clientErrorEndpoint?: string | null;
  debug: boolean;
  siteEnvironment: BrowserEnv;
  featureFlags?: Record<string, boolean>;
}

export interface ReportContext {
  source?: string;
  details?: Record<string, unknown>;
}

interface ConsoleBreadcrumb {
  id: number;
  timestamp: number;
  level: ConsoleLevel;
  message: string;
  args: string[];
}

interface NetworkLogEntry {
  id: number;
  timestamp: number;
  url: string;
  method: string;
  status?: number;
  ok: boolean;
  durationMs: number;
  error?: string;
}

interface ObservabilitySnapshot {
  console: ConsoleBreadcrumb[];
  network: NetworkLogEntry[];
}

interface BugReportPayload {
  message: string;
  name?: string;
  stack?: string;
  source: string;
  timestamp: string;
  href: string;
  userAgent: string;
  environment: BrowserEnv;
  featureFlags: Record<string, boolean>;
  console: ConsoleBreadcrumb[];
  network: NetworkLogEntry[];
  details?: Record<string, unknown>;
}

type SentryModule = typeof import("@sentry/browser");

type Observer = (snapshot: ObservabilitySnapshot) => void;

type HeadersInitInput = RequestInit["headers"];

class RingBuffer<T> {
  #limit: number;
  #values: T[] = [];

  constructor(limit: number) {
    this.#limit = limit;
  }

  push(value: T) {
    this.#values.push(value);
    if (this.#values.length > this.#limit) {
      this.#values.shift();
    }
  }

  toArray(): T[] {
    return [...this.#values];
  }
}

let initialized = false;
let runtimeOptions: (ObservabilityInitOptions & { featureFlags: Record<string, boolean> }) | null = null;
let sentryModule: SentryModule | null = null;
let sentryPromise: Promise<SentryModule | null> | null = null;
let nativeFetch: typeof window.fetch | null = null;
let fetchWrapped = false;
let bannerElement: HTMLDivElement | null = null;
let bannerCopyButton: HTMLButtonElement | null = null;
let bannerCloseButton: HTMLButtonElement | null = null;
let bannerReportText = "";
let bannerResetTimer: number | null = null;
let debugPanelElements: {
  container: HTMLDivElement;
  consoleList: HTMLOListElement;
  networkList: HTMLOListElement;
  routeValue: HTMLElement;
  envValue: HTMLElement;
  statusValue: HTMLElement;
  downloadButton: HTMLButtonElement;
} | null = null;
let lastErrorPayload: BugReportPayload | null = null;
let consoleId = 0;
let networkId = 0;
const consoleBuffer = new RingBuffer<ConsoleBreadcrumb>(MAX_CONSOLE_BREADCRUMBS);
const networkBuffer = new RingBuffer<NetworkLogEntry>(MAX_NETWORK_ERRORS);
const observers = new Set<Observer>();
const seenErrors = typeof WeakSet !== "undefined" ? new WeakSet<Error>() : null;

export function initObservability(options: ObservabilityInitOptions): void {
  if (typeof window === "undefined") return;
  if (initialized) return;
  initialized = true;

  runtimeOptions = {
    ...options,
    featureFlags: { ...options.featureFlags },
  };

  const shouldActivate = options.enabled || options.debug;
  if (!shouldActivate) {
    return;
  }

  setupConsoleCapture();
  setupFetchCapture();
  setupGlobalErrorHandlers();
  if (options.debug) {
    mountDebugPanel();
  }
  ensureSentryLoaded();
}

export function reportError(error: unknown, context: ReportContext = {}): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeError(error);
  if (normalized.error && seenErrors && seenErrors.has(normalized.error)) {
    return;
  }
  if (normalized.error && seenErrors) {
    seenErrors.add(normalized.error);
  }

  const details = sanitizeDetails(context.details ?? {});
  const payload = buildReportPayload({
    message: normalized.message,
    name: normalized.name,
    stack: normalized.stack,
    source: context.source ?? "client",
    details: Object.keys(details).length > 0 ? details : undefined,
  });

  lastErrorPayload = payload;
  bannerReportText = JSON.stringify(payload, null, 2);

  if (runtimeOptions?.debug) {
    showErrorBanner();
    updatePanelStatus(payload.timestamp);
  }

  withSentry((sdk) => {
    if (normalized.error) {
      sdk.captureException(normalized.error);
    } else {
      sdk.captureException(new Error(normalized.message));
    }
  });

  const shouldPost = shouldTransmit();
  if (shouldPost && runtimeOptions?.clientErrorEndpoint) {
    void postClientError(runtimeOptions.clientErrorEndpoint, payload).catch(() => {
      recordConsoleBreadcrumb("warn", ["Failed to report client error"], true);
    });
  }
}

function setupConsoleCapture() {
  const consoleMethods: ConsoleLevel[] = ["log", "info", "warn", "error", "debug"];
  const consoleRef = console as unknown as Record<ConsoleLevel, (...args: unknown[]) => void>;
  for (const level of consoleMethods) {
    const original = consoleRef[level]?.bind(console);
    if (!original) continue;
    consoleRef[level] = (...args: unknown[]) => {
      recordConsoleBreadcrumb(level, args);
      original(...args);
    };
  }
}

function recordConsoleBreadcrumb(level: ConsoleLevel, args: unknown[], internal = false) {
  const formattedArgs = args.map((value) => formatValue(value));
  const message = formattedArgs.join(" ");
  consoleBuffer.push({
    id: ++consoleId,
    timestamp: Date.now(),
    level,
    message,
    args: formattedArgs,
  });
  if (!internal) {
    withSentry((sdk) => {
      sdk.addBreadcrumb({
        category: "console",
        message: truncate(message, 800),
        level: mapToSentryLevel(level),
        data: { args: formattedArgs },
      });
    });
  }
  notifyObservers();
}

function setupFetchCapture() {
  if (fetchWrapped) return;
  if (typeof window.fetch !== "function") return;
  fetchWrapped = true;
  nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const { url, method } = normalizeRequest(input, init);
    const skipLogging = shouldSkipNetworkLogging(input, init);
    const started = Date.now();
    try {
      const response = await (nativeFetch as typeof window.fetch)(input as RequestInfo, init);
      if (!skipLogging && (!response.ok || response.status >= 400)) {
        recordNetworkEvent({
          url,
          method,
          status: response.status,
          ok: response.ok,
          durationMs: Date.now() - started,
        });
      }
      return response;
    } catch (networkError) {
      if (!skipLogging) {
        recordNetworkEvent({
          url,
          method,
          ok: false,
          durationMs: Date.now() - started,
          error: networkError instanceof Error ? networkError.message : String(networkError),
        });
      }
      throw networkError;
    }
  };
}

function recordNetworkEvent(entry: Omit<NetworkLogEntry, "id" | "timestamp">) {
  networkBuffer.push({
    id: ++networkId,
    timestamp: Date.now(),
    ...entry,
  });
  notifyObservers();
}

function setupGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    const err = event.error instanceof Error ? event.error : new Error(String(event.message ?? "Unknown error"));
    reportError(err, {
      source: "window.error",
      details: {
        filename: event.filename ?? null,
        lineno: event.lineno ?? null,
        colno: event.colno ?? null,
        message: event.message ?? null,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const err = reason instanceof Error ? reason : new Error(formatValue(reason));
    reportError(err, {
      source: "window.unhandledrejection",
    });
  });
}

function notifyObservers() {
  if (observers.size === 0) return;
  const snapshot = getSnapshot();
  for (const observer of observers) {
    observer(snapshot);
  }
}

function getSnapshot(): ObservabilitySnapshot {
  return {
    console: consoleBuffer.toArray(),
    network: networkBuffer.toArray(),
  };
}

function ensureSentryLoaded() {
  if (!runtimeOptions?.enabled) return;
  const dsn = runtimeOptions.dsn;
  if (!dsn) return;
  if (sentryPromise) return;
  sentryPromise = import("@sentry/browser")
    .then((sdk) => {
      sdk.init({
        dsn,
        environment: runtimeOptions?.environment ?? runtimeOptions?.siteEnvironment ?? "production",
        tracesSampleRate: 0,
      });
      sentryModule = sdk;
      for (const crumb of consoleBuffer.toArray()) {
        sdk.addBreadcrumb({
          category: "console",
          message: truncate(crumb.message, 800),
          level: mapToSentryLevel(crumb.level),
          data: { args: crumb.args },
        });
      }
      return sdk;
    })
    .catch((error) => {
      sentryModule = null;
      console.warn("[observability] Failed to initialise Sentry", error);
      return null;
    });
}

function withSentry(callback: (sdk: SentryModule) => void) {
  if (sentryModule) {
    callback(sentryModule);
    return;
  }
  if (sentryPromise) {
    void sentryPromise.then((sdk) => {
      if (sdk) callback(sdk);
    });
  }
}

type SentrySeverity = "fatal" | "error" | "warning" | "log" | "info" | "debug";

function mapToSentryLevel(level: ConsoleLevel): SentrySeverity {
  switch (level) {
    case "error":
      return "error";
    case "warn":
      return "warning";
    case "info":
      return "info";
    case "debug":
      return "debug";
    default:
      return "log";
  }
}

function mountDebugPanel() {
  if (debugPanelElements) return;
  const container = document.createElement("div");
  container.className = "wc-debug-panel";
  container.style.position = "fixed";
  container.style.bottom = "1rem";
  container.style.left = "1rem";
  container.style.zIndex = "2147483646";
  container.style.maxWidth = "20rem";
  container.style.fontFamily = "system-ui, sans-serif";
  container.style.fontSize = "12px";
  container.style.color = "#120725";

  const details = document.createElement("details");
  details.className = "wc-debug-panel__details";
  details.style.background = "rgba(244, 241, 255, 0.95)";
  details.style.border = "1px solid rgba(75, 42, 99, 0.4)";
  details.style.borderRadius = "0.75rem";
  details.style.padding = "0.5rem 0.75rem";
  details.style.boxShadow = "0 6px 16px rgba(18, 7, 37, 0.18)";

  const summary = document.createElement("summary");
  summary.textContent = "Debug Panel";
  summary.style.cursor = "pointer";
  summary.style.fontWeight = "600";
  summary.style.color = "#4b2a63";
  details.append(summary);

  const body = document.createElement("div");
  body.style.display = "grid";
  body.style.gap = "0.75rem";
  body.style.marginTop = "0.5rem";

  const envRow = document.createElement("div");
  envRow.innerHTML = `<strong>Env:</strong> <code style="word-break:break-word"></code>`;
  const envValue = envRow.querySelector("code") as HTMLElement;
  envValue.textContent = runtimeOptions?.environment ?? runtimeOptions?.siteEnvironment ?? "unknown";
  body.append(envRow);

  const routeRow = document.createElement("div");
  routeRow.innerHTML = `<strong>Route:</strong> <code style="word-break:break-word"></code>`;
  const routeValue = routeRow.querySelector("code") as HTMLElement;
  routeValue.textContent = `${window.location.pathname}${window.location.search}`;
  body.append(routeRow);

  const statusRow = document.createElement("div");
  statusRow.innerHTML = `<strong>Last error:</strong> <span>none</span>`;
  const statusValue = statusRow.querySelector("span") as HTMLElement;
  body.append(statusRow);

  const flagRow = document.createElement("div");
  flagRow.innerHTML = `<strong>Flags:</strong> <code style="word-break:break-word"></code>`;
  const flagValue = flagRow.querySelector("code") as HTMLElement;
  const flags = runtimeOptions?.featureFlags ?? {};
  flagValue.textContent = JSON.stringify(flags);
  body.append(flagRow);

  const consoleSection = document.createElement("div");
  const consoleTitle = document.createElement("strong");
  consoleTitle.textContent = "Console (20)";
  consoleSection.append(consoleTitle);
  const consoleList = document.createElement("ol");
  consoleList.start = 1;
  consoleList.style.margin = "0.25rem 0 0";
  consoleList.style.paddingLeft = "1.1rem";
  consoleList.style.maxHeight = "8rem";
  consoleList.style.overflowY = "auto";
  consoleSection.append(consoleList);
  body.append(consoleSection);

  const networkSection = document.createElement("div");
  const networkTitle = document.createElement("strong");
  networkTitle.textContent = "Network issues";
  networkSection.append(networkTitle);
  const networkList = document.createElement("ol");
  networkList.start = 1;
  networkList.style.margin = "0.25rem 0 0";
  networkList.style.paddingLeft = "1.1rem";
  networkList.style.maxHeight = "6rem";
  networkList.style.overflowY = "auto";
  networkSection.append(networkList);
  body.append(networkSection);

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.textContent = "Download bug report";
  downloadButton.style.alignSelf = "start";
  downloadButton.style.background = "#4b2a63";
  downloadButton.style.color = "#f4f1ff";
  downloadButton.style.border = "none";
  downloadButton.style.borderRadius = "999px";
  downloadButton.style.padding = "0.4rem 0.9rem";
  downloadButton.style.cursor = "pointer";
  downloadButton.style.fontWeight = "600";
  downloadButton.addEventListener("click", () => {
    const report = lastErrorPayload ?? buildReportPayload({ source: "manual" });
    const text = JSON.stringify(report, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `witchclick-bug-${Date.now()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  body.append(downloadButton);

  details.append(body);
  container.append(details);
  document.body.append(container);

  debugPanelElements = {
    container,
    consoleList,
    networkList,
    routeValue,
    envValue,
    statusValue,
    downloadButton,
  };

  observers.add(updateDebugPanel);
  updateDebugPanel(getSnapshot());

  window.addEventListener("popstate", () => updateRoute(routeValue));
}

function updateDebugPanel(snapshot: ObservabilitySnapshot) {
  if (!debugPanelElements) return;
  const latestConsole = snapshot.console.slice(-20);
  debugPanelElements.consoleList.replaceChildren(
    ...latestConsole.map((entry) => {
      const item = document.createElement("li");
      item.textContent = `${new Date(entry.timestamp).toLocaleTimeString()} [${entry.level}] ${entry.message}`;
      return item;
    }),
  );

  const networkIssues = snapshot.network;
  debugPanelElements.networkList.replaceChildren(
    ...networkIssues.map((entry) => {
      const item = document.createElement("li");
      const statusText = entry.status ? ` status ${entry.status}` : "";
      const errorText = entry.error ? ` — ${entry.error}` : "";
      item.textContent = `${new Date(entry.timestamp).toLocaleTimeString()} ${entry.method} ${entry.url}${statusText}${errorText}`;
      return item;
    }),
  );

  updateRoute(debugPanelElements.routeValue);
}

function updateRoute(routeValue: HTMLElement) {
  routeValue.textContent = `${window.location.pathname}${window.location.search}`;
}

function updatePanelStatus(timestamp: string) {
  if (!debugPanelElements) return;
  debugPanelElements.statusValue.textContent = timestamp;
}

function showErrorBanner() {
  if (!runtimeOptions?.debug) return;
  if (!bannerElement) {
    bannerElement = document.createElement("div");
    bannerElement.className = "wc-debug-banner";
    bannerElement.style.position = "fixed";
    bannerElement.style.bottom = "1rem";
    bannerElement.style.right = "1rem";
    bannerElement.style.zIndex = "2147483647";
    bannerElement.style.background = "rgba(18, 7, 37, 0.92)";
    bannerElement.style.color = "#f4f1ff";
    bannerElement.style.padding = "0.75rem 1rem";
    bannerElement.style.borderRadius = "0.75rem";
    bannerElement.style.boxShadow = "0 4px 16px rgba(18, 7, 37, 0.22)";
    bannerElement.style.display = "flex";
    bannerElement.style.alignItems = "center";
    bannerElement.style.gap = "0.75rem";

    const textSpan = document.createElement("span");
    textSpan.textContent = "A client error occurred — copied to logs";
    textSpan.style.fontWeight = "600";
    bannerElement.append(textSpan);

    bannerCopyButton = document.createElement("button");
    bannerCopyButton.type = "button";
    bannerCopyButton.textContent = "Copy report";
    bannerCopyButton.style.background = "#f4f1ff";
    bannerCopyButton.style.color = "#120725";
    bannerCopyButton.style.border = "none";
    bannerCopyButton.style.borderRadius = "999px";
    bannerCopyButton.style.padding = "0.35rem 0.9rem";
    bannerCopyButton.style.cursor = "pointer";
    bannerCopyButton.style.fontWeight = "600";
    bannerCopyButton.addEventListener("click", () => {
      copyReportToClipboard();
    });
    bannerElement.append(bannerCopyButton);

    bannerCloseButton = document.createElement("button");
    bannerCloseButton.type = "button";
    bannerCloseButton.textContent = "Dismiss";
    bannerCloseButton.style.background = "transparent";
    bannerCloseButton.style.border = "none";
    bannerCloseButton.style.color = "#f4f1ff";
    bannerCloseButton.style.cursor = "pointer";
    bannerCloseButton.style.fontWeight = "600";
    bannerCloseButton.addEventListener("click", () => {
      hideBanner();
    });
    bannerElement.append(bannerCloseButton);

    document.body.append(bannerElement);
  }

  bannerElement.style.display = "flex";
  if (bannerCopyButton) {
    bannerCopyButton.textContent = "Copy report";
    bannerCopyButton.disabled = false;
  }

  if (bannerResetTimer) {
    window.clearTimeout(bannerResetTimer);
  }
  bannerResetTimer = window.setTimeout(() => {
    hideBanner();
  }, 10000);
}

function copyReportToClipboard() {
  if (!bannerReportText) return;
  const attemptClipboard = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(bannerReportText);
        return true;
      }
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.write === "function" &&
        typeof ClipboardItem !== "undefined"
      ) {
        const blob = new Blob([bannerReportText], { type: "text/plain" });
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
        return true;
      }
    } catch {
      // fall through to manual copy prompt
    }
    return false;
  };

  const showManualCopyPrompt = () => {
    const textarea = document.createElement("textarea");
    textarea.value = bannerReportText;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    textarea.style.top = "0";
    textarea.style.left = "0";
    document.body.append(textarea);
    textarea.focus();
    textarea.select();
    if (bannerCopyButton) {
      bannerCopyButton.textContent = "Press ⌘/Ctrl+C";
      bannerCopyButton.disabled = false;
    }
    window.setTimeout(() => {
      textarea.remove();
      if (bannerCopyButton) {
        bannerCopyButton.textContent = "Copy report";
      }
    }, COPY_BUTTON_RESET_MS);
  };

  void attemptClipboard().then((copied) => {
    if (!copied) {
      showManualCopyPrompt();
      return;
    }
    if (bannerCopyButton) {
      bannerCopyButton.textContent = "Copied";
      bannerCopyButton.disabled = false;
      window.setTimeout(() => {
        if (bannerCopyButton) {
          bannerCopyButton.textContent = "Copy report";
        }
      }, COPY_BUTTON_RESET_MS);
    }
  });
}

function hideBanner() {
  if (!bannerElement) return;
  bannerElement.style.display = "none";
}

function shouldTransmit(): boolean {
  if (!runtimeOptions?.enabled) return false;
  const env = runtimeOptions.environment ?? runtimeOptions.siteEnvironment;
  return env === "production";
}

async function postClientError(endpoint: string, payload: BugReportPayload) {
  const fetchImpl = nativeFetch ?? window.fetch.bind(window);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-observability-skip": "1",
  };
  await fetchImpl(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: "omit",
  });
}

function normalizeRequest(input: RequestInfo | URL, init?: RequestInit): { url: string; method: string } {
  let url = "";
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input && typeof input === "object" && "url" in input) {
    url = String((input as Request).url ?? "");
  }

  const method = (init?.method ?? (input instanceof Request ? input.method : "GET") ?? "GET").toUpperCase();
  return { url, method };
}

function shouldSkipNetworkLogging(input: RequestInfo | URL, init?: RequestInit): boolean {
  const headerName = "x-observability-skip";
  if (init?.headers && hasSkipHeader(init.headers, headerName)) return true;
  if (input instanceof Request && hasSkipHeader(input.headers, headerName)) return true;
  return false;
}

function hasSkipHeader(headers: HeadersInitInput, name: string): boolean {
  if (!headers) return false;
  const lower = name.toLowerCase();
  if (headers instanceof Headers) {
    return headers.get(lower) === "1";
  }
  if (Array.isArray(headers)) {
    return headers.some(([key, value]) => key.toLowerCase() === lower && value === "1");
  }
  return Object.entries(headers as Record<string, string>).some(
    ([key, value]) => key.toLowerCase() === lower && value === "1",
  );
}

function normalizeError(error: unknown): { error: Error | null; message: string; name?: string; stack?: string } {
  if (error instanceof Error) {
    return {
      error,
      message: error.message || error.name || "Unknown error",
      name: error.name,
      stack: error.stack ?? undefined,
    };
  }
  if (typeof error === "string") {
    return { error: null, message: error };
  }
  if (typeof error === "object" && error) {
    return {
      error: null,
      message: formatValue(error),
    };
  }
  return { error: null, message: String(error) };
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return JSON.stringify(value);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  try {
    return JSON.stringify(toSerializable(value), null, 2);
  } catch {
    return String(value);
  }
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function toSerializable(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item, depth + 1));
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toSerializable(val, depth + 1);
    }
    return result;
  }
  return String(value);
}

function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    out[key] = toSerializable(value);
  }
  return out;
}

function buildReportPayload(partial: Partial<BugReportPayload>): BugReportPayload {
  const environment = runtimeOptions?.environment ?? runtimeOptions?.siteEnvironment ?? "production";
  const timestamp = new Date().toISOString();
  const featureFlags = runtimeOptions?.featureFlags ?? {};
  return {
    message: partial.message ?? "Unknown error",
    name: partial.name,
    stack: partial.stack,
    source: partial.source ?? "manual",
    timestamp,
    href: window.location.href,
    userAgent: navigator.userAgent,
    environment,
    featureFlags: { ...featureFlags },
    console: consoleBuffer.toArray(),
    network: networkBuffer.toArray(),
    details: partial.details,
  };
}

// Ensure the module can be tree-shaken when not used
export default {
  initObservability,
  reportError,
};
