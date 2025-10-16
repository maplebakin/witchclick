function initPostEditorDashboard() {
  const root = document.querySelector('[data-post-editor]');
  if (!root) return;

  const DEV_API = root.getAttribute('data-dev-api') || 'http://localhost:8787';
  const listEl = root.querySelector<HTMLSelectElement>('[data-post-list]');
  const searchInput = root.querySelector<HTMLInputElement>('[data-search]');
  const refreshButton = root.querySelector<HTMLButtonElement>('[data-refresh]');
  const frontmatterTextarea = root.querySelector<HTMLTextAreaElement>('[data-frontmatter]');
  const markdownTextarea = root.querySelector<HTMLTextAreaElement>('[data-markdown]');
  const saveButton = root.querySelector<HTMLButtonElement>('[data-save]');
  const deleteButton = root.querySelector<HTMLButtonElement>('[data-delete]');
  const statusEl = root.querySelector<HTMLDivElement>('[data-status]');
  const warningsList = root.querySelector<HTMLUListElement>('[data-warnings]');
  const metaEl = root.querySelector<HTMLParagraphElement>('[data-meta]');
  const listStatusEl = root.querySelector<HTMLParagraphElement>('[data-list-status]');

  let posts: { slug: string; title: string }[] = [];
  let filteredPosts: { slug: string; title: string }[] = [];
  let currentSlug = '';
  let isLoadingPost = false;
  let hasUnsavedChanges = false;

  const statusBase = statusEl?.className ?? '';

  function setStatus(message: string, tone: 'info' | 'success' | 'error' = 'info') {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    let toneClass = '';
    if (tone === 'error') toneClass = 'text-warning';
    else if (tone === 'success') toneClass = 'text-surface-success';
    else toneClass = 'text-body-muted';
    statusEl.className = [statusBase || 'text-sm text-body-muted', toneClass].filter(Boolean).join(' ');
  }

  function setWarnings(warnings?: string[]) {
    if (!warningsList) return;
    warningsList.innerHTML = '';
    if (!Array.isArray(warnings) || warnings.length === 0) {
      warningsList.classList.add('hidden');
      return;
    }
    warningsList.classList.remove('hidden');
    for (const warning of warnings) {
      const li = document.createElement('li');
      li.textContent = warning;
      warningsList.appendChild(li);
    }
  }

  function enableEditor(enabled: boolean) {
    const elements = [frontmatterTextarea, markdownTextarea, saveButton, deleteButton];
    for (const el of elements) {
      if (!el) continue;
      el.disabled = !enabled;
    }
    if (!enabled) {
      if (frontmatterTextarea) frontmatterTextarea.value = '';
      if (markdownTextarea) markdownTextarea.value = '';
      if (metaEl) metaEl.textContent = 'Select a post to view its metadata.';
    }
  }

  function renderList(options: { preserveSelection?: boolean } = {}) {
    if (!listEl) return;
    const query = (searchInput?.value || '').trim().toLowerCase();
    filteredPosts = posts.filter((item) => {
      if (!query) return true;
      return item.title.toLowerCase().includes(query) || item.slug.includes(query);
    });

    listEl.innerHTML = '';
    for (const item of filteredPosts) {
      const option = document.createElement('option');
      option.value = item.slug;
      option.textContent = `${item.title} — ${item.slug}`;
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

  function updateMeta(info?: { path?: string; updatedAt?: string }) {
    if (!metaEl) return;
    if (!info) {
      metaEl.textContent = 'Select a post to view its metadata.';
      return;
    }
    const parts: string[] = [];
    if (info.path) parts.push(info.path);
    if (info.updatedAt) {
      const formatted = new Date(info.updatedAt).toLocaleString();
      parts.push(`Updated ${formatted}`);
    }
    metaEl.textContent = parts.length ? parts.join(' • ') : 'Select a post to view its metadata.';
  }

  async function fetchList() {
    if (!listEl) return;
    try {
      if (refreshButton) refreshButton.disabled = true;
      setStatus('Loading posts…');
      const res = await fetch(`${DEV_API}/posts/list`, { method: 'POST' });
      const data = await res.json();
      if (!data?.ok) {
        throw new Error(data?.error || 'Unable to load posts');
      }
      posts = Array.isArray(data.items)
        ? data.items.map((item: any) => ({
            slug: String(item?.slug || ''),
            title: String(item?.title || String(item?.slug || 'Untitled post')),
          }))
        : [];
      posts.sort((a, b) => a.title.localeCompare(b.title));
      renderList({ preserveSelection: !!currentSlug });
      setStatus(`Loaded ${posts.length} posts.`, 'success');
    } catch (error: any) {
      setStatus(error?.message || 'Failed to load posts', 'error');
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  async function loadPost(slug: string) {
    if (!slug || isLoadingPost) return;
    if (hasUnsavedChanges && slug !== currentSlug) {
      const proceed = window.confirm('Discard unsaved changes?');
      if (!proceed) {
        if (listEl) listEl.value = currentSlug;
        return;
      }
    }
    try {
      isLoadingPost = true;
      enableEditor(false);
      setStatus('Loading post…');
      const res = await fetch(`${DEV_API}/posts/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!data?.ok) {
        throw new Error(data?.error || 'Unable to load post');
      }
      currentSlug = data.slug;
      hasUnsavedChanges = false;
      if (frontmatterTextarea) frontmatterTextarea.value = data.frontmatter || '';
      if (markdownTextarea) markdownTextarea.value = data.markdown || '';
      enableEditor(true);
      if (saveButton) saveButton.disabled = true;
      updateMeta({ path: data.path, updatedAt: data.updatedAt });
      setWarnings();
      setStatus(`Loaded “${data.title || data.slug}”.`, 'success');
    } catch (error: any) {
      setStatus(error?.message || 'Failed to load post', 'error');
    } finally {
      isLoadingPost = false;
    }
  }

  async function saveChanges() {
    if (!frontmatterTextarea || !markdownTextarea || !currentSlug) return;
    try {
      setStatus('Saving changes…');
      setWarnings();
      saveButton && (saveButton.disabled = true);
      const res = await fetch(`${DEV_API}/posts/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalSlug: currentSlug,
          frontmatter: frontmatterTextarea.value,
          markdown: markdownTextarea.value,
        }),
      });
      const data = await res.json();
      if (!data?.ok) {
        throw new Error(data?.error || 'Failed to save');
      }
      currentSlug = data.slug;
      hasUnsavedChanges = false;
      setWarnings(Array.isArray(data.warnings) ? data.warnings : undefined);
      setStatus(`Saved → ${data.path}`, 'success');
      updateMeta({ path: data.path, updatedAt: new Date().toISOString() });
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
    } catch (error: any) {
      setStatus(error?.message || 'Failed to save', 'error');
      if (saveButton) saveButton.disabled = false;
    }
  }

  async function deletePost() {
    if (!currentSlug) return;
    const confirmed = window.confirm(`Delete /post/${currentSlug}? This cannot be undone.`);
    if (!confirmed) return;
    try {
      setStatus('Deleting…');
      const res = await fetch(`${DEV_API}/posts/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: currentSlug }),
      });
      const data = await res.json();
      if (!data?.ok) {
        throw new Error(data?.error || 'Failed to delete');
      }
      setStatus(`Deleted → ${data.path}`, 'success');
      posts = posts.filter((item) => item.slug !== currentSlug);
      currentSlug = '';
      hasUnsavedChanges = false;
      enableEditor(false);
      setWarnings();
      renderList();
    } catch (error: any) {
      setStatus(error?.message || 'Failed to delete', 'error');
    }
  }

  function handleInputChange() {
    hasUnsavedChanges = true;
    if (saveButton) saveButton.disabled = false;
    setStatus('Unsaved changes.', 'info');
  }

  refreshButton?.addEventListener('click', () => {
    void fetchList();
  });

  searchInput?.addEventListener('input', () => {
    renderList({ preserveSelection: true });
  });

  listEl?.addEventListener('change', (event) => {
    const select = event.currentTarget as HTMLSelectElement | null;
    const nextSlug = select?.value || '';
    void loadPost(nextSlug);
  });

  saveButton?.addEventListener('click', (event) => {
    event.preventDefault();
    void saveChanges();
  });

  deleteButton?.addEventListener('click', (event) => {
    event.preventDefault();
    void deletePost();
  });

  frontmatterTextarea?.addEventListener('input', handleInputChange);
  markdownTextarea?.addEventListener('input', handleInputChange);

  enableEditor(false);
  void fetchList();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPostEditorDashboard);
  } else {
    initPostEditorDashboard();
  }
}
