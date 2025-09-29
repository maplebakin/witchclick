interface HeroContext {
  excerpt: string;
  metaDescription: string;
  tags: string[];
  tone: string;
}

interface HeroStatus {
  hasPrompt: boolean;
  hasImage: boolean;
  hasAlt: boolean;
}

interface HeroAdminPost {
  slug: string;
  title: string;
  heroPrompt: string | null;
  heroAlt: string;
  heroSrc: string | null;
  heroFile: string | null;
  heroExt: string;
  publishedAt: string | null;
  context: HeroContext;
  status: HeroStatus;
}

type MaybeElement<T extends HTMLElement> = T | null;

type Elements = {
  list: MaybeElement<HTMLDivElement>;
  search: MaybeElement<HTMLInputElement>;
  emptyState: MaybeElement<HTMLDivElement>;
  workflow: MaybeElement<HTMLDivElement>;
  title: MaybeElement<HTMLHeadingElement>;
  slug: MaybeElement<HTMLElement>;
  publishedWrap: MaybeElement<HTMLSpanElement>;
  published: MaybeElement<HTMLSpanElement>;
  statusBadges: MaybeElement<HTMLDivElement>;
  promptArea: MaybeElement<HTMLTextAreaElement>;
  promptNotice: MaybeElement<HTMLParagraphElement>;
  generatePrompt: MaybeElement<HTMLButtonElement>;
  copyPrompt: MaybeElement<HTMLButtonElement>;
  fileInput: MaybeElement<HTMLInputElement>;
  fileHelp: MaybeElement<HTMLParagraphElement>;
  fileStatus: MaybeElement<HTMLParagraphElement>;
  localPreview: MaybeElement<HTMLImageElement>;
  uploadButton: MaybeElement<HTMLButtonElement>;
  uploadStatus: MaybeElement<HTMLParagraphElement>;
  heroPreview: MaybeElement<HTMLImageElement>;
  altInput: MaybeElement<HTMLInputElement>;
  altNotice: MaybeElement<HTMLParagraphElement>;
  snippet: MaybeElement<HTMLTextAreaElement>;
  copySnippet: MaybeElement<HTMLButtonElement>;
  statusBar: MaybeElement<HTMLParagraphElement>;
};

interface State {
  posts: HeroAdminPost[];
  filtered: HeroAdminPost[];
  selected: HeroAdminPost | null;
  pendingFile: File | null;
  previewUrl: string | null;
  adminKey: string;
}

function ready(fn: () => void) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureLeadingSlash(value: string | null | undefined): string {
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(+date)) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function badge(label: string, ok: boolean): string {
  const classes = ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  const icon = ok ? "✓" : "!";
  return `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${classes}">${icon} ${escapeHtml(
    label,
  )}</span>`;
}

function buildPromptFromContext(post: HeroAdminPost): string {
  const parts: string[] = [];
  parts.push(`Cozy digital illustration for WitchClick article "${post.title}".`);
  if (post.context.metaDescription) {
    parts.push(post.context.metaDescription);
  } else if (post.context.excerpt) {
    parts.push(post.context.excerpt);
  }
  if (post.context.tags?.length) {
    parts.push(`Motifs inspired by: ${post.context.tags.slice(0, 5).join(", ")}.`);
  }
  if (post.context.tone) {
    parts.push(`Tone: ${post.context.tone}.`);
  }
  parts.push("Warm, inclusive, high-detail digital painting, soft lighting, rich textures, no text, 3:2 aspect ratio.");
  return parts.join(" ");
}

function inferHeroPath(post: HeroAdminPost): string {
  if (post.heroSrc && post.heroSrc.trim()) {
    return ensureLeadingSlash(post.heroSrc.trim());
  }
  let ext = post.heroExt || ".png";
  if (!ext.startsWith(".")) ext = `.${ext}`;
  return `/hero-images/${post.slug}${ext}`;
}

function copyToClipboard(text: string): Promise<void> {
  if (!text) {
    return Promise.reject(new Error("Nothing to copy"));
  }
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.style.position = "fixed";
      temp.style.top = "-1000px";
      document.body.appendChild(temp);
      temp.focus();
      temp.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(temp);
      if (ok) resolve();
      else reject(new Error("Copy command failed"));
    } catch (error) {
      reject(error as Error);
    }
  });
}

ready(() => {
  const dataEl = document.getElementById("hero-data");
  if (!(dataEl instanceof HTMLScriptElement)) {
    return;
  }

  let posts: HeroAdminPost[] = [];
  try {
    posts = JSON.parse(dataEl.textContent || "[]");
  } catch (error) {
    console.error("Failed to parse hero admin data", error);
  }
  dataEl.remove();

  const elements: Elements = {
    list: document.getElementById("hero-list") as MaybeElement<HTMLDivElement>,
    search: document.getElementById("hero-search") as MaybeElement<HTMLInputElement>,
    emptyState: document.getElementById("hero-empty") as MaybeElement<HTMLDivElement>,
    workflow: document.getElementById("hero-workflow") as MaybeElement<HTMLDivElement>,
    title: document.getElementById("hero-title") as MaybeElement<HTMLHeadingElement>,
    slug: document.getElementById("hero-slug") as MaybeElement<HTMLElement>,
    publishedWrap: document.getElementById("hero-published-wrap") as MaybeElement<HTMLSpanElement>,
    published: document.getElementById("hero-published") as MaybeElement<HTMLSpanElement>,
    statusBadges: document.getElementById("hero-status") as MaybeElement<HTMLDivElement>,
    promptArea: document.getElementById("hero-prompt") as MaybeElement<HTMLTextAreaElement>,
    promptNotice: document.getElementById("hero-prompt-notice") as MaybeElement<HTMLParagraphElement>,
    generatePrompt: document.getElementById("hero-generate") as MaybeElement<HTMLButtonElement>,
    copyPrompt: document.getElementById("hero-copy-prompt") as MaybeElement<HTMLButtonElement>,
    fileInput: document.getElementById("hero-file") as MaybeElement<HTMLInputElement>,
    fileHelp: document.getElementById("hero-file-help") as MaybeElement<HTMLParagraphElement>,
    fileStatus: document.getElementById("hero-file-status") as MaybeElement<HTMLParagraphElement>,
    localPreview: document.getElementById("hero-local-preview") as MaybeElement<HTMLImageElement>,
    uploadButton: document.getElementById("hero-upload") as MaybeElement<HTMLButtonElement>,
    uploadStatus: document.getElementById("hero-upload-status") as MaybeElement<HTMLParagraphElement>,
    heroPreview: document.getElementById("hero-preview") as MaybeElement<HTMLImageElement>,
    altInput: document.getElementById("hero-alt") as MaybeElement<HTMLInputElement>,
    altNotice: document.getElementById("hero-alt-notice") as MaybeElement<HTMLParagraphElement>,
    snippet: document.getElementById("hero-snippet") as MaybeElement<HTMLTextAreaElement>,
    copySnippet: document.getElementById("hero-copy-snippet") as MaybeElement<HTMLButtonElement>,
    statusBar: document.getElementById("hero-action-status") as MaybeElement<HTMLParagraphElement>,
  };

  let adminKey = "";
  try {
    adminKey = new URL(window.location.href).searchParams.get("key") || "";
  } catch (error) {
    console.warn("Unable to read admin key", error);
  }

  const state: State = {
    posts,
    filtered: posts,
    selected: null,
    pendingFile: null,
    previewUrl: null,
    adminKey,
  };

  function updateBadges(post: HeroAdminPost) {
    if (!elements.statusBadges) return;
    elements.statusBadges.innerHTML =
      badge("Prompt", Boolean(post.status?.hasPrompt)) +
      badge("Image", Boolean(post.status?.hasImage)) +
      badge("Alt", Boolean(post.status?.hasAlt));
  }

  function showStatus(message: string, isError = false) {
    if (!elements.statusBar) return;
    elements.statusBar.textContent = message;
    elements.statusBar.style.color = isError ? "#7f1d1d" : "#065f46";
  }

  function resetLocalPreview() {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = null;
    }
    if (elements.localPreview) {
      elements.localPreview.classList.add("hidden");
      elements.localPreview.removeAttribute("src");
    }
  }

  function updatePromptNotice(hasPrompt: boolean) {
    if (!elements.promptNotice) return;
    elements.promptNotice.textContent = hasPrompt
      ? "Tweak as needed, then copy into your image tool."
      : "Generate a prompt to describe the hero artwork you plan to create.";
  }

  function updatePreview(post: HeroAdminPost) {
    if (!elements.heroPreview) return;
    if (post.status?.hasImage) {
      const src = ensureLeadingSlash(post.heroSrc || `/hero-images/${post.slug}${post.heroExt || ".png"}`);
      elements.heroPreview.src = src;
      elements.heroPreview.alt = post.heroAlt || `${post.title} — hero image`;
      elements.heroPreview.classList.remove("hidden");
    } else {
      elements.heroPreview.classList.add("hidden");
      elements.heroPreview.removeAttribute("src");
    }
  }

  function updateSnippet() {
    const post = state.selected;
    if (!post || !elements.snippet) return;
    const promptValue = elements.promptArea?.value.trim() ?? "";
    const altValue = (elements.altInput?.value.trim() || "") || promptValue || `${post.title} — hero image`;
    const safeAlt = altValue.replace(/'/g, "''");
    const heroPath = inferHeroPath(post);

    let snippet = "";
    if (promptValue) {
      snippet += "heroImagePrompt: |\n";
      snippet += promptValue
        .split(/\r?\n/)
        .map((line) => `  ${line}`)
        .join("\n");
      snippet += "\n";
    } else {
      snippet += "heroImagePrompt: ''\n";
    }
    snippet += `heroImageSrc: ${heroPath}\n`;
    snippet += `heroImageAlt: '${safeAlt}'`;

    elements.snippet.value = snippet;

    post.heroPrompt = promptValue || null;
    post.heroAlt = altValue;
    post.heroSrc = heroPath;
    post.heroFile = heroPath.replace(/^\/+/, "");
    post.status.hasPrompt = promptValue.length > 0;
    post.status.hasAlt = altValue.trim().length > 0;

    updateBadges(post);
    renderList();
  }

  function resetFileUI(post: HeroAdminPost | null) {
    state.pendingFile = null;
    if (elements.fileInput) {
      elements.fileInput.value = "";
    }
    resetLocalPreview();

    if (elements.fileStatus) {
      elements.fileStatus.textContent = "No file selected yet.";
    }

    if (elements.uploadStatus) {
      if (post?.status?.hasImage) {
        elements.uploadStatus.textContent = "Hero image already present.";
        elements.uploadStatus.style.color = "#065f46";
      } else {
        elements.uploadStatus.textContent = "Upload pending.";
        elements.uploadStatus.style.color = "#374151";
      }
    }

    if (elements.fileHelp) {
      const ext = post?.heroExt?.startsWith(".") ? post.heroExt : `.${post?.heroExt || "png"}`;
      const slug = post ? post.slug : "slug";
      elements.fileHelp.textContent = `File will save as public/hero-images/${slug}${ext}`;
    }
  }

  function renderList() {
    if (!elements.list) return;
    if (!state.filtered.length) {
      elements.list.innerHTML =
        state.posts.length === 0
          ? '<p class="px-4 py-6 text-sm text-gray-600">No posts yet. Ingest a PostSpec to populate this list.</p>'
          : '<p class="px-4 py-6 text-sm text-gray-600">No matches for "' +
            escapeHtml(elements.search?.value.trim().toLowerCase() || "") +
            '".</p>';
      return;
    }

    const html = state.filtered
      .map((post) => {
        const active = state.selected && state.selected.slug === post.slug;
        const base = "w-full text-left transition border rounded-xl px-3 py-3 mb-2 last:mb-0";
        const classes = active
          ? `${base} border-purple-300 bg-purple-50`
          : `${base} border-transparent bg-white hover:border-purple-200 hover:bg-purple-50`;
        return `
          <button type="button" data-slug="${escapeHtml(post.slug)}" class="${classes}">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-gray-900">${escapeHtml(post.title)}</div>
                <div class="text-xs text-gray-600">${escapeHtml(post.slug)}</div>
                <div class="mt-1 flex flex-wrap gap-1">
                  ${badge("Prompt", Boolean(post.status?.hasPrompt))}
                  ${badge("Image", Boolean(post.status?.hasImage))}
                  ${badge("Alt", Boolean(post.status?.hasAlt))}
                </div>
              </div>
              <div class="text-[11px] text-gray-500">${post.publishedAt ? formatDate(post.publishedAt) : "Draft"}</div>
            </div>
          </button>
        `;
      })
      .join("");

    elements.list.innerHTML = html;
    const buttons = elements.list.querySelectorAll<HTMLButtonElement>("button[data-slug]");
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const slug = button.getAttribute("data-slug");
        if (slug) {
          selectPost(slug);
        }
      });
    });
  }

  function applyAltFromPost(post: HeroAdminPost) {
    if (!elements.altInput) return;
    const baseAlt = post.heroAlt?.trim() || post.heroPrompt || `${post.title} — hero image`;
    elements.altInput.value = baseAlt;
    elements.altInput.disabled = false;
    if (elements.altNotice) {
      elements.altNotice.textContent =
        "We pre-fill from existing alt text or the generated prompt. Adjust it so it clearly describes the uploaded art.";
    }
  }

  function selectPost(slug: string) {
    const post = state.posts.find((item) => item.slug === slug);
    if (!post) return;
    state.selected = post;

    if (elements.emptyState) elements.emptyState.classList.add("hidden");
    if (elements.workflow) elements.workflow.classList.remove("hidden");

    if (elements.title) elements.title.textContent = post.title;
    if (elements.slug) elements.slug.textContent = post.slug;

    if (elements.publishedWrap && elements.published) {
      if (post.publishedAt) {
        elements.publishedWrap.classList.remove("hidden");
        elements.published.textContent = formatDate(post.publishedAt);
      } else {
        elements.publishedWrap.classList.add("hidden");
        elements.published.textContent = "";
      }
    }

    if (elements.promptArea) {
      elements.promptArea.value = post.heroPrompt || "";
    }

    if (elements.copyPrompt) {
      elements.copyPrompt.disabled = !post.heroPrompt;
    }

    updatePromptNotice(Boolean(post.heroPrompt));
    resetFileUI(post);
    updatePreview(post);
    applyAltFromPost(post);

    if (elements.statusBar) {
      elements.statusBar.textContent = "";
      elements.statusBar.style.color = "#374151";
    }

    updateBadges(post);
    updateSnippet();
  }

  elements.promptArea?.addEventListener("input", () => {
    if (!state.selected) return;
    state.selected.heroPrompt = elements.promptArea?.value.trim() || null;
    state.selected.status.hasPrompt = Boolean(state.selected.heroPrompt);
    updatePromptNotice(Boolean(state.selected.heroPrompt));
    if (elements.copyPrompt) {
      elements.copyPrompt.disabled = !state.selected.heroPrompt;
    }
    updateSnippet();
  });

  elements.generatePrompt?.addEventListener("click", () => {
    if (!state.selected || !elements.promptArea) return;
    const prompt = buildPromptFromContext(state.selected);
    elements.promptArea.value = prompt;
    state.selected.heroPrompt = prompt;
    state.selected.status.hasPrompt = true;
    if (elements.copyPrompt) {
      elements.copyPrompt.disabled = false;
    }
    updatePromptNotice(true);
    updateSnippet();
    showStatus("Prompt generated ✓");
  });

  elements.copyPrompt?.addEventListener("click", () => {
    if (!state.selected || !elements.promptArea) return;
    const value = elements.promptArea.value.trim();
    if (!value) {
      showStatus("Nothing to copy — generate a prompt first.", true);
      return;
    }
    copyToClipboard(value)
      .then(() => showStatus("Hero prompt copied to clipboard ✓"))
      .catch((error) => {
        console.error(error);
        showStatus("Copy failed. Select the text and copy manually.", true);
      });
  });

  elements.fileInput?.addEventListener("change", () => {
    if (!state.selected || !elements.fileInput) return;
    const files = elements.fileInput.files;
    if (!files || !files.length) {
      resetFileUI(state.selected);
      return;
    }

    state.pendingFile = files[0];
    const ext = `.${state.pendingFile.name.split(".").pop() || "png"}`.toLowerCase();
    state.selected.heroExt = ext === ".jpeg" ? ".jpg" : ext;

    if (elements.fileStatus) {
      const sizeKb = Math.round(state.pendingFile.size / 1024);
      elements.fileStatus.textContent = `Ready to upload: ${state.pendingFile.name} (${sizeKb} KB)`;
    }
    if (elements.fileHelp) {
      elements.fileHelp.textContent = `File will save as public/hero-images/${state.selected.slug}${state.selected.heroExt}`;
    }
    resetLocalPreview();
    try {
      state.previewUrl = URL.createObjectURL(state.pendingFile);
      if (elements.localPreview && state.previewUrl) {
        elements.localPreview.src = state.previewUrl;
        elements.localPreview.classList.remove("hidden");
      }
    } catch (error) {
      console.warn("Preview failed", error);
    }
    if (elements.uploadStatus) {
      elements.uploadStatus.textContent = "Ready to upload.";
      elements.uploadStatus.style.color = "#374151";
    }
  });

  elements.uploadButton?.addEventListener("click", () => {
    if (!state.selected) return;
    if (!state.pendingFile) {
      showStatus("Select a file to upload first.", true);
      return;
    }

    const form = new FormData();
    form.append("slug", state.selected.slug);
    form.append("file", state.pendingFile);
    form.append("fileName", state.pendingFile.name || "");

    const headers: Record<string, string> = {};
    if (state.adminKey) {
      headers["x-admin-key"] = state.adminKey;
    }

    if (elements.uploadButton) {
      elements.uploadButton.disabled = true;
      elements.uploadButton.style.opacity = "0.6";
    }
    if (elements.uploadStatus) {
      elements.uploadStatus.textContent = "Uploading…";
      elements.uploadStatus.style.color = "#374151";
    }

    fetch("/api/admin/hero-upload.json", {
      method: "POST",
      body: form,
      headers,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Upload failed (${response.status})`);
        }
        return response.json();
      })
      .then((payload) => {
        if (!payload?.ok) {
          throw new Error(payload?.error || "Upload failed");
        }
        state.selected!.heroFile = payload.heroPath;
        state.selected!.heroSrc = payload.heroSrc;
        if (payload.fileName?.includes(".")) {
          const ext = `.${payload.fileName.split(".").pop()}`.toLowerCase();
          state.selected!.heroExt = ext === ".jpeg" ? ".jpg" : ext;
        }
        state.selected!.status.hasImage = true;
        updatePreview(state.selected!);
        updateSnippet();
        renderList();
        if (elements.uploadStatus) {
          elements.uploadStatus.textContent = "Hero image uploaded ✓";
          elements.uploadStatus.style.color = "#065f46";
        }
        showStatus("Hero image uploaded ✓");
        resetFileUI(state.selected!);
      })
      .catch((error) => {
        console.error(error);
        if (elements.uploadStatus) {
          elements.uploadStatus.textContent = error?.message || "Upload failed.";
          elements.uploadStatus.style.color = "#7f1d1d";
        }
        showStatus("Upload failed. Check the console for details.", true);
      })
      .finally(() => {
        if (elements.uploadButton) {
          elements.uploadButton.disabled = false;
          elements.uploadButton.style.opacity = "1";
        }
      });
  });

  elements.altInput?.addEventListener("input", () => {
    updateSnippet();
  });

  elements.copySnippet?.addEventListener("click", () => {
    if (!state.selected || !elements.snippet) return;
    const value = elements.snippet.value.trim();
    if (!value) {
      showStatus("Snippet is empty.", true);
      return;
    }
    copyToClipboard(value)
      .then(() => showStatus("Frontmatter snippet copied ✓"))
      .catch((error) => {
        console.error(error);
        showStatus("Copy failed. Select the text and copy manually.", true);
      });
  });

  elements.search?.addEventListener("input", () => {
    const query = elements.search?.value.trim().toLowerCase() || "";
    state.filtered = state.posts.filter((post) => {
      if (!query) return true;
      return post.title.toLowerCase().includes(query) || post.slug.toLowerCase().includes(query);
    });
    renderList();
  });

  state.filtered = state.posts;
  renderList();
  if (state.posts.length) {
    selectPost(state.posts[0].slug);
  }
});
