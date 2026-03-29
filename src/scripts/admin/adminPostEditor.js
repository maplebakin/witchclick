function initPostEditorDashboard() {
  const root = document.querySelector("[data-post-editor]");
  if (!root) return;
  const DEV_API = root.getAttribute("data-dev-api") || "http://localhost:8787";
  const DEV_KEY = root.getAttribute("data-dev-key") || "";
  const baseHeaders = DEV_KEY ? { "X-WC-Dev-Key": DEV_KEY } : {};
  const jsonHeaders = { "Content-Type": "application/json", ...baseHeaders };
  function apiFetch(path, options = {}) {
    const headers = { ...baseHeaders, ...options.headers || {} };
    return fetch(`${DEV_API}${path}`, { ...options, headers });
  }
  const listEl = root.querySelector("[data-post-list]");
  const searchInput = root.querySelector("[data-search]");
  const refreshButton = root.querySelector("[data-refresh]");
  const frontmatterTextarea = root.querySelector("[data-frontmatter]");
  const markdownTextarea = root.querySelector("[data-markdown]");
  const saveButton = root.querySelector("[data-save]");
  const deleteButton = root.querySelector("[data-delete]");
  const statusEl = root.querySelector("[data-status]");
  const warningsList = root.querySelector("[data-warnings]");
  const metaEl = root.querySelector("[data-meta]");
  const listStatusEl = root.querySelector("[data-list-status]");
  let posts = [];
  let filteredPosts = [];
  let currentSlug = "";
  let isLoadingPost = false;
  let hasUnsavedChanges = false;
  const statusBase = statusEl?.className ?? "";
  function setStatus(message, tone = "info", actions) {
    if (!statusEl) return;
    statusEl.innerHTML = "";
    let toneClass = "";
    if (tone === "error") toneClass = "text-warning";
    else if (tone === "success") toneClass = "text-surface-success";
    else toneClass = "text-body-muted";
    statusEl.className = [statusBase || "text-sm text-body-muted", toneClass].filter(Boolean).join(" ");
    if (message) {
      const span = document.createElement("span");
      span.textContent = message;
      statusEl.appendChild(span);
    }
    if (tone === "success" && actions) {
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "mt-3 flex flex-wrap gap-2";
      const previewBtn = document.createElement("a");
      previewBtn.href = `/post/${actions.slug}`;
      previewBtn.target = "_blank";
      previewBtn.rel = "noopener";
      previewBtn.className = "inline-flex items-center gap-1.5 rounded-lg border border-line-neutral bg-surface-base px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-soft";
      previewBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>Preview Post`;
      const heroBtn = document.createElement("a");
      heroBtn.href = `/admin/hero?post=${encodeURIComponent(actions.slug)}`;
      heroBtn.className = "inline-flex items-center gap-1.5 rounded-lg border border-line-neutral bg-surface-base px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-soft";
      heroBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>Upload Hero Image`;
      actionsDiv.appendChild(previewBtn);
      actionsDiv.appendChild(heroBtn);
      statusEl.appendChild(actionsDiv);
    }
  }
  function setWarnings(warnings) {
    if (!warningsList) return;
    warningsList.innerHTML = "";
    if (!Array.isArray(warnings) || warnings.length === 0) {
      warningsList.classList.add("hidden");
      return;
    }
    warningsList.classList.remove("hidden");
    for (const warning of warnings) {
      const li = document.createElement("li");
      li.textContent = warning;
      warningsList.appendChild(li);
    }
  }
  function enableEditor(enabled) {
    const elements = [frontmatterTextarea, markdownTextarea, saveButton, deleteButton];
    for (const el of elements) {
      if (!el) continue;
      el.disabled = !enabled;
    }
    if (!enabled) {
      if (frontmatterTextarea) frontmatterTextarea.value = "";
      if (markdownTextarea) markdownTextarea.value = "";
      if (metaEl) metaEl.textContent = "Select a post to view its metadata.";
    }
  }
  function renderList(options = {}) {
    if (!listEl) return;
    const query = (searchInput?.value || "").trim().toLowerCase();
    filteredPosts = posts.filter((item) => {
      if (!query) return true;
      return item.title.toLowerCase().includes(query) || item.slug.includes(query);
    });
    listEl.innerHTML = "";
    for (const item of filteredPosts) {
      const option = document.createElement("option");
      option.value = item.slug;
      option.textContent = `${item.title} \u2014 ${item.slug}`;
      if (options.preserveSelection && item.slug === currentSlug) {
        option.selected = true;
      }
      listEl.appendChild(option);
    }
    const totalText = `${filteredPosts.length} of ${posts.length} posts shown`;
    if (listStatusEl) listStatusEl.textContent = totalText;
    if (!options.preserveSelection && listEl.options.length > 0) {
      listEl.selectedIndex = 0;
      if (!hasUnsavedChanges) {
        void loadPost(listEl.value);
      }
    }
  }
  function updateMeta(info) {
    if (!metaEl) return;
    if (!info) {
      metaEl.textContent = "Select a post to view its metadata.";
      return;
    }
    const parts = [];
    if (info.path) parts.push(info.path);
    if (info.updatedAt) {
      const formatted = new Date(info.updatedAt).toLocaleString();
      parts.push(`Updated ${formatted}`);
    }
    metaEl.textContent = parts.length ? parts.join(" \u2022 ") : "Select a post to view its metadata.";
  }
  async function fetchList() {
    if (!listEl) return;
    try {
      if (refreshButton) refreshButton.disabled = true;
      setStatus("Loading posts\u2026");
      const res = await apiFetch("/posts/list", { method: "POST" });
      const data = await res.json();
      if (!data?.ok) {
        throw new Error(data?.error || "Unable to load posts");
      }
      posts = Array.isArray(data.items) ? data.items.map((item) => ({
        slug: String(item?.slug || ""),
        title: String(item?.title || String(item?.slug || "Untitled post"))
      })) : [];
      posts.sort((a, b) => a.title.localeCompare(b.title));
      renderList({ preserveSelection: !!currentSlug });
      const urlParams = new URLSearchParams(window.location.search);
      const preselect = urlParams.get("slug");
      if (preselect && listEl) {
        const found = posts.find((p) => p.slug === preselect);
        if (found) {
          listEl.value = preselect;
          void loadPost(preselect);
          setStatus("Post pre-selected from URL.", "info");
        }
      } else {
        setStatus(`Loaded ${posts.length} posts.`, "success");
      }
    } catch (error) {
      setStatus(error?.message || "Failed to load posts", "error");
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }
  async function loadPost(slug) {
    if (!slug || isLoadingPost) return;
    if (hasUnsavedChanges && slug !== currentSlug) {
      const proceed = window.confirm("Discard unsaved changes?");
      if (!proceed) {
        if (listEl) listEl.value = currentSlug;
        return;
      }
    }
    try {
      isLoadingPost = true;
      enableEditor(false);
      setStatus("Loading post\u2026");
      const res = await apiFetch("/posts/load", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ slug })
      });
      const data = await res.json();
      if (!data?.ok) {
        throw new Error(data?.error || "Unable to load post");
      }
      currentSlug = data.slug;
      hasUnsavedChanges = false;
      if (frontmatterTextarea) frontmatterTextarea.value = data.frontmatter || "";
      if (markdownTextarea) markdownTextarea.value = data.markdown || "";
      enableEditor(true);
      if (saveButton) saveButton.disabled = true;
      updateMeta({ path: data.path, updatedAt: data.updatedAt });
      setWarnings();
      setStatus(`Loaded \u201C${data.title || data.slug}\u201D.`, "success");
    } catch (error) {
      setStatus(error?.message || "Failed to load post", "error");
    } finally {
      isLoadingPost = false;
    }
  }
  async function saveChanges() {
    if (!frontmatterTextarea || !markdownTextarea || !currentSlug) return;
    try {
      setStatus("Saving changes\u2026");
      setWarnings();
      saveButton && (saveButton.disabled = true);
      const res = await apiFetch("/posts/update", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          originalSlug: currentSlug,
          frontmatter: frontmatterTextarea.value,
          markdown: markdownTextarea.value
        })
      });
      const data = await res.json();
      if (!data?.ok) {
        throw new Error(data?.error || "Failed to save");
      }
      currentSlug = data.slug;
      hasUnsavedChanges = false;
      setWarnings(Array.isArray(data.warnings) ? data.warnings : void 0);
      setStatus(`\u2713 Saved \u2192 ${data.path}`, "success", { slug: data.slug });
      updateMeta({ path: data.path, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      if (listEl) listEl.value = currentSlug;
      const existing = posts.find((item) => item.slug === data.slug);
      if (existing) {
        existing.title = String(data.title || existing.title || data.slug);
      } else {
        posts.push({ slug: data.slug, title: String(data.title || data.slug) });
      }
      posts = posts.filter((item) => !!item.slug);
      posts.sort((a, b) => a.title.localeCompare(b.title));
      renderList({ preserveSelection: true });
    } catch (error) {
      setStatus(error?.message || "Failed to save", "error");
      if (saveButton) saveButton.disabled = false;
    }
  }
  async function deletePost() {
    if (!currentSlug) return;
    const confirmed = window.confirm(`Delete /post/${currentSlug}? This cannot be undone.`);
    if (!confirmed) return;
    try {
      setStatus("Deleting\u2026");
      const res = await apiFetch("/posts/delete", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ slug: currentSlug })
      });
      const data = await res.json();
      if (!data?.ok) {
        throw new Error(data?.error || "Failed to delete");
      }
      setStatus(`Deleted \u2192 ${data.path}`, "success");
      posts = posts.filter((item) => item.slug !== currentSlug);
      currentSlug = "";
      hasUnsavedChanges = false;
      enableEditor(false);
      setWarnings();
      renderList();
    } catch (error) {
      setStatus(error?.message || "Failed to delete", "error");
    }
  }
  function handleInputChange() {
    hasUnsavedChanges = true;
    if (saveButton) saveButton.disabled = false;
    setStatus("Unsaved changes.", "info");
  }
  refreshButton?.addEventListener("click", () => {
    void fetchList();
  });
  searchInput?.addEventListener("input", () => {
    renderList({ preserveSelection: true });
  });
  listEl?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    const nextSlug = select?.value || "";
    void loadPost(nextSlug);
  });
  saveButton?.addEventListener("click", (event) => {
    event.preventDefault();
    void saveChanges();
  });
  deleteButton?.addEventListener("click", (event) => {
    event.preventDefault();
    void deletePost();
  });
  frontmatterTextarea?.addEventListener("input", handleInputChange);
  markdownTextarea?.addEventListener("input", handleInputChange);
  enableEditor(false);
  void fetchList();
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPostEditorDashboard);
  } else {
    initPostEditorDashboard();
  }
}
