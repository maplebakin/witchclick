function initCursesGenerator() {
  const root = document.querySelector<HTMLElement>('[data-curses-dashboard]');
  if (!root) return;

  const DEV_API = root.getAttribute('data-dev-api') || 'http://localhost:8787';
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector);

  const typeSelect = $('[data-curse-type]') as HTMLSelectElement | null;
  const targetSelect = $('[data-curse-target]') as HTMLSelectElement | null;
  const toneSelect = $('[data-curse-tone]') as HTMLSelectElement | null;
  const topicInput = $('[data-curse-topic]') as HTMLInputElement | null;
  const sigilInput = $('[data-curse-sigil]') as HTMLInputElement | null;
  const altarInput = $('[data-curse-altar]') as HTMLInputElement | null;
  const journalInput = $('[data-curse-journal]') as HTMLInputElement | null;
  const promptOut = $('[data-curse-prompt-out]') as HTMLTextAreaElement | null;
  const genStatus = $('[data-curse-gen-status]');
  const ingestStatus = $('[data-curse-ingest-status]');
  const ingestSummary = $('[data-curse-summary]');
  const previewEl = $('[data-curse-preview]');
  const specTextarea = $('[data-curse-spec]') as HTMLTextAreaElement | null;

  function setStatus(el: Element | null, message: string, tone: 'info' | 'success' | 'error' = 'info') {
    if (!el) return;
    const toneClass =
      tone === 'error'
        ? 'text-danger'
        : tone === 'success'
          ? 'text-success-emerald'
          : 'text-body-muted';
    (el as HTMLElement).className = `text-xs ${toneClass}`;
    (el as HTMLElement).textContent = message;
  }

  function parseSpec(): any {
    if (!specTextarea) throw new Error('Spec textarea missing.');
    const raw = specTextarea.value.trim();
    if (!raw) throw new Error('No JSON provided.');
    const cleaned = raw.replace(/^```json\\s*/i, '').replace(/```$/, '');
    return JSON.parse(cleaned);
  }

  function renderCursePreview(spec: any) {
    if (!previewEl) return;
    const container = previewEl as HTMLElement;
    container.innerHTML = '';
    if (!spec) return;

    const title = document.createElement('h1');
    title.textContent = spec.title || '(untitled curse)';
    container.appendChild(title);

    const tags = Array.isArray(spec.tags) ? spec.tags.filter(Boolean) : [];
    if (tags.length) {
      const p = document.createElement('p');
      p.className = 'text-sm text-body-subtle';
      p.textContent = `Tags: ${tags.join(', ')}`;
      container.appendChild(p);
    }

    function appendSection(label: string, value: string) {
      const h2 = document.createElement('h2');
      h2.textContent = label;
      container.appendChild(h2);
      const div = document.createElement('div');
      const safe = String(value || '')
        .trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\\n/g, '<br>');
      div.innerHTML = safe;
      container.appendChild(div);
    }

    appendSection('Opening Reflection', spec.openingReflection || '');
    appendSection('Invocation', spec.invocation || '');
    appendSection('Method', spec.method || '');
    appendSection('Closure & Aftercare', spec.closure || '');
    if (spec.safetyNotes) appendSection('Safety Notes', spec.safetyNotes);
  }

  async function generatePrompt() {
    try {
      setStatus(genStatus, 'Generating prompt…');
      const body: Record<string, unknown> = {
        type: typeSelect?.value || '',
        target: targetSelect?.value || '',
        tone: toneSelect?.value || '',
      };
      const topic = topicInput?.value?.trim();
      const sigilName = sigilInput?.value?.trim();
      const altarItem = altarInput?.value?.trim();
      const journalingFollowUp = journalInput?.value?.trim();
      if (topic) body.topic = topic;
      if (sigilName) body.sigilName = sigilName;
      if (altarItem) body.altarItem = altarItem;
      if (journalingFollowUp) body.journalingFollowUp = journalingFollowUp;

      const res = await fetch(`${DEV_API}/curses/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || 'Prompt request failed.');
      if (promptOut) promptOut.value = data.prompt || '';
      setStatus(genStatus, 'Prompt ready ✓', 'success');
    } catch (err: any) {
      setStatus(genStatus, err?.message || 'Prompt error', 'error');
    }
  }

  async function validateOrIngest(options: { ingest: boolean }) {
    try {
      setStatus(ingestStatus, options.ingest ? 'Ingesting…' : 'Validating…');
      if (ingestSummary) ingestSummary.textContent = '';
      if (previewEl) previewEl.innerHTML = '';
      const spec = parseSpec();
      const res = await fetch(`${DEV_API}/curses/ingest${options.ingest ? '' : '?dryRun=true'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec, dryRun: !options.ingest }),
      });
      const data = await res.json();
      if (!data?.ok) {
        const errors = Array.isArray(data?.errors) ? ` (${data.errors.join('; ')})` : '';
        throw new Error((data?.error || 'Validation failed') + errors);
      }
      renderCursePreview(data.spec || spec);
      if (ingestSummary) {
        ingestSummary.textContent = options.ingest
          ? `Saved to ${data.path || '(archive/curses)'}`
          : 'Validation passed (dry run)';
      }
      setStatus(ingestStatus, options.ingest ? 'Ingested ✓' : 'Valid ✓', 'success');
    } catch (err: any) {
      setStatus(ingestStatus, err?.message || 'Validation error', 'error');
    }
  }

  function clearSpec() {
    if (specTextarea) specTextarea.value = '';
    if (ingestSummary) ingestSummary.textContent = '';
    if (previewEl) previewEl.innerHTML = '';
    setStatus(ingestStatus, '');
  }

  // Wire up events
  root.querySelector('[data-curse-generate]')?.addEventListener('click', generatePrompt);
  root.querySelector('[data-curse-copy]')?.addEventListener('click', async () => {
    if (!promptOut) return;
    try {
      await navigator.clipboard.writeText(promptOut.value || '');
      setStatus(genStatus, 'Copied ✓', 'success');
    } catch {
      promptOut.focus();
      promptOut.select();
      setStatus(genStatus, 'Press ⌘/Ctrl+C to copy', 'info');
    }
  });
  root.querySelector('[data-curse-validate]')?.addEventListener('click', () => validateOrIngest({ ingest: false }));
  root.querySelector('[data-curse-ingest]')?.addEventListener('click', () => validateOrIngest({ ingest: true }));
  root.querySelector('[data-curse-clear]')?.addEventListener('click', clearSpec);
}

initCursesGenerator();
