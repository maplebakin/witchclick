function initCursesArchive() {
  const root = document.querySelector<HTMLElement>('[data-curses-archive]');
  if (!root) return;

  const DEV_API = root.getAttribute('data-dev-api') || 'http://localhost:8787';
  const DEV_KEY = root.getAttribute('data-dev-key') || '';
  const baseHeaders: Record<string, string> = DEV_KEY ? { 'X-WC-Dev-Key': DEV_KEY } : {};
  const jsonHeaders = { 'Content-Type': 'application/json', ...baseHeaders };

  function apiFetch(path: string, options: RequestInit = {}) {
    const headers = { ...baseHeaders, ...(options.headers || {}) };
    return fetch(`${DEV_API}${path}`, { ...options, headers });
  }
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector);

  const librarySelect = $('[data-curse-list]') as HTMLSelectElement | null;
  const libraryStatus = $('[data-curse-list-status]');
  const searchInput = $('[data-curse-search]') as HTMLInputElement | null;
  const refreshBtn = $('[data-curse-refresh]') as HTMLButtonElement | null;
  const metaEl = $('[data-curse-meta]');
  const fmTextarea = $('[data-curse-frontmatter]') as HTMLTextAreaElement | null;
  const mdTextarea = $('[data-curse-markdown]') as HTMLTextAreaElement | null;
  const saveBtn = $('[data-curse-save]') as HTMLButtonElement | null;
  const deleteBtn = $('[data-curse-delete]') as HTMLButtonElement | null;
  const editorStatus = $('[data-curse-editor-status]');
  const previewEl = $('[data-curse-preview]');

  let curses: { slug: string; title: string; path?: string }[] = [];
  let filtered: typeof curses = [];
  let currentSlug = '';
  let isSaving = false;

  function setStatus(el: Element | null, message: string, tone: 'info' | 'success' | 'error' = 'info') {
    if (!el) return;
    const toneClass =
      tone === 'error'
        ? 'text-danger'
        : tone === 'success'
          ? 'text-success-emerald'
          : 'text-body-muted';
    (el as HTMLElement).className = `text-sm ${toneClass}`;
    (el as HTMLElement).textContent = message;
  }

  function renderPreview(markdown: string) {
    if (!previewEl) return;
    previewEl.innerHTML = '';
    const text = String(markdown || '').trim();
    if (!text) return;

    const blocks = text.split(/\n##\s+/g);
    blocks.forEach((block, idx) => {
      if (idx === 0 && !block.startsWith('## ')) {
        // possible intro without heading
        if (block.trim()) {
          const p = document.createElement('p');
          p.innerHTML = block.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          previewEl.appendChild(p);
        }
        return;
      }
      const headingEnd = block.indexOf('\n');
      const heading = headingEnd === -1 ? block.trim() : block.slice(0, headingEnd).trim();
      const content = headingEnd === -1 ? '' : block.slice(headingEnd + 1);
      if (heading) {
        const h2 = document.createElement('h2');
        h2.textContent = heading.replace(/^##\s*/, '');
        previewEl.appendChild(h2);
      }
      if (content) {
        const div = document.createElement('div');
        div.innerHTML = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        previewEl.appendChild(div);
      }
    });
  }

  function renderLibrary({ preserve }: { preserve?: boolean } = {}) {
    if (!librarySelect) return;
    const query = (searchInput?.value || '').trim().toLowerCase();
    filtered = curses.filter((item) => {
      if (!query) return true;
      return item.title.toLowerCase().includes(query) || item.slug.includes(query);
    });
    librarySelect.innerHTML = '';
    filtered.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.slug;
      opt.textContent = `${item.title} — ${item.slug}`;
      if (preserve && item.slug === currentSlug) opt.selected = true;
      librarySelect.appendChild(opt);
    });
    if (libraryStatus) {
      libraryStatus.textContent = `${filtered.length} of ${curses.length} curses shown`;
    }
  }

  async function loadLibrary() {
    if (!librarySelect) return;
    try {
      if (refreshBtn) refreshBtn.disabled = true;
      setStatus(libraryStatus, 'Loading curses…');
      const res = await apiFetch('/curses/list', { method: 'POST' });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || 'Unable to load curses');
      curses = Array.isArray(data.items)
        ? data.items.map((item: any) => ({
            slug: String(item?.slug || ''),
            title: String(item?.title || item?.slug || 'Untitled curse'),
            path: String(item?.path || ''),
          }))
        : [];
      curses.sort((a, b) => a.title.localeCompare(b.title));
      renderLibrary({ preserve: true });
      setStatus(libraryStatus, `Loaded ${curses.length} curses.`, 'success');
    } catch (err: any) {
      setStatus(libraryStatus, err?.message || 'Failed to load curses', 'error');
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  function enableEditor(enabled: boolean) {
    if (fmTextarea) fmTextarea.disabled = !enabled;
    if (mdTextarea) mdTextarea.disabled = !enabled;
    if (saveBtn) saveBtn.disabled = !enabled;
    if (deleteBtn) deleteBtn.disabled = !enabled;
  }

  async function loadCurse(slug: string) {
    if (!slug) return;
    try {
      enableEditor(false);
      setStatus(editorStatus, 'Loading curse…');
      const res = await apiFetch('/curses/load', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || 'Unable to load curse');
      currentSlug = data.slug;
      if (fmTextarea) fmTextarea.value = data.frontmatter || '';
      if (mdTextarea) mdTextarea.value = data.markdown || '';
      if (metaEl) metaEl.textContent = data.path || data.slug || '';
      renderPreview(data.markdown || '');
      enableEditor(true);
      setStatus(editorStatus, 'Loaded ✓', 'success');
    } catch (err: any) {
      setStatus(editorStatus, err?.message || 'Failed to load curse', 'error');
    }
  }

  async function saveCurse() {
    if (!currentSlug || isSaving) return;
    try {
      isSaving = true;
      setStatus(editorStatus, 'Saving…');
      const res = await apiFetch('/curses/save', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          originalSlug: currentSlug,
          frontmatter: fmTextarea?.value || '',
          markdown: mdTextarea?.value || '',
        }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || 'Save failed');
      currentSlug = data.slug;
      if (metaEl) metaEl.textContent = data.path || data.slug || '';
      renderPreview(mdTextarea?.value || '');
      setStatus(editorStatus, 'Saved ✓', 'success');
      await loadLibrary();
      renderLibrary({ preserve: true });
    } catch (err: any) {
      setStatus(editorStatus, err?.message || 'Save failed', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function deleteCurse() {
    if (!currentSlug) return;
    const ok = window.confirm(`Delete curse "${currentSlug}"? This cannot be undone.`);
    if (!ok) return;
    try {
      setStatus(editorStatus, 'Deleting…');
      const res = await apiFetch('/curses/delete', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ slug: currentSlug }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || 'Delete failed');
      currentSlug = '';
      if (fmTextarea) fmTextarea.value = '';
      if (mdTextarea) mdTextarea.value = '';
      if (previewEl) previewEl.innerHTML = '';
      enableEditor(false);
      setStatus(editorStatus, 'Deleted.', 'success');
      await loadLibrary();
    } catch (err: any) {
      setStatus(editorStatus, err?.message || 'Delete failed', 'error');
    }
  }

  // Wire up events
  if (librarySelect) {
    librarySelect.addEventListener('change', () => loadCurse(librarySelect.value));
  }
  searchInput?.addEventListener('input', () => renderLibrary({ preserve: true }));
  refreshBtn?.addEventListener('click', loadLibrary);
  saveBtn?.addEventListener('click', saveCurse);
  deleteBtn?.addEventListener('click', deleteCurse);
  mdTextarea?.addEventListener('input', () => renderPreview(mdTextarea.value));
  document.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
    if (!currentSlug || isSaving || !saveBtn || saveBtn.disabled) return;
    event.preventDefault();
    saveBtn.click();
  });

  // Initial load
  loadLibrary().catch(() => setStatus(libraryStatus, 'Failed to load curses', 'error'));
}

initCursesArchive();
