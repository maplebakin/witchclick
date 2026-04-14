function initPostEditorDashboard() {
  const root = document.querySelector('[data-post-editor]');
  if (!root) return;
  const FILTER_STORAGE_KEY = 'witchclick:admin-post-editor-filters';

  const DEV_API = root.getAttribute('data-dev-api') || 'http://localhost:8787';
  const DEV_KEY = root.getAttribute('data-dev-key') || '';
  const baseHeaders: Record<string, string> = DEV_KEY ? { 'X-WC-Dev-Key': DEV_KEY } : {};
  const jsonHeaders = { 'Content-Type': 'application/json', ...baseHeaders };
  type StatusFilterValue = 'all' | 'published' | 'draft';
  type HeroFilterValue = 'all' | 'missing' | 'has';
  type SortValue = 'az' | 'za' | 'newest' | 'oldest';
  type PostListItem = {
    slug: string;
    title: string;
    draft: boolean;
    heroImage: string;
    excerpt: string;
    tags: string[];
    publishedAt: string;
    createdAt: string;
  };
  type FilterState = {
    status: StatusFilterValue;
    hero: HeroFilterValue;
    sort: SortValue;
  };

  function apiFetch(path: string, options: RequestInit = {}) {
    const headers = { ...baseHeaders, ...(options.headers || {}) };
    return fetch(`${DEV_API}${path}`, { ...options, headers });
  }
  const listEl = root.querySelector<HTMLSelectElement>('[data-post-list]');
  const searchInput = root.querySelector<HTMLInputElement>('[data-search]');
  const statusFilter = root.querySelector<HTMLSelectElement>('[data-status-filter]');
  const heroFilter = root.querySelector<HTMLSelectElement>('[data-hero-filter]');
  const sortSelect = root.querySelector<HTMLSelectElement>('[data-sort]');
  const refreshButton = root.querySelector<HTMLButtonElement>('[data-refresh]');
  const frontmatterTextarea = root.querySelector<HTMLTextAreaElement>('[data-frontmatter]');
  const markdownTextarea = root.querySelector<HTMLTextAreaElement>('[data-markdown]');
  const saveButton = root.querySelector<HTMLButtonElement>('[data-save]');
  const deleteButton = root.querySelector<HTMLButtonElement>('[data-delete]');
  const tumblrButton = root.querySelector<HTMLButtonElement>('[data-tumblr-push]');
  const statusEl = root.querySelector<HTMLDivElement>('[data-status]');
  const tumblrStatusEl = root.querySelector<HTMLDivElement>('[data-tumblr-status]');
  const warningsList = root.querySelector<HTMLUListElement>('[data-warnings]');
  const metaEl = root.querySelector<HTMLParagraphElement>('[data-meta]');
  const listStatusEl = root.querySelector<HTMLParagraphElement>('[data-list-status]');

  let posts: PostListItem[] = [];
  let filteredPosts: PostListItem[] = [];
  let currentSlug = '';
  let isLoadingPost = false;
  let isSavingPost = false;
  let isTumblrPushing = false;
  let hasUnsavedChanges = false;

  const statusBase = statusEl?.className ?? '';
  const tumblrStatusBase = tumblrStatusEl?.className ?? '';

  function normalizeStatusFilter(value: string | null | undefined): StatusFilterValue {
    return value === 'published' || value === 'draft' ? value : 'all';
  }

  function normalizeHeroFilter(value: string | null | undefined): HeroFilterValue {
    return value === 'missing' || value === 'has' ? value : 'all';
  }

  function normalizeSort(value: string | null | undefined): SortValue {
    return value === 'za' || value === 'newest' || value === 'oldest' ? value : 'az';
  }

  function getFilterState(): FilterState {
    return {
      status: normalizeStatusFilter(statusFilter?.value),
      hero: normalizeHeroFilter(heroFilter?.value),
      sort: normalizeSort(sortSelect?.value),
    };
  }

  function applyStoredFilterState() {
    try {
      const raw = window.sessionStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<FilterState> | null;
      if (statusFilter) statusFilter.value = normalizeStatusFilter(parsed?.status);
      if (heroFilter) heroFilter.value = normalizeHeroFilter(parsed?.hero);
      if (sortSelect) sortSelect.value = normalizeSort(parsed?.sort);
    } catch {
      if (statusFilter) statusFilter.value = 'all';
      if (heroFilter) heroFilter.value = 'all';
      if (sortSelect) sortSelect.value = 'az';
    }
  }

  function persistFilterState() {
    try {
      window.sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(getFilterState()));
    } catch {
      // Ignore storage failures
    }
  }

  function getTimestamp(value: string): number {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function setStatus(message: string, tone: 'info' | 'success' | 'error' = 'info', actions?: { slug: string }) {
    if (!statusEl) return;
    statusEl.innerHTML = '';
    let toneClass = '';
    if (tone === 'error') toneClass = 'text-warning';
    else if (tone === 'success') toneClass = 'text-surface-success';
    else toneClass = 'text-body-muted';
    statusEl.className = [statusBase || 'text-sm text-body-muted', toneClass].filter(Boolean).join(' ');

    if (message) {
      const span = document.createElement('span');
      span.textContent = message;
      statusEl.appendChild(span);
    }

    if (tone === 'success' && actions) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'mt-3 flex flex-wrap gap-2';

      // Preview Post button
      const previewBtn = document.createElement('a');
      previewBtn.href = `/post/${actions.slug}`;
      previewBtn.target = '_blank';
      previewBtn.rel = 'noopener';
      previewBtn.className = 'inline-flex items-center gap-1.5 rounded-lg border border-line-neutral bg-surface-base px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-soft';
      previewBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>Preview Post`;

      // Upload Hero button
      const heroBtn = document.createElement('a');
      heroBtn.href = `/admin/hero?post=${encodeURIComponent(actions.slug)}`;
      heroBtn.className = 'inline-flex items-center gap-1.5 rounded-lg border border-line-neutral bg-surface-base px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-soft';
      heroBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>Upload Hero Image`;

      actionsDiv.appendChild(previewBtn);
      actionsDiv.appendChild(heroBtn);
      statusEl.appendChild(actionsDiv);
    }
  }

  function setTumblrStatus(message: string, tone: 'info' | 'success' | 'error' = 'info', postUrl = '') {
    if (!tumblrStatusEl) return;
    tumblrStatusEl.innerHTML = '';
    let toneClass = '';
    if (tone === 'error') toneClass = 'text-warning';
    else if (tone === 'success') toneClass = 'text-surface-success';
    else toneClass = 'text-body-muted';
    tumblrStatusEl.className = [tumblrStatusBase || 'text-sm text-body-muted', toneClass].filter(Boolean).join(' ');
    if (!message) return;

    const textNode = document.createElement('span');
    textNode.textContent = message;
    tumblrStatusEl.appendChild(textNode);

    if (tone === 'success' && postUrl) {
      const spacer = document.createTextNode(' ');
      const link = document.createElement('a');
      link.href = postUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.className = 'font-semibold text-primary hover:underline';
      link.textContent = 'View on Tumblr';
      tumblrStatusEl.appendChild(spacer);
      tumblrStatusEl.appendChild(link);
    }
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
    const elements = [frontmatterTextarea, markdownTextarea, saveButton, deleteButton, tumblrButton];
    for (const el of elements) {
      if (!el) continue;
      el.disabled = !enabled;
    }
    if (tumblrButton && isTumblrPushing) {
      tumblrButton.disabled = true;
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
    const filters = getFilterState();
    filteredPosts = posts
      .filter((item) => {
        const matchesQuery = !query || item.title.toLowerCase().includes(query) || item.slug.includes(query);
        const matchesStatus =
          filters.status === 'all' ||
          (filters.status === 'draft' ? item.draft : !item.draft);
        const hasHero = !!item.heroImage;
        const matchesHero =
          filters.hero === 'all' ||
          (filters.hero === 'missing' ? !hasHero : hasHero);
        return matchesQuery && matchesStatus && matchesHero;
      })
      .sort((a, b) => {
        if (filters.sort === 'za') {
          return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
        }
        if (filters.sort === 'newest') {
          return getTimestamp(b.publishedAt || b.createdAt) - getTimestamp(a.publishedAt || a.createdAt);
        }
        if (filters.sort === 'oldest') {
          return getTimestamp(a.publishedAt || a.createdAt) - getTimestamp(b.publishedAt || b.createdAt);
        }
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
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

    const totalText = `${filteredPosts.length} of ${posts.length} posts`;
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
      const res = await apiFetch('/posts/list', { method: 'POST' });
      const data = await res.json();
      if (!data?.ok) {
        throw new Error(data?.error || 'Unable to load posts');
      }
      posts = Array.isArray(data.items)
        ? data.items.map((item: any) => ({
            slug: String(item?.slug || ''),
            title: String(item?.title || String(item?.slug || 'Untitled post')),
            draft: item?.draft === true,
            heroImage: String(item?.heroImage || ''),
            excerpt: String(item?.excerpt || item?.metaDescription || ''),
            tags: Array.isArray(item?.tags) ? item.tags.map((tag: unknown) => String(tag || '').trim()).filter(Boolean) : [],
            publishedAt: String(item?.publishedAt || item?.pubDate || ''),
            createdAt: String(item?.createdAt || ''),
          }))
        : [];
      renderList({ preserveSelection: !!currentSlug });

      // Check for ?slug=post-slug URL parameter and pre-select
      const urlParams = new URLSearchParams(window.location.search);
      const preselect = urlParams.get('slug');
      if (preselect && listEl) {
        const found = posts.find((p) => p.slug === preselect);
        if (found) {
          listEl.value = preselect;
          void loadPost(preselect);
          setStatus('Post pre-selected from URL.', 'info');
        }
      } else {
        setStatus(`Loaded ${posts.length} posts.`, 'success');
      }
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
      const res = await apiFetch('/posts/load', {
        method: 'POST',
        headers: jsonHeaders,
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
      if (tumblrButton) tumblrButton.disabled = false;
      updateMeta({ path: data.path, updatedAt: data.updatedAt });
      setWarnings();
      setTumblrStatus('');
      setStatus(`Loaded “${data.title || data.slug}”.`, 'success');
    } catch (error: any) {
      setStatus(error?.message || 'Failed to load post', 'error');
    } finally {
      isLoadingPost = false;
    }
  }

  async function saveChanges() {
    if (!frontmatterTextarea || !markdownTextarea || !currentSlug || isSavingPost) return;
    try {
      isSavingPost = true;
      setStatus('Saving changes…');
      setWarnings();
      saveButton && (saveButton.disabled = true);
      const res = await apiFetch('/posts/update', {
        method: 'POST',
        headers: jsonHeaders,
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
      setStatus(`✓ Saved → ${data.path}`, 'success', { slug: data.slug });
      updateMeta({ path: data.path, updatedAt: new Date().toISOString() });
      if (listEl) listEl.value = currentSlug;
      const existing = posts.find((item) => item.slug === data.slug);
      if (existing) {
        existing.title = String(data.title || existing.title || data.slug);
      } else {
        posts.push({
          slug: data.slug,
          title: String(data.title || data.slug),
          draft: false,
          heroImage: '',
          excerpt: '',
          tags: [],
          publishedAt: '',
          createdAt: '',
        });
      }
      posts = posts.filter((item) => !!item.slug);
      renderList({ preserveSelection: true });
    } catch (error: any) {
      setStatus(error?.message || 'Failed to save', 'error');
      if (saveButton) saveButton.disabled = false;
    } finally {
      isSavingPost = false;
    }
  }

  async function deletePost() {
    if (!currentSlug) return;
    const confirmed = window.confirm(`Delete /post/${currentSlug}? This cannot be undone.`);
    if (!confirmed) return;
    try {
      setStatus('Deleting…');
      const res = await apiFetch('/posts/delete', {
        method: 'POST',
        headers: jsonHeaders,
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
      setTumblrStatus('');
      setWarnings();
      renderList();
    } catch (error: any) {
      setStatus(error?.message || 'Failed to delete', 'error');
    }
  }

  function parseYamlScalarValue(raw: string): string {
    const value = String(raw || '').trim();
    if (!value) return '';
    const singleQuoted = value.startsWith("'") && value.endsWith("'");
    const doubleQuoted = value.startsWith('"') && value.endsWith('"');
    if (singleQuoted || doubleQuoted) {
      return value.slice(1, -1).trim();
    }
    return value;
  }

  function parseFrontmatterScalar(frontmatter: string, key: string): string {
    const pattern = new RegExp(`^${key}:\\s*(.+)$`, 'im');
    const match = frontmatter.match(pattern);
    if (!match?.[1]) return '';
    return parseYamlScalarValue(match[1]);
  }

  function parseInlineTagList(value: string): string[] {
    const inner = value.trim().replace(/^\[/, '').replace(/\]$/, '');
    if (!inner) return [];
    return inner
      .split(',')
      .map((tag) => parseYamlScalarValue(tag))
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function parseFrontmatterTags(frontmatter: string): string[] {
    const lines = frontmatter.split(/\r?\n/);
    const tags: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const match = line.match(/^tags:\s*(.*)$/i);
      if (!match) continue;

      const rest = String(match[1] || '').trim();
      if (rest.startsWith('[')) {
        return parseInlineTagList(rest);
      }

      let cursor = i + 1;
      while (cursor < lines.length) {
        const next = lines[cursor] ?? '';
        if (/^\s*-\s+/.test(next)) {
          const item = next.replace(/^\s*-\s+/, '');
          const parsed = parseYamlScalarValue(item).trim();
          if (parsed) tags.push(parsed);
          cursor += 1;
          continue;
        }
        if (/^\s*$/.test(next)) {
          cursor += 1;
          continue;
        }
        break;
      }
      return tags;
    }

    return tags;
  }

  function getCurrentPostListItem(): PostListItem | null {
    if (!currentSlug) return null;
    return posts.find((item) => item.slug === currentSlug) || null;
  }

  function buildTumblrPayload() {
    if (!currentSlug) {
      throw new Error('Select a post before pushing to Tumblr.');
    }
    const frontmatter = frontmatterTextarea?.value || '';
    const fallback = getCurrentPostListItem();

    const slug = parseFrontmatterScalar(frontmatter, 'slug') || currentSlug;
    const title = parseFrontmatterScalar(frontmatter, 'title') || fallback?.title || slug;
    const excerpt =
      parseFrontmatterScalar(frontmatter, 'excerpt') ||
      parseFrontmatterScalar(frontmatter, 'metaDescription') ||
      fallback?.excerpt ||
      '';
    const heroImage =
      parseFrontmatterScalar(frontmatter, 'heroImage') ||
      parseFrontmatterScalar(frontmatter, 'heroImageSrc') ||
      fallback?.heroImage ||
      '';
    const tags = parseFrontmatterTags(frontmatter);
    const resolvedTags = tags.length ? tags : (fallback?.tags || []);
    const url = `https://witchclick.space/posts/${encodeURIComponent(slug)}`;

    if (!heroImage) {
      throw new Error('This post is missing a heroImage path.');
    }

    return { slug, title, excerpt, url, heroImage, tags: resolvedTags };
  }

  async function pushCurrentPostToTumblr() {
    if (!tumblrButton || isTumblrPushing) return;
    const defaultLabel = 'Push to Tumblr';

    try {
      isTumblrPushing = true;
      tumblrButton.disabled = true;
      tumblrButton.textContent = 'Pushing…';
      setTumblrStatus('Pushing post to Tumblr…', 'info');

      const payload = buildTumblrPayload();
      const res = await apiFetch('/tumblr-push', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Tumblr push failed.');
      }

      setTumblrStatus('Pushed successfully.', 'success', String(data.postUrl || ''));
    } catch (error: any) {
      setTumblrStatus(error?.message || 'Tumblr push failed.', 'error');
    } finally {
      isTumblrPushing = false;
      tumblrButton.disabled = !currentSlug;
      tumblrButton.textContent = defaultLabel;
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

  statusFilter?.addEventListener('change', () => {
    persistFilterState();
    renderList({ preserveSelection: true });
  });

  heroFilter?.addEventListener('change', () => {
    persistFilterState();
    renderList({ preserveSelection: true });
  });

  sortSelect?.addEventListener('change', () => {
    persistFilterState();
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

  document.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
    if (!currentSlug || isLoadingPost || isSavingPost || !saveButton || saveButton.disabled) return;
    event.preventDefault();
    saveButton.click();
  });

  deleteButton?.addEventListener('click', (event) => {
    event.preventDefault();
    void deletePost();
  });

  tumblrButton?.addEventListener('click', (event) => {
    event.preventDefault();
    void pushCurrentPostToTumblr();
  });

  frontmatterTextarea?.addEventListener('input', handleInputChange);
  markdownTextarea?.addEventListener('input', handleInputChange);

  applyStoredFilterState();
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
