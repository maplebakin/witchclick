import { ThemeEditor } from "@/lib/theme-editor";
import { THEME_SCOPES } from "@/lib/theme-scopes";
import { ALL_COLOR_VARIABLES, ALL_FONT_VARIABLES } from "@/lib/theme-editor-comprehensive";

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

const QUICK_EDIT_KEYS = new Set(["primary", "accent", "background", "textPrimary", "textHeading", "textMuted"]);

const PAGE_LAYOUT_FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: "background", label: "Page Background", placeholder: "#0f0820" },
  { key: "headerBackground", label: "Header Background", placeholder: "#120725" },
  { key: "headerBorder", label: "Header Border", placeholder: "#4b2a63" },
  { key: "footerBackground", label: "Footer Background", placeholder: "#07020f" },
  { key: "footerBorder", label: "Footer Border", placeholder: "#4b2a63" },
];

function toLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

// Custom labels for better clarity
const CUSTOM_LABELS: Record<string, string> = {
  colorMidnight: "Page Background (Deepest)",
  colorNight: "Header/Overlay Background",
  colorDusk: "Card Surface Background",
  colorGold: "Primary CTA & Accents",
  colorAmethyst: "Brand Accent Color",
  colorIris: "Hover & Interactive States",
  colorInk: "Body Text Color",
  colorRune: "Heading Text (Lightest)",
  colorFog: "Muted/Subtle Text",
  headerBackground: "Header Background",
  headerBorder: "Header Border",
  headerText: "Header Text",
  headerTextHover: "Header Text (Hover)",
  footerBackground: "Footer Background",
  footerBorder: "Footer Border",
  footerText: "Footer Text",
  footerTextMuted: "Footer Muted Text",
};

function createColorControl(key: string, label = CUSTOM_LABELS[key] || toLabel(key)): HTMLElement {
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

function buildPageLayoutSection(container: HTMLElement): void {
  const grid = document.createElement("div");
  grid.className = "grid gap-3 sm:grid-cols-2";
  PAGE_LAYOUT_FIELDS.forEach((field) => {
    grid.appendChild(createLegacyControl(field));
  });
  container.appendChild(grid);
}

function buildComprehensiveControls(container: HTMLElement): void {
  const details = document.createElement("details");
  details.className = "space-y-4 rounded-2xl border border-line-subtle bg-surface-base p-4 shadow-sm";
  details.setAttribute("open", "");

  const summary = document.createElement("summary");
  summary.className = "cursor-pointer text-sm font-semibold flex items-center gap-2";
  summary.innerHTML = `
    <span>Step 4 · Fine-tune sections</span>
    <span class="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-surface-accent px-2 py-0.5 text-inverse">Optional detail work</span>
  `;
  details.appendChild(summary);

  const descriptionBox = document.createElement("div");
  descriptionBox.className = "space-y-2 rounded-lg border border-dashed border-line-subtle bg-surface-base/60 p-3";
  descriptionBox.innerHTML = `
    <p class="text-xs text-body-muted"><strong>Plain language:</strong> Everything below maps to a real spot on the site (navigation bars, cards, alerts, etc.). Pick a scope above, then work through the groups until the live preview feels right.</p>
    <ol class="text-xs text-body-muted list-decimal pl-5 space-y-1">
      <li><strong>Global</strong> scope updates the entire site. Other scopes only affect that page or component.</li>
      <li>Leave a field blank if you're unsure—inheritance keeps the previous color.</li>
      <li>Stop at any time. These are optional details for extra polish.</li>
    </ol>
  `;
  details.appendChild(descriptionBox);

  // Organize variables into categorized sections
  const variableGroups = [
    {
      title: "Site backdrop & dividers",
      description: "Background hues, overlays, and the subtle strokes between sections",
      variables: ['colorMidnight', 'colorNight', 'colorDusk', 'surfacePlain', 'surfacePlainBorder', 'colorBorder', 'colorBorderStrong', 'colorOverlay', 'colorOverlayStrong']
    },
    {
      title: "Actions & highlights",
      description: "Buttons, CTA trims, hover colors, and focus outlines",
      variables: ['colorGold', 'colorAmethyst', 'colorIris', 'focusRingColor', 'cardFocusOutline', 'linkColor']
    },
    {
      title: "Readable text & accents",
      description: "Paragraphs, headings, quiet labels, and specialty inks",
      variables: ['colorInk', 'colorRune', 'colorFog', 'colorMuted', 'textSecondary', 'textTertiary', 'textStrong', 'textHint', 'textDisabled', 'textBody', 'textSubtle', 'textAccent', 'textAccentStrong', 'inkBody', 'inkStrong', 'inkMuted']
    },
    {
      title: "Navigation bars",
      description: "Header and footer backgrounds, borders, and link colors",
      variables: ['headerBackground', 'headerBorder', 'headerText', 'headerTextHover', 'footerBackground', 'footerBorder', 'footerText', 'footerTextMuted']
    },
    {
      title: "Cards & panels",
      description: "Content boxes, list cards, spoons, badges, and tags",
      variables: ['cardPanelSurface', 'cardPanelSurfaceStrong', 'cardPanelBorder', 'cardPanelBorderStrong', 'cardPanelBorderSoft', 'cardBadgeBg', 'cardBadgeBorder', 'cardBadgeText', 'cardTagBg', 'cardTagBorder', 'cardTagText', 'cardSpoonBg', 'cardSpoonBorder', 'cardSpoonText']
    },
    {
      title: "Status & feedback",
      description: "Toast chips, form hints, and alerts",
      variables: ['success', 'warning', 'error', 'info']
    },
    {
      title: "Entity spotlight",
      description: "Special styling for Grimoire cards (only shows when that scope is selected)",
      variables: ['entityCardBorder', 'entityCardGlow', 'entityCardHighlight', 'entityCardSurfaceTop', 'entityCardSurfaceBottom', 'entityCardHeading', 'entityCardText', 'entityCardLabel', 'entityCardCta', 'entityCardCtaHover', 'entityCardIcon', 'entityCardIconShadow']
    }
  ];

  const groupsContainer = document.createElement("div");
  groupsContainer.className = "space-y-6";

  variableGroups.forEach(group => {
    const visibleVariables = group.variables.filter((key) => !QUICK_EDIT_KEYS.has(key));
    if (!visibleVariables.length) {
      return;
    }
    const groupSection = document.createElement("div");
    groupSection.className = "space-y-3";

    const groupHeader = document.createElement("div");
    groupHeader.className = "border-b border-line-subtle pb-2";
    groupHeader.innerHTML = `
      <h4 class="text-sm font-semibold">${group.title}</h4>
      <p class="text-xs text-body-muted mt-0.5">${group.description}</p>
    `;
    groupSection.appendChild(groupHeader);

    const grid = document.createElement("div");
    grid.className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
    visibleVariables.forEach((key) => {
      grid.appendChild(createColorControl(key));
    });
    groupSection.appendChild(grid);

    groupsContainer.appendChild(groupSection);
  });

  details.appendChild(groupsContainer);

  const scopeDetails = document.createElement("details");
  scopeDetails.className = "rounded-xl border border-dashed border-line-subtle bg-surface-base/60 p-4";
  scopeDetails.dataset.scopeSection = "grimoire";
  const scopeSummary = document.createElement("summary");
  scopeSummary.className = "cursor-pointer text-sm font-semibold";
  scopeSummary.textContent = "Bonus: Entity Grimoire extras";
  scopeDetails.appendChild(scopeSummary);

  const scopeCopy = document.createElement("p");
  scopeCopy.className = "mt-2 text-xs text-body-muted";
  scopeCopy.textContent = "Switch the scope selector to “Entity Grimoire” to reveal these vibrant highlight controls.";
  scopeDetails.appendChild(scopeCopy);

  details.appendChild(scopeDetails);

  container.appendChild(details);
}

function buildPreviewSection(container: HTMLElement): void {
  const previewCard = document.createElement("section");
  previewCard.className = "space-y-5 rounded-2xl border border-line-subtle bg-surface-base p-4 shadow-sm";

  const heading = document.createElement("div");
  heading.className = "flex flex-wrap items-center justify-between gap-2";
  heading.innerHTML = `
    <h2 class="text-lg font-semibold">Live Preview</h2>
    <span class="text-xs text-body-muted">Updates with every token, color, and font change</span>
  `;
  previewCard.appendChild(heading);

  const preview = document.createElement("div");
  preview.dataset.themePreview = "";
  preview.className = "space-y-5 rounded-xl border border-line-neutral bg-surface-muted p-4";
  preview.style.background = "var(--preview-background)";
  preview.style.color = "var(--preview-text)";
  preview.style.setProperty("border-color", "var(--preview-border)");
  preview.innerHTML = `
    <div class="space-y-3 rounded-xl border border-line-subtle bg-surface-base/80 p-4 shadow-sm" style="background: var(--preview-surfacePlain); border-color: var(--preview-surfacePlainBorder)">
      <span class="text-[11px] font-semibold uppercase tracking-wide" style="color: var(--preview-text-muted)">Hero Preview</span>
      <h3 class="text-2xl font-semibold" data-preview-font="fontHeading" style="color: var(--preview-text-heading)">WitchClick Theme Preview</h3>
      <p class="text-sm" data-preview-font="fontSerif" style="color: var(--preview-text-primary)">See surfaces, typography, cards, and entity treatments all update as you tweak tokens.</p>
      <a class="inline-flex items-center gap-2 text-sm font-semibold" data-preview-font="fontAccent" style="color: var(--preview-link)" href="#">
        Explore rituals
        <span class="inline-flex h-7 w-7 items-center justify-center rounded-full border" style="background: var(--preview-cardBadgeBg); border-color: var(--preview-cardBadgeBorder); color: var(--preview-cardBadgeText)">→</span>
      </a>
    </div>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div class="space-y-3 rounded-xl border p-4 shadow-sm" style="background: var(--preview-cardPanelSurface); border-color: var(--preview-cardPanelBorder)">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold uppercase tracking-wide" style="color: var(--preview-text-muted)">Card Panel</span>
          <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style="background: var(--preview-cardTagBg); border: 1px solid var(--preview-cardTagBorder); color: var(--preview-cardTagText)">Tag</span>
        </div>
        <h4 class="text-lg font-semibold" data-preview-font="fontHeading" style="color: var(--preview-text-heading)">Surface strong</h4>
        <p class="text-sm" data-preview-font="fontSerif" style="color: var(--preview-text-primary)">Uses <code class="rounded bg-black/20 px-1 py-0.5 text-[10px]">cardPanelSurface</code> and border tokens.</p>
        <button class="w-full rounded-lg px-3 py-2 text-sm font-semibold" data-preview-font="fontAccent" style="background: var(--preview-primary); color: var(--preview-text-heading); box-shadow: 0 0 0 2px var(--preview-focusRingColor)">Primary CTA</button>
      </div>
      <div class="space-y-3 rounded-xl border p-4 shadow-sm" style="background: var(--preview-cardPanelSurfaceStrong); border-color: var(--preview-cardPanelBorderStrong)">
        <span class="text-[11px] font-semibold uppercase tracking-wide" style="color: var(--preview-text-muted)">Status chips</span>
        <div class="flex flex-wrap gap-2">
          <span class="rounded-full px-3 py-1 text-xs font-semibold text-white" style="background: var(--preview-success)">Success</span>
          <span class="rounded-full px-3 py-1 text-xs font-semibold text-black" style="background: var(--preview-warning)">Warning</span>
          <span class="rounded-full px-3 py-1 text-xs font-semibold text-white" style="background: var(--preview-error)">Error</span>
          <span class="rounded-full px-3 py-1 text-xs font-semibold text-white" style="background: var(--preview-info)">Info</span>
        </div>
        <div class="rounded-lg border bg-surface-base/50 p-3 text-xs" style="border-color: var(--preview-cardFocusOutline); color: var(--preview-text-secondary)">
          Focus outlines and semantic palettes update live.
        </div>
        <label class="block text-xs font-medium uppercase tracking-wide" style="color: var(--preview-text-secondary)">
          <span>Interactive field</span>
          <input class="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Focus me" style="border-color: var(--preview-cardPanelBorderSoft); box-shadow: 0 0 0 0 var(--preview-focusRingColor)" data-preview-focus-input />
        </label>
      </div>
      <div class="space-y-3 rounded-xl border p-4 shadow-sm" style="background: linear-gradient(135deg, var(--preview-entityCardSurfaceTop), var(--preview-entityCardSurfaceBottom)); border-color: var(--preview-entityCardBorder); box-shadow: 0 0 20px var(--preview-entityCardGlow)">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold uppercase tracking-wide" style="color: var(--preview-entityCardLabel)">Entity Card</span>
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full" style="background: var(--preview-entityCardIcon); box-shadow: 0 0 12px var(--preview-entityCardIconShadow); color: var(--preview-entityCardText)">★</span>
        </div>
        <h4 class="text-lg font-semibold" data-preview-font="fontHeading" style="color: var(--preview-entityCardHeading)">Moonlit Focus</h4>
        <p class="text-sm" data-preview-font="fontSerif" style="color: var(--preview-entityCardText)">Showcases entity-specific tokens including highlights and CTAs.</p>
        <button class="rounded-lg px-3 py-2 text-sm font-semibold" data-preview-font="fontAccent" style="background: var(--preview-entityCardCta); color: var(--preview-entityCardText); box-shadow: inset 0 0 0 1px var(--preview-entityCardBorder)">View Entity</button>
      </div>
    </div>
    <div class="space-y-3 rounded-xl border border-dashed border-line-subtle bg-surface-base/70 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold">Typography Samples</h3>
        <span class="text-[11px] uppercase tracking-wide text-body-muted">Fonts update in real time</span>
      </div>
      <div class="space-y-3">
        ${ALL_FONT_VARIABLES.map((key) => `
          <div class="rounded-lg border border-line-subtle bg-surface-base/80 p-3 shadow-sm" data-preview-font-section="${key}">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-body-muted">${toLabel(key)}</div>
            <p class="mt-1 text-lg" data-preview-font="${key}">The quick brown fox dances softly.</p>
            <code class="mt-1 block text-[10px] font-mono text-body-muted" data-preview-font-value="${key}">—</code>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="space-y-3 rounded-xl border border-line-subtle bg-surface-base/80 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold">Token Swatches</h3>
        <span class="text-[11px] uppercase tracking-wide text-body-muted">Every editable color token</span>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        ${ALL_COLOR_VARIABLES.map((key) => `
          <div class="space-y-2 rounded-xl border border-line-subtle bg-surface-base/90 p-3 shadow-sm" data-preview-swatch="${key}">
            <div class="h-10 w-full rounded-lg border border-line-subtle" style="background: var(--preview-${key})"></div>
            <div class="text-[11px] font-semibold uppercase tracking-wide text-body-muted">${toLabel(key)}</div>
            <code class="block text-[10px] font-mono text-body-muted" data-preview-swatch-value="${key}">—</code>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  previewCard.appendChild(preview);

  const focusInput = preview.querySelector<HTMLInputElement>('[data-preview-focus-input]');
  if (focusInput) {
    focusInput.addEventListener('focus', () => {
      const color = getComputedStyle(preview).getPropertyValue('--preview-focusRingColor').trim() || 'transparent';
      focusInput.style.boxShadow = `0 0 0 3px ${color}`;
    });
    focusInput.addEventListener('blur', () => {
      focusInput.style.boxShadow = '0 0 0 0 transparent';
    });
  }

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
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-body-muted">Theme workshop</p>
          <h1 class="text-xl font-semibold">Theme Editor</h1>
          <p class="text-sm text-body-muted">Follow the guided steps below—even if design tokens are brand new.</p>
        </div>
        <div class="grid gap-2 text-xs text-body-muted sm:grid-cols-3" role="list">
          <div class="rounded-xl border border-line-subtle bg-surface-base/70 p-3" role="listitem">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-primary">Step 1</div>
            <p class="mt-1">Pick or duplicate a base palette inside the library.</p>
          </div>
          <div class="rounded-xl border border-line-subtle bg-surface-base/70 p-3" role="listitem">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-primary">Step 2</div>
            <p class="mt-1">Fill in the basics and decide which page or component you are editing.</p>
          </div>
          <div class="rounded-xl border border-line-subtle bg-surface-base/70 p-3" role="listitem">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-primary">Step 3</div>
            <p class="mt-1">Tweak quick colors + fonts, then explore optional fine-tuning.</p>
          </div>
        </div>
        <div data-breadcrumbs class="text-[11px] uppercase tracking-wide text-body-muted">Theme</div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span data-watcher-status class="rounded-full border border-line-neutral bg-surface-base/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-body-muted">Watcher: --</span>
        <button id="newThemeBtn" type="button" class="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90">+ New Theme</button>
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

  // Create New Theme Modal
  const modal = document.createElement("div");
  modal.id = "newThemeModal";
  modal.className = "hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4";
  modal.innerHTML = `
    <div class="w-full max-w-md space-y-4 rounded-2xl border border-line-subtle bg-surface-base p-6 shadow-xl">
      <div class="space-y-2">
        <h2 class="text-xl font-semibold">Create New Theme</h2>
        <p class="text-sm text-body-muted">Choose which theme mode to create</p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <button type="button" data-create-theme="midnight" class="group space-y-3 rounded-xl border-2 border-line-neutral bg-surface-base p-4 text-left transition hover:border-primary hover:bg-surface-soft">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-900 to-indigo-950 text-white shadow-lg">🌙</div>
            <div class="flex-1">
              <div class="font-semibold">Midnight</div>
              <div class="text-xs text-body-muted">Dark theme</div>
            </div>
          </div>
        </button>
        <button type="button" data-create-theme="dawn" class="group space-y-3 rounded-xl border-2 border-line-neutral bg-surface-base p-4 text-left transition hover:border-primary hover:bg-surface-soft">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-200 text-gray-800 shadow-lg">🌅</div>
            <div class="flex-1">
              <div class="font-semibold">Dawn</div>
              <div class="text-xs text-body-muted">Light theme</div>
            </div>
          </div>
        </button>
      </div>
      <div class="flex justify-end gap-2 border-t border-line-subtle pt-4">
        <button type="button" id="cancelNewTheme" class="rounded-lg border border-line-neutral px-4 py-2 text-sm font-medium hover:bg-surface-soft">Cancel</button>
      </div>
    </div>
  `;
  container.appendChild(modal);

  const layout = document.createElement("div");
  layout.className = "grid gap-6 lg:grid-cols-12";
  container.appendChild(layout);

  const library = document.createElement("section");
  library.className = "space-y-4 rounded-2xl border border-line-subtle bg-surface-base p-4 shadow-sm lg:col-span-4";
  library.innerHTML = `
    <div class="space-y-2">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-primary">Step 1 · Choose a starting palette</p>
        <h2 class="text-lg font-semibold">Theme Library</h2>
        <p class="text-xs text-body-muted">Pick any midnight (dark) or dawn (light) palette that feels close to your desired vibe. Duplicate before editing if you want to keep the original untouched.</p>
      </div>
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
    <div class="rounded-xl border border-dashed border-line-subtle bg-surface-base/60 p-3 text-xs text-body-muted">
      <p class="font-semibold">Not sure where to start?</p>
      <ul class="mt-1 space-y-1.5 list-disc pl-4">
        <li>Midnight = cozy dark UI. Dawn = soft daylight UI.</li>
        <li>Duplicate a preset to make experiments without fear.</li>
        <li>Use categories to group ideas (seasonal, experimental, etc.).</li>
      </ul>
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
      <div class="space-y-1">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-primary">Step 2 · Theme basics & scope</p>
        <h2 class="text-lg font-semibold">Tell WitchClick where this palette lives</h2>
        <p class="text-xs text-body-muted">Name the palette, pick midnight/dawn, then choose the part of the site you're editing.</p>
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
    <div class="rounded-lg border border-dashed border-line-subtle bg-surface-base/60 p-3 text-xs text-body-muted">
      <p class="font-semibold mb-1">Mini checklist</p>
      <ol class="space-y-1 list-decimal pl-4">
        <li>Midnight = dark UI, Dawn = light UI.</li>
        <li>Give the theme a descriptive name (season, vibe, or use case).</li>
        <li>Slug auto-fills, but you can rename it to something memorable.</li>
      </ol>
    </div>
    <div class="space-y-3">
      <div class="rounded-lg border border-dashed border-line-subtle bg-surface-base/60 p-3">
        <div class="text-xs text-body-muted space-y-1.5">
          <div class="font-semibold">🎯 What are scopes?</div>
          <p>Scopes are just "where should this change apply?" options. You can keep the <strong>Global Theme</strong> or pick a specific page (like the Grimoire) to override only that area.</p>
          <p class="italic">Tip: Start global, then create scope-specific tweaks once the base looks good.</p>
        </div>
      </div>
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
        <p data-scope-has-override class="hidden text-xs font-medium text-success">✓ Overrides saved for this scope.</p>
        <p data-scope-no-override class="text-xs text-body-muted">Using global defaults.</p>
        <p data-scope-overview class="text-[11px] text-body-muted">Overrides: Global only</p>
      </div>
    </div>
  `;
  editorColumn.appendChild(detailsCard);

  const paletteCard = document.createElement("section");
  paletteCard.className = "space-y-4 rounded-2xl border border-line-subtle bg-surface-base p-4 shadow-sm";
  paletteCard.innerHTML = `
    <div class="space-y-2">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-primary">Step 3 · Quick colors & fonts</p>
        <h2 class="text-lg font-semibold">Quick Palette</h2>
        <p class="text-xs text-body-muted">Use the plain-language colors below to set the overall vibe. Once this feels right, continue to the optional sections for detail work.</p>
      </div>
      <div class="rounded-lg border border-dashed border-line-subtle bg-surface-base/60 p-3 text-xs text-body-muted">
        <div class="font-semibold mb-2">💡 How to read these labels</div>
        <ul class="space-y-1.5 ml-4">
          <li><strong>Primary:</strong> Buttons, important links, CTAs.</li>
          <li><strong>Accent:</strong> Highlights, badges, decorative sparkles.</li>
          <li><strong>Background:</strong> The page surface. Midnight themes can stay deep, dawn themes can be airy.</li>
          <li><strong>Body text:</strong> Default paragraph color.</li>
          <li><strong>Heading:</strong> Titles and section headers.</li>
          <li><strong>Muted:</strong> Captions, helper text, quiet labels.</li>
        </ul>
      </div>
    </div>
  `;
  const paletteBody = document.createElement("div");
  paletteCard.appendChild(paletteBody);
  buildLegacyPalette(paletteBody);

  // Page & Layout section
  const pageLayoutSection = document.createElement("div");
  pageLayoutSection.className = "space-y-2 border-t border-line-subtle pt-4";
  const pageLayoutHeading = document.createElement("h3");
  pageLayoutHeading.className = "text-sm font-semibold";
  pageLayoutHeading.textContent = "Page & Layout";
  pageLayoutSection.appendChild(pageLayoutHeading);

  const pageLayoutDescription = document.createElement("p");
  pageLayoutDescription.className = "text-xs text-body-muted mb-3";
  pageLayoutDescription.textContent = "Control the main page background and header/footer areas. Leave empty to auto-generate from your background color.";
  pageLayoutSection.appendChild(pageLayoutDescription);

  buildPageLayoutSection(pageLayoutSection);
  paletteCard.appendChild(pageLayoutSection);

  const fontSection = document.createElement("div");
  fontSection.className = "space-y-2 border-t border-line-subtle pt-4";
  const fontHeading = document.createElement("h3");
  fontHeading.className = "text-sm font-semibold";
  fontHeading.textContent = "Typography";
  fontSection.appendChild(fontHeading);

  const fontDescription = document.createElement("p");
  fontDescription.className = "text-xs text-body-muted mb-3";
  fontDescription.textContent = "Choose fonts that match your theme's personality. Changes apply globally.";
  fontSection.appendChild(fontDescription);

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
