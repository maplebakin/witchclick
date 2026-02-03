import { slugify } from '../../../shared/slugify.js';

const TYPES = ['crystal', 'herb', 'moonPhase', 'tarot', 'planetaryDay', 'ritual'] as const;
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
  tarot: [
    ['keywords', 'clarity,focus'],
    ['upright', ''],
    ['reversed', ''],
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
  const DEV_API = root?.getAttribute('data-dev-api') || 'http://localhost:8787';
  const DEV_KEY = root?.getAttribute('data-dev-key') || '';
  const baseHeaders: Record<string, string> = DEV_KEY ? { 'X-WC-Dev-Key': DEV_KEY } : {};
  const jsonHeaders = { 'Content-Type': 'application/json', ...baseHeaders };

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

  let autoSlug = true;

  function setStatus(msg: string, ok = true) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = ok ? '#065f46' : '#7f1d1d';
  }

  function busy(on: boolean) {
    ['newBtn', 'addProp', 'suggest', 'save'].forEach((id) => {
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
      const items = data.items || {};
      const types = Object.keys(items).sort();
      listEl.innerHTML = '';
      if (!types.length) {
        listEl.innerHTML = '<p class="text-body-subtle">No entities yet.</p>';
        return;
      }
      types.forEach((type) => {
        const heading = document.createElement('h4');
        heading.className = 'mt-3 mb-1 text-xs uppercase tracking-wide text-body-faint';
        heading.textContent = type;
        listEl.appendChild(heading);
        const entries = items[type] || [];
        entries.forEach((entry: any) => {
          const name = String(entry.name || '').toLowerCase();
          const slug = String(entry.slug || '').toLowerCase();
          if (q && !name.includes(q) && !slug.includes(q)) return;
          const link = document.createElement('a');
          link.href = '#';
          link.className = 'block rounded px-2 py-1 hover:bg-surface-muted';
          link.textContent = `${entry.name || ''} (${entry.slug || ''})`;
          link.addEventListener('click', (ev) => {
            ev.preventDefault();
            loadEntity(entry.type as EntityType, entry.slug);
          });
          listEl.appendChild(link);
        });
      });
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
    typeInput.value = 'herb';
    slugInput.value = '';
    nameInput.value = '';
    summaryInput.value = '';
    relatedInput.value = '';
    propsHolder.innerHTML = '';
    propsHolder.appendChild(propRow());
    autoSlug = true;
    setStatus('New entity draft');
  });

  $<HTMLButtonElement>('save')?.addEventListener('click', async () => {
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
      slugInput.value = slug;
      setStatus(`Saved ✓ → ${data.path}`);
      refreshList();
    } catch (err: any) {
      setStatus(`Save error: ${err?.message || String(err)}`, false);
    } finally {
      busy(false);
    }
  });

  searchInput?.addEventListener('input', refreshList);

  if (propsHolder && !propsHolder.children.length) {
    propsHolder.appendChild(propRow());
  }

  refreshList();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEntitiesAdmin);
} else {
  initEntitiesAdmin();
}
