import { analyzeSlug } from "../../../shared/slugify.js";
function initWriteAdmin() {
  const root = document.querySelector("[data-dev-api]");
  const DEV_API = root?.getAttribute("data-dev-api") || "http://localhost:8787";
  const DEV_KEY = root?.getAttribute("data-dev-key") || "";
  const baseHeaders = DEV_KEY ? { "X-WC-Dev-Key": DEV_KEY } : {};
  const jsonHeaders = { "Content-Type": "application/json", ...baseHeaders };
  function apiFetch(path, options = {}) {
    const headers = { ...baseHeaders, ...options.headers || {} };
    return fetch(`${DEV_API}${path}`, { ...options, headers });
  }
  const $ = (id) => document.getElementById(id);
  const titleInput = $("title");
  const slugInput = $("slug");
  const slugPreview = $("slugPreview");
  const slugStatus = $("slugStatus");
  const slugStatusBase = slugStatus?.className ?? "";
  const statusEl = $("status");
  const excerptInput = $("excerpt");
  const metaInput = $("meta");
  const excerptHint = $("excerptHint");
  const metaHint = $("metaHint");
  const excerptHintBase = excerptHint?.className ?? "mt-1 text-[11px] text-body-subtle";
  const metaHintBase = metaHint?.className ?? "mt-1 text-[11px] text-body-subtle";
  const searchPreview = $("searchPreview");
  const searchPreviewTitle = $("searchPreviewTitle");
  const searchPreviewUrl = $("searchPreviewUrl");
  const searchPreviewDescription = $("searchPreviewDescription");
  const entitiesInput = $("entities");
  const entityValidation = $("entityValidation");
  const siteOriginAttr = root?.getAttribute("data-site-origin") ?? "";
  let previewHost = "";
  if (siteOriginAttr) {
    try {
      previewHost = new URL(siteOriginAttr).host;
    } catch {
      previewHost = siteOriginAttr.replace(/^https?:\/\//, "");
    }
  }
  if (!previewHost) {
    previewHost = "spacebarcollective.com";
  }
  let slugTouched = false;
  let entityValidationTimeout = null;
  let isSavingDraft = false;
  function setSavingState(on) {
    const saveButton2 = $("save");
    const savePublishButton2 = $("savePublish");
    if (saveButton2) saveButton2.disabled = on;
    if (savePublishButton2) savePublishButton2.disabled = on;
  }
  function setStatus(msg, ok = true, warnings, actions) {
    if (!statusEl) return;
    statusEl.innerHTML = "";
    statusEl.style.color = ok ? "#065f46" : "#7f1d1d";
    if (msg) {
      const span = document.createElement("span");
      span.textContent = msg;
      statusEl.appendChild(span);
    }
    if (Array.isArray(warnings) && warnings.length) {
      const list = document.createElement("ul");
      list.className = "mt-1 list-disc pl-4 text-[11px] text-warning";
      warnings.forEach((note) => {
        const li = document.createElement("li");
        li.textContent = note;
        list.appendChild(li);
      });
      statusEl.appendChild(list);
    }
    if (ok && actions) {
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "mt-3 flex flex-wrap gap-2";
      const viewBtn = document.createElement("a");
      viewBtn.href = `/post/${actions.slug}`;
      viewBtn.target = "_blank";
      viewBtn.rel = "noopener";
      viewBtn.className = "inline-flex items-center gap-1.5 rounded-lg border border-line-neutral bg-surface-base px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-soft";
      viewBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>View Post`;
      const heroBtn = document.createElement("a");
      heroBtn.href = `/admin/hero?post=${encodeURIComponent(actions.slug)}`;
      heroBtn.className = "inline-flex items-center gap-1.5 rounded-lg border border-line-neutral bg-surface-base px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-soft";
      heroBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>Upload Hero Image`;
      const editBtn = document.createElement("a");
      editBtn.href = `/admin/posts?slug=${encodeURIComponent(actions.slug)}`;
      editBtn.className = "inline-flex items-center gap-1.5 rounded-lg border border-line-neutral bg-surface-base px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-soft";
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Edit in Post Editor`;
      actionsDiv.appendChild(viewBtn);
      actionsDiv.appendChild(heroBtn);
      actionsDiv.appendChild(editBtn);
      statusEl.appendChild(actionsDiv);
    }
  }
  function summarizeEntities(list) {
    if (!Array.isArray(list) || !list.length) return "";
    return list.map((item) => {
      const type = item?.type ?? "?";
      const slug = item?.slug ?? "?";
      return `${type}:${slug}`;
    }).join(", ");
  }
  function parseEntities(input) {
    if (!input || !input.trim()) return [];
    const parts = input.split(/[,\n]/);
    const entities = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^([a-zA-Z]+):([a-z0-9-]+)$/);
      if (match && match[1] && match[2]) {
        entities.push({ type: match[1], slug: match[2] });
      }
    }
    return entities;
  }
  async function validateEntities() {
    if (!entitiesInput || !entityValidation) return;
    const input = entitiesInput.value.trim();
    if (!input) {
      entityValidation.innerHTML = "";
      entityValidation.className = "mt-2 text-xs";
      return;
    }
    const entities = parseEntities(input);
    if (entities.length === 0) {
      entityValidation.innerHTML = '<span class="text-warning">Invalid format. Use type:slug (e.g., herb:peppermint, crystal:fluorite)</span>';
      entityValidation.className = "mt-2 text-xs";
      return;
    }
    try {
      const checks = await Promise.all(
        entities.map(async (entity) => {
          try {
            const res = await apiFetch("/entities/get", {
              method: "POST",
              headers: jsonHeaders,
              body: JSON.stringify({ type: entity.type, slug: entity.slug })
            });
            const data = await res.json();
            return { ...entity, exists: data.ok };
          } catch {
            return { ...entity, exists: false };
          }
        })
      );
      const missing = checks.filter((c) => !c.exists);
      if (missing.length === 0) {
        entityValidation.innerHTML = `<span class="text-emerald-600">\u2713 All ${entities.length} ${entities.length === 1 ? "entity" : "entities"} exist</span>`;
        entityValidation.className = "mt-2 text-xs";
      } else {
        const missingHtml = missing.map(
          (m) => `<span class="inline-flex items-center gap-1">${m.type}:${m.slug} <a href="/admin/entities?type=${m.type}&slug=${m.slug}" class="text-purple-600 hover:underline" title="Create entity">[create]</a></span>`
        ).join(", ");
        entityValidation.innerHTML = `<span class="text-warning">Missing ${missing.length} ${missing.length === 1 ? "entity" : "entities"}: ${missingHtml}</span>`;
        entityValidation.className = "mt-2 text-xs";
      }
    } catch {
      entityValidation.innerHTML = '<span class="text-body-muted">Could not validate entities</span>';
      entityValidation.className = "mt-2 text-xs";
    }
  }
  function evaluateSlug() {
    const manual = analyzeSlug(slugInput?.value ?? "");
    const title = analyzeSlug(titleInput?.value ?? "");
    if (manual.trimmed.length > 0 && manual.slug) {
      return {
        slug: manual.slug,
        source: "manual",
        changed: manual.changed,
        manualProvided: true
      };
    }
    if (manual.trimmed.length > 0 && !manual.slug) {
      if (title.slug) {
        return {
          slug: title.slug,
          source: "title-fallback",
          changed: true,
          manualProvided: true
        };
      }
      return {
        slug: "",
        source: "invalid-manual",
        changed: false,
        manualProvided: true
      };
    }
    if (title.slug) {
      return {
        slug: title.slug,
        source: "title",
        changed: title.changed,
        manualProvided: false
      };
    }
    return { slug: "", source: "empty", changed: false, manualProvided: false };
  }
  function updateExcerptHint() {
    if (!excerptHint) return;
    const length = excerptInput?.value.trim().length ?? 0;
    let message = "Aim for around 220 characters so your intro stays readable in feeds.";
    let className = excerptHintBase;
    if (length === 0) {
      message += " Leave blank to auto-generate from your Markdown.";
    } else {
      message += ` Current length: ${length}.`;
      if (length > 240) {
        message += " This may be truncated in summaries.";
        className += " text-warning";
      }
    }
    excerptHint.textContent = message;
    excerptHint.className = className;
  }
  function updateMetaHint() {
    if (!metaHint) return;
    const length = metaInput?.value.trim().length ?? 0;
    let message = "Aim for 120\u2013160 characters. Keep it concise, actionable, and include your primary keywords.";
    let className = metaHintBase;
    if (length === 0) {
      message += " Leave blank for an auto-generated summary.";
    } else {
      message += ` Current length: ${length}.`;
      if (length < 120) {
        message += " Consider adding a touch more detail.";
        className += " text-warning";
      } else if (length > 160) {
        message += " This may be truncated in search results.";
        className += " text-warning";
      }
    }
    metaHint.textContent = message;
    metaHint.className = className;
  }
  function updateSearchPreview(state) {
    if (!searchPreview || !searchPreviewTitle || !searchPreviewUrl || !searchPreviewDescription) {
      return;
    }
    const slugState = state ?? evaluateSlug();
    const title = (titleInput?.value ?? "").trim();
    const meta = (metaInput?.value ?? "").trim();
    const excerpt = (excerptInput?.value ?? "").trim();
    searchPreviewTitle.textContent = title || "Your post title will appear here";
    searchPreviewUrl.textContent = `${previewHost}/post/${slugState.slug || "your-slug"}`;
    searchPreviewDescription.textContent = meta || excerpt || "Your meta description or excerpt will appear here so you can check the length.";
  }
  function renderSlugState() {
    if (!slugPreview || !slugStatus) return;
    const state = evaluateSlug();
    if (state.slug) {
      slugPreview.textContent = `Preview: /post/${state.slug}`;
    } else if ((titleInput?.value || "").trim()) {
      slugPreview.textContent = "Slug will be generated from the title.";
    } else {
      slugPreview.textContent = "Add a title to generate a slug.";
    }
    slugStatus.className = slugStatusBase || "mt-1 text-[11px] text-body-subtle";
    slugStatus.textContent = "";
    if (state.source === "manual" && state.changed) {
      slugStatus.textContent = `Normalized to ${state.slug}. Only lowercase letters, numbers, and hyphens are allowed.`;
    } else if (state.source === "title-fallback") {
      slugStatus.className += " text-warning";
      slugStatus.textContent = `Manual slug was invalid. Using \u201C${state.slug}\u201D from the title.`;
    } else if (state.source === "invalid-manual") {
      slugStatus.className += " text-warning";
      slugStatus.textContent = "Slug becomes empty after normalization. Adjust it or provide a title.";
    }
    updateSearchPreview(state);
  }
  function normalizeManualSlug() {
    if (!slugInput) return;
    const manual = analyzeSlug(slugInput.value);
    slugInput.value = manual.slug;
    slugTouched = slugInput.value.trim().length > 0;
  }
  if (titleInput && slugInput) {
    titleInput.addEventListener("input", () => {
      if (!slugTouched) {
        const auto = analyzeSlug(titleInput.value).slug;
        slugInput.value = auto;
      }
      renderSlugState();
    });
    slugInput.addEventListener("input", () => {
      slugTouched = slugInput.value.trim().length > 0;
      renderSlugState();
    });
    slugInput.addEventListener("blur", () => {
      normalizeManualSlug();
      renderSlugState();
    });
    renderSlugState();
  }
  excerptInput?.addEventListener("input", () => {
    updateExcerptHint();
    updateSearchPreview();
  });
  metaInput?.addEventListener("input", () => {
    updateMetaHint();
    updateSearchPreview();
  });
  updateExcerptHint();
  updateMetaHint();
  updateSearchPreview();
  entitiesInput?.addEventListener("input", () => {
    if (entityValidationTimeout) {
      clearTimeout(entityValidationTimeout);
    }
    if (entityValidation) {
      entityValidation.innerHTML = '<span class="text-body-muted">Validating...</span>';
    }
    entityValidationTimeout = setTimeout(() => {
      void validateEntities();
    }, 500);
  });
  if (entitiesInput?.value.trim()) {
    void validateEntities();
  }
  async function savePost() {
    if (slugInput) {
      normalizeManualSlug();
      renderSlugState();
    }
    const state = evaluateSlug();
    const tldrValue = ($("tldr")?.value ?? "").trim();
    const spoonsValueRaw = ($("spoons")?.value ?? "").trim().toLowerCase();
    const spoonsValue = ["low", "medium", "high"].includes(spoonsValueRaw) ? spoonsValueRaw : "";
    const payload = {
      title: titleInput?.value ?? "",
      slug: state.manualProvided && state.slug ? state.slug : "",
      excerpt: $("excerpt")?.value ?? "",
      metaDescription: $("meta")?.value ?? "",
      tldr: tldrValue || void 0,
      tags: $("tags")?.value ?? "",
      includeAds: Boolean($("ads")?.checked),
      includeKofi: Boolean($("kofi")?.checked),
      spoons: spoonsValue || void 0,
      entities: $("entities")?.value ?? "",
      markdown: $("markdown")?.value ?? ""
    };
    const res = await apiFetch("/posts/save", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "save failed");
    return data;
  }
  const saveButton = $("save");
  const savePublishButton = $("savePublish");
  saveButton?.addEventListener("click", async () => {
    if (isSavingDraft) return;
    try {
      isSavingDraft = true;
      setSavingState(true);
      setStatus("Saving...");
      const data = await savePost();
      const summary = summarizeEntities(data.entities);
      const message = `\u2713 Saved \u2192 ${data.path}${summary ? ` \xB7 Entities: ${summary}` : ""}`;
      setStatus(message, true, data.warnings, { slug: data.slug, path: data.path });
    } catch (e) {
      setStatus(`Save error: ${e?.message || String(e)}`, false);
    } finally {
      isSavingDraft = false;
      setSavingState(false);
    }
  });
  savePublishButton?.addEventListener("click", async () => {
    if (isSavingDraft) return;
    try {
      isSavingDraft = true;
      setSavingState(true);
      setStatus("Saving...");
      const data = await savePost();
      const summary = summarizeEntities(data.entities);
      setStatus("Saved. Publishing...", true, data.warnings);
      const res = await apiFetch("/bundle", { method: "POST" });
      const bundle = await res.json();
      if (!bundle.ok) {
        const errors = Array.isArray(bundle.steps) ? bundle.steps.map((s) => s?.err).filter(Boolean).join("\n") : bundle.error;
        throw new Error(errors || "bundle failed");
      }
      const publishMsg = `\u2713 Published${summary ? ` \xB7 Entities: ${summary}` : ""}`;
      setStatus(publishMsg, true, data.warnings, { slug: data.slug, path: data.path });
    } catch (e) {
      setStatus(`Publish error: ${e?.message || String(e)}`, false);
    } finally {
      isSavingDraft = false;
      setSavingState(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
    if (!saveButton || saveButton.disabled || isSavingDraft) return;
    event.preventDefault();
    saveButton.click();
  });
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWriteAdmin);
  } else {
    initWriteAdmin();
  }
}
