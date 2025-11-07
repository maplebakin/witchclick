import { ThemeEditor } from "@/lib/theme-editor";
import { THEME_SCOPES } from "@/lib/theme-scopes";
import { ALL_COLOR_VARIABLES } from "@/lib/theme-editor-comprehensive";

type FontOption = {
  id: string;
  label: string;
  options: string[];
};

const SERIF_FONTS = [
  "Literata",
  "Cormorant Garamond",
  "Playfair Display",
  "EB Garamond",
  "Vollkorn",
  "Fraunces",
];

const SCRIPT_FONTS = [
  "Parisienne",
  "Dancing Script",
  "Great Vibes",
  "Satisfy",
  "Allura",
];

const SANS_FONTS = [
  "Work Sans",
  "Plus Jakarta Sans",
  "DM Sans",
  "Sora",
  "Open Sans",
];

const FONT_SELECTS: FontOption[] = [
  { id: "themeFontSerif", label: "Serif / Body", options: SERIF_FONTS },
  { id: "themeFontScript", label: "Script Accent", options: SCRIPT_FONTS },
  { id: "themeFontHeading", label: "Heading", options: [...SANS_FONTS, ...SERIF_FONTS] },
  { id: "themeFontAccent", label: "Accent", options: [...SCRIPT_FONTS, ...SANS_FONTS] },
];

const LEGACY_FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: "primary", label: "Primary", placeholder: "#6b21a8" },
  { key: "accent", label: "Accent", placeholder: "#d9b2c4" },
  { key: "background", label: "Background", placeholder: "#0f0820" },
  { key: "textPrimary", label: "Body Text", placeholder: "#fdfcfe" },
  { key: "textHeading", label: "Heading", placeholder: "#ffffff" },
  { key: "textMuted", label: "Muted", placeholder: "#d9b2c4" },
];

function toLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function createColorControl(key: string, label = toLabel(key)): HTMLElement {
  const wrapper = document.createElement("label");
  wrapper.className = "block text-xs font-medium uppercase tracking-wide text-body-muted";
  wrapper.innerHTML = `
    <span>${label}</span>
    <div class="mt-1 flex items-center gap-2">
      <input
        type="color"
        data-color-picker="${key}"
        class="h-9 w-12 cursor-pointer rounded border border-line-neutral"
      />
      <input
        type="text"
        data-color-input="${key}"
        placeholder="#000000"
        class="flex-1 rounded-lg border border-line-neutral px-3 py-2 font-mono text-xs"
      />
    </div>
  `;
  return wrapper;
}

function createLegacyControl(field: { key: string; label: string; placeholder: string }): HTMLElement {
  const wrapper = document.createElement("label");
  wrapper.className = "block text-xs font-medium uppercase tracking-wide text-body-muted";
  wrapper.innerHTML = `
    <span>${field.label}</span>
    <div class="mt-1 flex items-center gap-2">
      <input
        type="color"
        data-color-picker="${field.key}"
        class="h-9 w-12 cursor-pointer rounded border border-line-neutral"
      />
      <input
        type="text"
        data-color-input="${field.key}"
        placeholder="${field.placeholder}"
        class="flex-1 rounded-lg border border-line-neutral px-3 py-2 font-mono text-xs"
      />
    </div>
  `;
  return wrapper;
}

function populateScopeSelector(select: HTMLSelectElement): void {
  const globalOption = document.createElement("option");
  globalOption.value = "global";
  globalOption.textContent = "Global Theme";
  select.appendChild(globalOption);

  const pageGroup = document.createElement("optgroup");
  pageGroup.label = "Pages";
  THEME_SCOPES.filter((scope) => scope.id !== "global" && scope.category === "page").forEach((scope) => {
    const option = document.createElement("option");
    option.value = scope.id;
    option.textContent = scope.label;
    pageGroup.appendChild(option);
  });
  if (pageGroup.childElementCount > 0) {
    select.appendChild(pageGroup);
  }

  const componentGroup = document.createElement("optgroup");
  componentGroup.label = "Components";
  THEME_SCOPES.filter((scope) => scope.category === "component").forEach((scope) => {
    const option = document.createElement("option");
    option.value = scope.id;
    option.textContent = scope.label;
    componentGroup.appendChild(option);
  });
  if (componentGroup.childElementCount > 0) {
    select.appendChild(componentGroup);
  }
}

function buildFontSelects(container: HTMLElement): void {
  const grid = document.createElement("div");
  grid.className = "grid gap-3 sm:grid-cols-2";

  FONT_SELECTS.forEach(({ id, label, options }) => {
    const wrapper = document.createElement("label");
    wrapper.className = "block text-xs font-medium uppercase tracking-wide text-body-muted";
    const select = document.createElement("select");
    select.id = id;
    select.className = "mt-1 w-full rounded-lg border border-line-neutral bg-surface-base px-3 py-2 text-sm";
    options.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      select.appendChild(option);
    });
    wrapper.appendChild(document.createTextNode(label));
    wrapper.appendChild(select);
    grid.appendChild(wrapper);
  });

  container.appendChild(grid);
}

function buildLegacyPalette(container: HTMLElement): void {
  const grid = document.createElement("div");
  grid.className = "grid gap-3 sm:grid-cols-2";
  LEGACY_FIELDS.forEach((field) => {
    grid.appendChild(createLegacyControl(field));
  });
  container.appendChild(grid);
}

function buildComprehensiveControls(container: HTMLElement): void {
  const details = document.createElement("details");
  details.className = "space-y-4 rounded-2xl border border-line-subtle bg-surface-base p-4 shadow-sm";
  details.setAttribute("open", "");

  const summary = document.createElement("summary");
  summary.className = "cursor-pointer text-sm font-semibold";
  summary.textContent = "Advanced Theme Variables";
  details.appendChild(summary);

  const description = document.createElement("p");
  description.className = "text-xs text-body-muted";
  description.textContent = "Fine tune surfaces, accents, and component-specific tokens.";
  details.appendChild(description);

  const grid = document.createElement("div");
  grid.className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
  ALL_COLOR_VARIABLES.forEach((key) => {
    grid.appendChild(createColorControl(key));
  });
  details.appendChild(grid);

  const scopeDetails = document.createElement("details");
  scopeDetails.className = "rounded-xl border border-dashed border-line-subtle bg-surface-base/60 p-4";
  scopeDetails.dataset.scopeSection = "grimoire";
  const scopeSummary = document.createElement("summary");
  scopeSummary.className = "cursor-pointer text-sm font-semibold";
  scopeSummary.textContent = "Entity Grimoire overrides";
  scopeDetails.appendChild(scopeSummary);

  const scopeCopy = document.createElement("p");
  scopeCopy.className = "mt-2 text-xs text-body-muted";
  scopeCopy.textContent = "When editing the grimoire scope, adjust entity card tokens here.";
  scopeDetails.appendChild(scopeCopy);

  details.appendChild(scopeDetails);

  container.appendChild(details);
}

function buildPreviewSection(container: HTMLElement): void {
  const previewCard = document.createElement("section");
  previewCard.className = "space-y-4 rounded-2xl border border-line-subtle bg-surface-base p-4 shadow-sm";

  const heading = document.createElement("div");
  heading.className = "flex items-center justify-between";
  heading.innerHTML = `
    <h2 class="text-lg font-semibold">Live Preview</h2>
    <span class="text-xs text-body-muted">Updates as you edit colors and fonts</span>
  `;
  previewCard.appendChild(heading);

  const preview = document.createElement("div");
  preview.dataset.themePreview = "";
  preview.className = "space-y-4 rounded-xl border border-line-neutral bg-surface-muted p-4";
  preview.innerHTML = `
    <div class="space-y-2" style="color: var(--preview-text)">
      <h3 class="text-lg font-semibold" style="color: var(--preview-text-heading)">Preview Heading</h3>
      <p class="text-sm">Colors, typography, and surfaces refresh in real-time.</p>
    </div>
    <div class="grid gap-3 md:grid-cols-3">
      <div class="space-y-2 rounded-xl border p-3" style="background: var(--preview-surface); border-color: var(--preview-border)">
        <span class="text-xs font-semibold uppercase tracking-wide" style="color: var(--preview-muted)">Card</span>
        <p class="text-sm" style="color: var(--preview-text)">Surface tokens drive cards, alerts, and chrome.</p>
      </div>
      <div class="space-y-2 rounded-xl border p-3" style="background: var(--preview-surface); border-color: var(--preview-border)">
        <span class="text-xs font-semibold uppercase tracking-wide" style="color: var(--preview-muted)">Buttons</span>
        <button class="rounded-lg px-3 py-2 text-sm font-semibold text-white" style="background: var(--preview-primary)">Primary</button>
        <button class="rounded-lg border px-3 py-2 text-sm" style="border-color: var(--preview-accent); color: var(--preview-accent)">Ghost</button>
      </div>
      <div class="space-y-2 rounded-xl border p-3" style="background: var(--preview-surface); border-color: var(--preview-border)">
        <span class="text-xs font-semibold uppercase tracking-wide" style="color: var(--preview-muted)">Tags</span>
        <div class="flex flex-wrap gap-2">
          <span class="rounded-full border px-3 py-1 text-xs" style="border-color: var(--preview-accent); color: var(--preview-accent)">Focus</span>
          <span class="rounded-full border px-3 py-1 text-xs" style="border-color: var(--preview-primary); color: var(--preview-primary)">Cozy</span>
        </div>
      </div>
    </div>
  `;
  previewCard.appendChild(preview);

  const contrast = document.createElement("div");
  contrast.dataset.contrastDisplay = "";
  contrast.className = "rounded-xl border border-dashed border-line-subtle bg-surface-base/60 p-3 text-xs text-body-muted";
  previewCard.appendChild(contrast);

  container.appendChild(previewCard);
}

function buildEditorShell(root: HTMLElement): void {
  root.innerHTML = "";

  const container = document.createElement("div");
  container.className = "space-y-6";
  root.appendChild(container);

  const header = document.createElement("section");
  header.className = "space-y-3 rounded-2xl border border-line-subtle bg-surface-base p-4 shadow-sm";
  header.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="space-y-1">
        <h1 class="text-xl font-semibold">Theme Editor</h1>
        <p class="text-xs text-body-muted">Manage midnight and dawn palettes from the dev API.</p>
        <div data-breadcrumbs class="text-[11px] uppercase tracking-wide text-body-muted">Theme</div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button id="undoBtn" type="button" class="rounded-lg border border-line-neutral px-3 py-1.5 text-sm">Undo</button>
        <button id="redoBtn" type="button" class="rounded-lg border border-line-neutral px-3 py-1.5 text-sm">Redo</button>
        <button id="exportBtn" type="button" class="rounded-lg border border-line-neutral px-3 py-1.5 text-sm">Export</button>
        <button id="exportAllBtn" type="button" class="rounded-lg border border-line-neutral px-3 py-1.5 text-sm">Export all</button>
        <button id="importBtn" type="button" class="rounded-lg border border-line-neutral px-3 py-1.5 text-sm">Import JSON</button>
        <input id="importInput" type="file" accept="application/json" hidden />
      </div>
    </div>
    <div data-status class="text-sm text-body-muted"></div>
  `;
  container.appendChild(header);

  const layout = document.createElement("div");
  layout.className = "grid gap-6 lg:grid-cols-12";
  container.appendChild(layout);

  const library = document.createElement("section");
  library.className = "space-y-4 rounded-2xl border border-line-subtle bg-surface-base p-4 shadow-sm lg:col-span-4";
  library.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-lg font-semibold">Theme Library</h2>
      <div class="flex flex-wrap gap-2">
        <button type="button" data-new-theme="midnight" class="rounded-lg border border-line-neutral px-3 py-1 text-xs font-semibold">New Midnight</button>
        <button type="button" data-new-theme="dawn" class="rounded-lg border border-line-neutral px-3 py-1 text-xs font-semibold">New Dawn</button>
      </div>
    </div>
    <label class="block text-xs font-medium uppercase tracking-wide text-body-muted">
      <span>Filter by category</span>
      <select id="categoryFilter" class="mt-1 w-full rounded-lg border border-line-neutral bg-surface-base px-3 py-2 text-sm">
        <option value="">All themes</option>
        <option value="brand">Brand</option>
        <option value="seasonal">Seasonal</option>
        <option value="experimental">Experimental</option>
        <option value="custom">Custom</option>
      </select>
    </label>
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-body-muted">
          <span>Midnight</span>
          <span data-active="midnight" class="text-xs font-medium text-body"></span>
        </div>
        <div data-theme-list="midnight" class="mt-2 space-y-2"></div>
      </div>
      <div>
        <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-body-muted">
          <span>Dawn</span>
          <span data-active="dawn" class="text-xs font-medium text-body"></span>
        </div>
        <div data-theme-list="dawn" class="mt-2 space-y-2"></div>
      </div>
    </div>
    <div class="flex flex-wrap gap-2 border-t border-line-subtle pt-4">
      <button id="duplicateThemeBtn" type="button" class="rounded-lg border border-line-neutral px-3 py-1.5 text-sm">Duplicate</button>
      <button id="deleteThemeBtn" type="button" class="rounded-lg border border-line-neutral px-3 py-1.5 text-sm text-danger">Delete</button>
    </div>
  `;
  layout.appendChild(library);

  const editorColumn = document.createElement("div");
  editorColumn.className = "space-y-4 lg:col-span-8";
  layout.appendChild(editorColumn);

  const detailsCard = document.createElement("section");
  detailsCard.className = "space-y-4 rounded-2xl border border-line-subtle bg-surface-base p-4 shadow-sm";
  detailsCard.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">Theme details</h2>
        <p class="text-xs text-body-muted">Set the basics before fine-tuning tokens.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button id="saveThemeBtn" type="button" class="rounded-lg bg-surface-accent-bolder px-4 py-2 text-sm font-semibold text-inverse hover:bg-surface-accent-deep">Save theme</button>
        <button id="setActiveThemeBtn" type="button" class="rounded-lg border border-line-neutral px-4 py-2 text-sm font-medium text-primary hover:bg-surface-soft">Set active</button>
      </div>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <label class="block text-xs font-medium uppercase tracking-wide text-body-muted">
        <span>Theme mode</span>
        <select id="themeMode" class="mt-1 w-full rounded-lg border border-line-neutral bg-surface-base px-3 py-2 text-sm">
          <option value="midnight">Midnight (dark)</option>
          <option value="dawn">Dawn (light)</option>
        </select>
      </label>
      <label class="block text-xs font-medium uppercase tracking-wide text-body-muted">
        <span>Category</span>
        <select id="themeCategory" class="mt-1 w-full rounded-lg border border-line-neutral bg-surface-base px-3 py-2 text-sm">
          <option value="brand">Brand</option>
          <option value="seasonal">Seasonal</option>
          <option value="experimental">Experimental</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <label class="block text-xs font-medium uppercase tracking-wide text-body-muted">
        <span>Theme name</span>
        <input id="themeName" type="text" placeholder="Cozy Midnight" class="mt-1 w-full rounded-lg border border-line-neutral px-3 py-2 text-sm" />
      </label>
      <label class="block text-xs font-medium uppercase tracking-wide text-body-muted">
        <span>Slug</span>
        <input id="themeSlug" type="text" placeholder="cozy-midnight" class="mt-1 w-full rounded-lg border border-line-neutral px-3 py-2 text-sm" />
      </label>
    </div>
    <div class="space-y-3">
      <label class="block text-xs font-medium uppercase tracking-wide text-body-muted">
        <span>Editing scope</span>
        <select id="scopeSelector" class="mt-1 w-full rounded-lg border border-line-neutral bg-surface-base px-3 py-2 text-sm"></select>
      </label>
      <div data-scope-info class="space-y-2 rounded-xl border border-line-subtle bg-surface-base/60 p-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span data-scope-label class="text-sm font-semibold">Editing: Global Theme</span>
          <button type="button" data-clear-scope class="text-xs font-semibold text-danger hover:underline">Clear overrides</button>
        </div>
        <p data-scope-description class="text-xs text-body-muted">Default colors applied site-wide.</p>
        <p data-scope-has-override class="hidden text-xs font-medium text-success">Overrides saved for this scope.</p>
        <p data-scope-no-override class="text-xs text-body-muted">Using global defaults.</p>
      </div>
    </div>
  `;
  editorColumn.appendChild(detailsCard);

  const paletteCard = document.createElement("section");
  paletteCard.className = "space-y-4 rounded-2xl border border-line-subtle bg-surface-base p-4 shadow-sm";
  paletteCard.innerHTML = `
    <div>
      <h2 class="text-lg font-semibold">Quick palette</h2>
      <p class="text-xs text-body-muted">Rapidly adjust hero colors, text, and backgrounds.</p>
    </div>
  `;
  const paletteBody = document.createElement("div");
  paletteCard.appendChild(paletteBody);
  buildLegacyPalette(paletteBody);

  const fontSection = document.createElement("div");
  fontSection.className = "space-y-2";
  const fontHeading = document.createElement("h3");
  fontHeading.className = "text-sm font-semibold";
  fontHeading.textContent = "Fonts";
  fontSection.appendChild(fontHeading);
  buildFontSelects(fontSection);
  paletteCard.appendChild(fontSection);

  editorColumn.appendChild(paletteCard);

  buildComprehensiveControls(editorColumn);
  buildPreviewSection(editorColumn);

  const scopeSelector = detailsCard.querySelector<HTMLSelectElement>("#scopeSelector");
  if (scopeSelector) {
    populateScopeSelector(scopeSelector);
  }

  const scopeDescription = detailsCard.querySelector<HTMLElement>('[data-scope-description]');
  const globalScope = THEME_SCOPES.find((scope) => scope.id === "global");
  if (scopeDescription && globalScope) {
    scopeDescription.textContent = globalScope.description;
  }
}

function init(): void {
  const root = document.getElementById("themeEditorRoot");
  if (!root) return;

  buildEditorShell(root);

  const devApi = root.getAttribute("data-dev-api") ?? "http://localhost:8787";
  const editor = new ThemeEditor({ devApi, root });
  (window as typeof window & { themeEditor?: ThemeEditor }).themeEditor = editor;
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}
