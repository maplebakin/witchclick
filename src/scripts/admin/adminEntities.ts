import { slugify } from '../../../shared/slugify.js';

const TYPES = ['crystal', 'herb', 'moonPhase', 'planet', 'tarot', 'spread', 'planetaryDay', 'ritual'] as const;
type EntityType = (typeof TYPES)[number];

const SUGGEST: Record<EntityType, [string, string][]> = {
  crystal: [
    ['color', 'green'],
    ['chakra', 'heart,third-eye'],
    ['intentions', 'focus,clarity'],
    ['cleansing', 'moonlight,smoke'],
  ],
  herb: [
    ['partUsed', 'leaf'],
    ['intentions', 'focus,clarity'],
    ['cautions', ''],
  ],
  moonPhase: [
    ['phase', 'New Moon'],
    ['bestFor', 'intentions,new-beginnings'],
    ['cautions', ''],
  ],
  planet: [
    ['rulingSign', 'Leo'],
    ['energy', 'identity,vitality,purpose'],
    ['keywords', 'attention,archetype,pattern'],
  ],
  tarot: [
    ['keywords', 'clarity,focus'],
    ['upright', ''],
    ['reversed', ''],
  ],
  spread: [
    ['cards', '3'],
    ['focus', 'clarity,reflection'],
    ['bestFor', 'journaling,decision-making'],
  ],
  planetaryDay: [
    ['planet', 'Mercury'],
    ['themes', 'communication,study'],
    ['cautions', ''],
  ],
  ritual: [
    ['duration', '5 minutes'],
    ['tools', 'candle,tea'],
    ['steps', 'breathe,intent,begin'],
  ],
};

function initEntitiesAdmin() {
  const root = document.querySelector('[data-dev-api]');
  const FILTER_STORAGE_KEY = 'witchclick:admin-entity-filters';
  const DEV_API = root?.getAttribute('data-dev-api') || 'http://localhost:8787';
  const DEV_KEY = root?.getAttribute('data-dev-key') || '';
  const baseHeaders: Record<string, string> = DEV_KEY ? { 'X-WC-Dev-Key': DEV_KEY } : {};
  const jsonHeaders = { 'Content-Type': 'application/json', ...baseHeaders };
  type EntityStatus = 'published' | 'stub';
  type SortValue = 'az' | 'za';
  type FilterState = {
    type: EntityType | 'all';
    status: EntityStatus | 'all';
    sort: SortValue;
  };
  type EntityListItem = {
    type: EntityType;
    slug: string;
    name: string;
    summary: string;
    status: EntityStatus;
  };

  function apiFetch(path: string, options: RequestInit = {}) {
    const headers = { ...baseHeaders, ...(options.headers || {}) };
    return fetch(`${DEV_API}${path}`, { ...options, headers });
  }
  const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T | null;

  const statusEl = $<HTMLSpanElement>('status');
  const nameInput = $<HTMLInputElement>('name');
  const slugInput = $<HTMLInputElement>('slug');
  const typeInput = $<HTMLSelectElement>('type');
  const summaryInput = $<HTMLTextAreaElement>('summary');
  const relatedInput = $<HTMLInputElement>('related');
  const propsHolder = $<HTMLDivElement>('props');
  const searchInput = $<HTMLInputElement>('search');
  const listEl = $<HTMLDivElement>('list');
  const saveButton = $<HTMLButtonElement>('save');
  const deleteButton = $<HTMLButtonElement>('delete');
  const typeFilter = $<HTMLSelectElement>('typeFilter');
  const statusFilter = $<HTMLSelectElement>('statusFilter');
  const sortFilter = $<HTMLSelectElement>('sortFilter');
  const listStatusEl = $<HTMLParagraphElement>('listStatus');
  const params = new URLSearchParams(window.location.search);
  const requestedTypeRaw = params.get('type');
  const requestedSlugRaw = params.get('slug');
  const requestedType = TYPES.includes(requestedTypeRaw as EntityType)
    ? (requestedTypeRaw as EntityType)
    : null;
  const requestedSlug = requestedSlugRaw ? slugify(requestedSlugRaw) : '';
  let pendingDeepLinkSelection = requestedSlug ? { type: requestedType, slug: requestedSlug } : null;
  let currentEntityType: EntityType | null = null;
  let currentEntitySlug = '';

  let autoSlug = true;

  function normalizeTypeFilter(value: string | null | undefined): EntityType | 'all' {
    return TYPES.includes(value as EntityType) ? (value as EntityType) : 'all';
  }

  function normalizeStatusFilter(value: string | null | undefined): EntityStatus | 'all' {
    return value === 'published' || value === 'stub' ? value : 'all';
  }

  function normalizeSort(value: string | null | undefined): SortValue {
    return value === 'za' ? 'za' : 'az';
  }

  function applyStoredFilterState() {
    try {
      const raw = window.sessionStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<FilterState> | null;
      if (typeFilter) typeFilter.value = normalizeTypeFilter(parsed?.type);
      if (statusFilter) statusFilter.value = normalizeStatusFilter(parsed?.status);
      if (sortFilter) sortFilter.value = normalizeSort(parsed?.sort);
    } catch {
      if (typeFilter) typeFilter.value = requestedType || 'all';
      if (statusFilter) statusFilter.value = 'all';
      if (sortFilter) sortFilter.value = 'az';
    }
  }

  function persistFilterState() {
    try {
      const state: FilterState = {
        type: normalizeTypeFilter(typeFilter?.value),
        status: normalizeStatusFilter(statusFilter?.value),
        sort: normalizeSort(sortFilter?.value),
      };
      window.sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage failures
    }
  }

  function setListStatus(message: string) {
    if (!listStatusEl) return;
    listStatusEl.textContent = message;
  }

  function populateTypeFilter(items: Record<string, EntityListItem[]>) {
    if (!typeFilter) return;
    const availableTypes = Object.keys(items)
      .filter((type) => Array.isArray(items[type]) && items[type].length > 0)
      .sort();
    const selected = normalizeTypeFilter(typeFilter.value || requestedType || 'all');
    typeFilter.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All';
    typeFilter.appendChild(allOption);
    availableTypes.forEach((type) => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      typeFilter.appendChild(option);
    });
    typeFilter.value = availableTypes.includes(selected) || selected === 'all' ? selected : 'all';
  }

  function clearEditor() {
    if (!propsHolder || !typeInput || !slugInput || !nameInput || !summaryInput || !relatedInput) return;
    currentEntityType = null;
    currentEntitySlug = '';
    typeInput.value = 'herb';
    slugInput.value = '';
    nameInput.value = '';
    summaryInput.value = '';
    relatedInput.value = '';
    propsHolder.innerHTML = '';
    propsHolder.appendChild(propRow());
    autoSlug = true;
    if (deleteButton) deleteButton.disabled = true;
  }

  function setStatus(msg: string, ok = true) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = ok ? '#065f46' : '#7f1d1d';
  }

  function busy(on: boolean) {
    ['newBtn', 'addProp', 'suggest', 'save', 'delete'].forEach((id) => {
      const button = $<HTMLButtonElement>(id);
      if (!button) return;
      button.disabled = on;
      button.style.opacity = on ? '0.6' : '1';
    });
  }

  function propRow(key = '', value = '') {
    const wrap = document.createElement('div');
    wrap.className = 'grid grid-cols-5 gap-2';

    const keyInput = document.createElement('input');
    keyInput.className = 'col-span-2 rounded-lg border px-2 py-1 text-sm key';
    keyInput.placeholder = 'key';
    keyInput.value = key;

    const valueInput = document.createElement('input');
    valueInput.className = 'col-span-3 rounded-lg border px-2 py-1 text-sm val';
    valueInput.placeholder = 'value (JSON, comma-list, number, boolean)';
    valueInput.value = value;

    wrap.appendChild(keyInput);
    wrap.appendChild(valueInput);
    return wrap;
  }

  function parseValue(raw: string) {
    const v = raw.trim();
    if (!v) return '';
    if ((v.startsWith('[') && v.endsWith(']')) || (v.startsWith('{') && v.endsWith('}'))) {
      try {
        return JSON.parse(v);
      } catch {}
    }
    if (v.includes(',')) {
      return v
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (v === 'true') return true;
    if (v === 'false') return false;
    return v;
  }

  function collectProps() {
    const holder = propsHolder;
    if (!holder) return {} as Record<string, unknown>;
    const rows = Array.from(holder.querySelectorAll<HTMLDivElement>(':scope > div'));
    const out: Record<string, unknown> = {};
    for (const row of rows) {
      const key = row.querySelector<HTMLInputElement>('.key')?.value.trim();
      const val = row.querySelector<HTMLInputElement>('.val')?.value.trim();
      if (!key) continue;
      out[key] = val ? parseValue(val) : '';
    }
    return out;
  }

  nameInput?.addEventListener('input', () => {
    if (!autoSlug || !slugInput) return;
    slugInput.value = slugify(nameInput.value);
  });

  slugInput?.addEventListener('input', () => {
    autoSlug = !slugInput?.value.trim();
  });

  function addSuggestionsFor(type: EntityType) {
    if (!propsHolder) return;
    const rows = SUGGEST[type] || [];
    const existing: Record<string, boolean> = {};
    propsHolder
      .querySelectorAll<HTMLInputElement>('.key')
      .forEach((input) => {
        existing[input.value.trim()] = true;
      });
    rows.forEach(([key, value]) => {
      if (existing[key]) return;
      propsHolder.appendChild(propRow(key, value));
    });
  }

  async function refreshList() {
    if (!listEl) return;
    try {
      const res = await apiFetch('/entities/list', { method: 'POST' });
      const data = await res.json();
      if (!data.ok) {
        setStatus(`List error: ${data.error || 'unknown'}`, false);
        return;
      }
      const q = (searchInput?.value || '').toLowerCase().trim();
      const typeFilterValue = normalizeTypeFilter(typeFilter?.value || requestedType || 'all');
      const statusFilterValue = normalizeStatusFilter(statusFilter?.value);
      const sortValue = normalizeSort(sortFilter?.value);
      const items = data.items || {};
      populateTypeFilter(items);
      const totalCount = Object.values(items as Record<string, EntityListItem[]>).reduce<number>(
        (sum, entries) => sum + (Array.isArray(entries) ? entries.length : 0),
        0
      );
      const types = Object.keys(items)
        .sort()
        .filter((type) => typeFilterValue === 'all' || type === typeFilterValue);
      let visibleCount = 0;
      listEl.innerHTML = '';
      if (!types.length) {
        listEl.innerHTML = '<p class="text-body-subtle">No entities yet.</p>';
        setListStatus('0 of 0 entities');
        return;
      }
      let matchedLink: HTMLElement | null = null;
      let matchedType: EntityType | null = null;
      types.forEach((type) => {
        const entries = (items[type] || []) as EntityListItem[];
        const visibleEntries = entries
          .filter((entry) => {
            const name = String(entry.name || '').toLowerCase();
            const slug = String(entry.slug || '').toLowerCase();
            const matchesQuery = !q || name.includes(q) || slug.includes(q);
            const matchesStatus = statusFilterValue === 'all' || entry.status === statusFilterValue;
            return matchesQuery && matchesStatus;
          })
          .sort((a, b) =>
            sortValue === 'za'
              ? String(b.name || '').localeCompare(String(a.name || ''), undefined, { sensitivity: 'base' })
              : String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
          );
        if (!visibleEntries.length) return;
        visibleCount += visibleEntries.length;
        const heading = document.createElement('h4');
        heading.className = 'mt-3 mb-1 text-xs uppercase tracking-wide text-body-faint';
        heading.textContent = type;
        listEl.appendChild(heading);
        visibleEntries.forEach((entry) => {
          const link = document.createElement('a');
          link.href = '#';
          link.className = 'block rounded px-2 py-1 hover:bg-surface-muted';
          const badgeHtml =
            entry.status === 'stub'
              ? '<span class="rounded-full bg-surface-accent-soft px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-accent">Stub</span>'
              : '';
          link.innerHTML = `
            <span class="flex items-center justify-between gap-2">
              <span class="min-w-0">${String(entry.name || '')} (${String(entry.slug || '')})</span>
              ${badgeHtml}
            </span>
          `;
          link.addEventListener('click', (ev) => {
            ev.preventDefault();
            loadEntity(entry.type as EntityType, entry.slug);
          });
          if (
            pendingDeepLinkSelection &&
            (!pendingDeepLinkSelection.type || entry.type === pendingDeepLinkSelection.type) &&
            slugify(String(entry.slug || '')) === pendingDeepLinkSelection.slug
          ) {
            matchedLink = link;
            matchedType = entry.type as EntityType;
          }
          listEl.appendChild(link);
        });
      });
      if (!visibleCount) {
        listEl.innerHTML = '<p class="text-body-subtle">No entities match your filters.</p>';
      }
      setListStatus(`${visibleCount} of ${totalCount} entities`);
      if (pendingDeepLinkSelection && matchedLink && matchedType) {
        const linkToScroll = matchedLink as HTMLElement & {
          scrollIntoView: (options?: ScrollIntoViewOptions) => void;
        };
        loadEntity(matchedType, pendingDeepLinkSelection.slug);
        linkToScroll.scrollIntoView({ block: 'nearest' });
        pendingDeepLinkSelection = null;
      }
    } catch (err: any) {
      setStatus(`List error: ${err?.message || String(err)}`, false);
    }
  }

  async function loadEntity(type: EntityType, slug: string) {
    if (!propsHolder || !typeInput || !slugInput || !nameInput || !summaryInput || !relatedInput) return;
    try {
      busy(true);
      const res = await apiFetch('/entities/get', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ type, slug }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'get failed');
      const ent = data.data || {};
      currentEntityType = (ent.type || type || 'herb') as EntityType;
      currentEntitySlug = ent.slug || slug || '';
      if (deleteButton) deleteButton.disabled = false;
      typeInput.value = ent.type || type || 'herb';
      slugInput.value = ent.slug || slug || '';
      nameInput.value = ent.name || '';
      summaryInput.value = ent.summary || '';
      relatedInput.value = Array.isArray(ent.related) ? ent.related.join(',') : '';
      autoSlug = (slugInput.value || '') === slugify(nameInput.value || '');
      const props = ent.properties || {};
      propsHolder.innerHTML = '';
      const keys = Object.keys(props);
      if (!keys.length) propsHolder.appendChild(propRow());
      keys.forEach((key) => {
        const value = props[key];
        const formatted = Array.isArray(value)
          ? value.join(',')
          : typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : String(value);
        propsHolder.appendChild(propRow(key, formatted));
      });
      setStatus(`Loaded ${type}/${slug}`);
    } catch (err: any) {
      setStatus(`Load error: ${err?.message || String(err)}`, false);
    } finally {
      busy(false);
    }
  }

  async function deleteEntity() {
    if (!currentEntityType || !currentEntitySlug) {
      setStatus('Load an entity before deleting.', false);
      return;
    }
    const confirmed = window.confirm(`Delete entity ${currentEntityType}/${currentEntitySlug}? This cannot be undone.`);
    if (!confirmed) return;
    try {
      busy(true);
      const res = await apiFetch('/entities/delete', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ type: currentEntityType, slug: currentEntitySlug }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'delete failed');
      clearEditor();
      setStatus(`Deleted ✓ → ${data.deletedPath || `${currentEntityType}/${currentEntitySlug}`}`);
      await refreshList();
    } catch (err: any) {
      setStatus(`Delete error: ${err?.message || String(err)}`, false);
    } finally {
      busy(false);
    }
  }

  $<HTMLButtonElement>('addProp')?.addEventListener('click', () => {
    propsHolder?.appendChild(propRow());
  });

  $<HTMLButtonElement>('suggest')?.addEventListener('click', () => {
    const t = (typeInput?.value as EntityType) || 'herb';
    addSuggestionsFor(t);
    setStatus(`Added suggestions for ${typeInput?.value || 'herb'}`);
  });

  $<HTMLButtonElement>('newBtn')?.addEventListener('click', () => {
    if (!propsHolder || !typeInput || !slugInput || !nameInput || !summaryInput || !relatedInput) return;
    clearEditor();
    setStatus('New entity draft');
  });

  saveButton?.addEventListener('click', async () => {
    if (!typeInput || !slugInput || !nameInput || !summaryInput || !relatedInput) return;
    try {
      busy(true);
      const type = typeInput.value as EntityType;
      if (!TYPES.includes(type)) throw new Error('Invalid type');
      const slug = slugify(slugInput.value || nameInput.value);
      if (!slug) throw new Error('Slug required (or type a Name to auto-fill)');
      const payload = {
        type,
        slug,
        name: nameInput.value.trim(),
        summary: summaryInput.value,
        properties: collectProps(),
        related: (relatedInput.value || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      try {
        const existingRes = await apiFetch('/entities/get', {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ type, slug }),
        });
        const existing = await existingRes.json();
        if (existing?.ok && existing.data) {
          const overwrite = window.confirm('An entity with this slug exists. Overwrite?');
          if (!overwrite) {
            setStatus('Save cancelled', false);
            busy(false);
            return;
          }
        }
      } catch {}

      const res = await apiFetch('/entities/save', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'save failed');
      currentEntityType = type;
      currentEntitySlug = slug;
      if (deleteButton) deleteButton.disabled = false;
      slugInput.value = slug;
      setStatus(`Saved ✓ → ${data.path}`);
      refreshList();
    } catch (err: any) {
      setStatus(`Save error: ${err?.message || String(err)}`, false);
    } finally {
      busy(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
    if (!saveButton || saveButton.disabled || !slugInput?.value.trim()) return;
    event.preventDefault();
    saveButton.click();
  });

  searchInput?.addEventListener('input', refreshList);
  typeFilter?.addEventListener('change', () => {
    persistFilterState();
    refreshList();
  });
  statusFilter?.addEventListener('change', () => {
    persistFilterState();
    refreshList();
  });
  sortFilter?.addEventListener('change', () => {
    persistFilterState();
    refreshList();
  });
  deleteButton?.addEventListener('click', () => {
    void deleteEntity();
  });

  if (propsHolder && !propsHolder.children.length) {
    propsHolder.appendChild(propRow());
  }

  applyStoredFilterState();
  if (requestedType && typeFilter) {
    typeFilter.value = requestedType;
  }
  if (deleteButton) deleteButton.disabled = true;
  refreshList();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEntitiesAdmin);
} else {
  initEntitiesAdmin();
}
