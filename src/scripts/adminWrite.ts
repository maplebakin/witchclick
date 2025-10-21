import { analyzeSlug } from '../../shared/slugify.js';

function initWriteAdmin() {
  const root = document.querySelector('[data-dev-api]');
  const DEV_API = root?.getAttribute('data-dev-api') || 'http://localhost:8787';
  const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T | null;

  const titleInput = $<HTMLInputElement>('title');
  const slugInput = $<HTMLInputElement>('slug');
  const slugPreview = $<HTMLParagraphElement>('slugPreview');
  const slugStatus = $<HTMLParagraphElement>('slugStatus');
  const slugStatusBase = slugStatus?.className ?? '';
  const statusEl = $<HTMLDivElement>('status');
  const excerptInput = $<HTMLInputElement>('excerpt');
  const metaInput = $<HTMLInputElement>('meta');
  const excerptHint = $<HTMLParagraphElement>('excerptHint');
  const metaHint = $<HTMLParagraphElement>('metaHint');
  const excerptHintBase = excerptHint?.className ?? 'mt-1 text-[11px] text-body-subtle';
  const metaHintBase = metaHint?.className ?? 'mt-1 text-[11px] text-body-subtle';
  const searchPreview = $<HTMLDivElement>('searchPreview');
  const searchPreviewTitle = $<HTMLParagraphElement>('searchPreviewTitle');
  const searchPreviewUrl = $<HTMLParagraphElement>('searchPreviewUrl');
  const searchPreviewDescription = $<HTMLParagraphElement>('searchPreviewDescription');
  const siteOriginAttr = root?.getAttribute('data-site-origin') ?? '';
  let previewHost = '';
  if (siteOriginAttr) {
    try {
      previewHost = new URL(siteOriginAttr).host;
    } catch (_err) {
      previewHost = siteOriginAttr.replace(/^https?:\/\//, '');
    }
  }
  if (!previewHost) {
    previewHost = 'spacebarcollective.com';
  }

  let slugTouched = false;

  function setStatus(msg: string, ok = true, warnings?: string[]) {
    if (!statusEl) return;
    statusEl.innerHTML = '';
    statusEl.style.color = ok ? '#065f46' : '#7f1d1d';
    if (msg) {
      const span = document.createElement('span');
      span.textContent = msg;
      statusEl.appendChild(span);
    }
    if (Array.isArray(warnings) && warnings.length) {
      const list = document.createElement('ul');
      list.className = 'mt-1 list-disc pl-4 text-[11px] text-warning';
      warnings.forEach((note) => {
        const li = document.createElement('li');
        li.textContent = note;
        list.appendChild(li);
      });
      statusEl.appendChild(list);
    }
  }

  function summarizeEntities(list: { type?: string; slug?: string }[] | undefined) {
    if (!Array.isArray(list) || !list.length) return '';
    return list
      .map((item) => {
        const type = item?.type ?? '?';
        const slug = item?.slug ?? '?';
        return `${type}:${slug}`;
      })
      .join(', ');
  }

  type SlugState = {
    slug: string;
    source: 'manual' | 'title' | 'title-fallback' | 'empty' | 'invalid-manual';
    changed: boolean;
    manualProvided: boolean;
  };

  function evaluateSlug(): SlugState {
    const manual = analyzeSlug(slugInput?.value ?? '');
    const title = analyzeSlug(titleInput?.value ?? '');

    if (manual.trimmed.length > 0 && manual.slug) {
      return {
        slug: manual.slug,
        source: 'manual',
        changed: manual.changed,
        manualProvided: true,
      };
    }

    if (manual.trimmed.length > 0 && !manual.slug) {
      if (title.slug) {
        return {
          slug: title.slug,
          source: 'title-fallback',
          changed: true,
          manualProvided: true,
        };
      }
      return {
        slug: '',
        source: 'invalid-manual',
        changed: false,
        manualProvided: true,
      };
    }

    if (title.slug) {
      return {
        slug: title.slug,
        source: 'title',
        changed: title.changed,
        manualProvided: false,
      };
    }

    return { slug: '', source: 'empty', changed: false, manualProvided: false };
  }

  function updateExcerptHint() {
    if (!excerptHint) return;
    const length = excerptInput?.value.trim().length ?? 0;
    let message = 'Aim for around 220 characters so your intro stays readable in feeds.';
    let className = excerptHintBase;
    if (length === 0) {
      message += ' Leave blank to auto-generate from your Markdown.';
    } else {
      message += ` Current length: ${length}.`;
      if (length > 240) {
        message += ' This may be truncated in summaries.';
        className += ' text-warning';
      }
    }
    excerptHint.textContent = message;
    excerptHint.className = className;
  }

  function updateMetaHint() {
    if (!metaHint) return;
    const length = metaInput?.value.trim().length ?? 0;
    let message = 'Aim for 120–160 characters. Keep it concise, actionable, and include your primary keywords.';
    let className = metaHintBase;
    if (length === 0) {
      message += ' Leave blank for an auto-generated summary.';
    } else {
      message += ` Current length: ${length}.`;
      if (length < 120) {
        message += ' Consider adding a touch more detail.';
        className += ' text-warning';
      } else if (length > 160) {
        message += ' This may be truncated in search results.';
        className += ' text-warning';
      }
    }
    metaHint.textContent = message;
    metaHint.className = className;
  }

  function updateSearchPreview(state?: SlugState) {
    if (!searchPreview || !searchPreviewTitle || !searchPreviewUrl || !searchPreviewDescription) {
      return;
    }
    const slugState = state ?? evaluateSlug();
    const title = (titleInput?.value ?? '').trim();
    const meta = (metaInput?.value ?? '').trim();
    const excerpt = (excerptInput?.value ?? '').trim();
    searchPreviewTitle.textContent = title || 'Your post title will appear here';
    searchPreviewUrl.textContent = `${previewHost}/post/${slugState.slug || 'your-slug'}`;
    searchPreviewDescription.textContent =
      meta || excerpt || 'Your meta description or excerpt will appear here so you can check the length.';
  }

  function renderSlugState() {
    if (!slugPreview || !slugStatus) return;
    const state = evaluateSlug();

    if (state.slug) {
      slugPreview.textContent = `Preview: /post/${state.slug}`;
    } else if ((titleInput?.value || '').trim()) {
      slugPreview.textContent = 'Slug will be generated from the title.';
    } else {
      slugPreview.textContent = 'Add a title to generate a slug.';
    }

    slugStatus.className = slugStatusBase || 'mt-1 text-[11px] text-body-subtle';
    slugStatus.textContent = '';

    if (state.source === 'manual' && state.changed) {
      slugStatus.textContent = `Normalized to ${state.slug}. Only lowercase letters, numbers, and hyphens are allowed.`;
    } else if (state.source === 'title-fallback') {
      slugStatus.className += ' text-warning';
      slugStatus.textContent = `Manual slug was invalid. Using “${state.slug}” from the title.`;
    } else if (state.source === 'invalid-manual') {
      slugStatus.className += ' text-warning';
      slugStatus.textContent = 'Slug becomes empty after normalization. Adjust it or provide a title.';
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
    titleInput.addEventListener('input', () => {
      if (!slugTouched) {
        const auto = analyzeSlug(titleInput.value).slug;
        slugInput.value = auto;
      }
      renderSlugState();
    });

    slugInput.addEventListener('input', () => {
      slugTouched = slugInput.value.trim().length > 0;
      renderSlugState();
    });

    slugInput.addEventListener('blur', () => {
      normalizeManualSlug();
      renderSlugState();
    });

    renderSlugState();
  }

  excerptInput?.addEventListener('input', () => {
    updateExcerptHint();
    updateSearchPreview();
  });

  metaInput?.addEventListener('input', () => {
    updateMetaHint();
    updateSearchPreview();
  });

  updateExcerptHint();
  updateMetaHint();
  updateSearchPreview();

  async function savePost() {
    if (slugInput) {
      normalizeManualSlug();
      renderSlugState();
    }

    const state = evaluateSlug();
    const tldrValue = ($<HTMLTextAreaElement>('tldr')?.value ?? '').trim();
    const spoonsValueRaw = ($<HTMLSelectElement>('spoons')?.value ?? '').trim().toLowerCase();
    const spoonsValue = ['low', 'medium', 'high'].includes(spoonsValueRaw) ? spoonsValueRaw : '';

    const payload = {
      title: titleInput?.value ?? '',
      slug: state.manualProvided && state.slug ? state.slug : '',
      excerpt: ($<HTMLInputElement>('excerpt')?.value ?? ''),
      metaDescription: ($<HTMLInputElement>('meta')?.value ?? ''),
      tldr: tldrValue || undefined,
      tags: ($<HTMLInputElement>('tags')?.value ?? ''),
      includeAds: Boolean($<HTMLInputElement>('ads')?.checked),
      includeKofi: Boolean($<HTMLInputElement>('kofi')?.checked),
      spoons: spoonsValue || undefined,
      entities: ($<HTMLInputElement>('entities')?.value ?? ''),
      markdown: ($<HTMLTextAreaElement>('markdown')?.value ?? ''),
    };

    const res = await fetch(`${DEV_API}/posts/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'save failed');
    return data;
  }

  const saveButton = $<HTMLButtonElement>('save');
  const savePublishButton = $<HTMLButtonElement>('savePublish');

  saveButton?.addEventListener('click', async () => {
    try {
      setStatus('Saving...');
      const data = await savePost();
      const summary = summarizeEntities(data.entities);
      const message = `Saved → ${data.path}${summary ? ` · Entities: ${summary}` : ''}`;
      setStatus(message, true, data.warnings);
    } catch (e: any) {
      setStatus(`Save error: ${e?.message || String(e)}`, false);
    }
  });

  savePublishButton?.addEventListener('click', async () => {
    try {
      setStatus('Saving...');
      const data = await savePost();
      const summary = summarizeEntities(data.entities);
      setStatus('Saved. Publishing...', true, data.warnings);
      const res = await fetch(`${DEV_API}/bundle`, { method: 'POST' });
      const bundle = await res.json();
      if (!bundle.ok) {
        const errors = Array.isArray(bundle.steps)
          ? bundle.steps.map((s: any) => s?.err).filter(Boolean).join('\n')
          : bundle.error;
        throw new Error(errors || 'bundle failed');
      }
      const publishMsg = `Published ✓  Open post: /post/${data.slug}${summary ? ` · Entities: ${summary}` : ''}`;
      setStatus(publishMsg, true, data.warnings);
    } catch (e: any) {
      setStatus(`Publish error: ${e?.message || String(e)}`, false);
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWriteAdmin);
  } else {
    initWriteAdmin();
  }
}
