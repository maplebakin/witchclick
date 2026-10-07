import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { buildFallbackHeroPrompt } from '../../utils/heroPrompt';

export interface HeroTarget { slug: string; expectedTitle?: string; requireDraft?: boolean }
type SavedHero = { slug: string; token: number; path: string; alt: string };
type PendingUpload = { id: number; slug: string; filename: string; path?: string };
const instances = new WeakMap<HTMLElement, HeroWorkflow>();
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
export function usefulHeroAlt(alt: string, path: string) {
  return Boolean(alt.trim()) && !/^(?:[/\\]|[a-z]:[/\\])/i.test(alt) && !/^(?:https?:)?\/\//i.test(alt)
    && !/(?:^|\/)(?:images|hero-images)(?:\/|$)|chatgpt-image/i.test(alt)
    && !/(?:^|\/)[^/]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(alt)
    && alt.trim().toLowerCase() !== path.split('/').pop()?.toLowerCase();
}

/** One instance owns all selection, requests and DOM under its root. No shared window state. */
export class HeroWorkflow {
  private token = 0;
  private target: HeroTarget | null = null;
  private post: Record<string, any> | null = null;
  private file: File | null = null;
  private fileToken = -1;
  private previewUrl = '';
  private uploadedPath = '';
  private saved: SavedHero | null = null;
  private status = 'locked';
  private busy = false;
  private pending: PendingUpload[] = [];
  private sequence = 0;
  private posts: Array<Record<string, any>> = [];
  private variation = 0;
  private disposed = false;
  private listeners = new AbortController();
  constructor(readonly root: HTMLElement) {
    const initialSlug = root.dataset.heroSlug || '';
    this.on(root, 'hero-workflow:set-post', event => { void this.setPost((event as CustomEvent<HeroTarget>).detail); });
    this.on(root, 'hero-workflow:reset', () => this.reset());
    this.on(this.el('[data-post-select]'), 'change', () => { void this.setPost({ slug: this.select.value }); });
    this.on(this.el('[data-post-search]'), 'input', () => this.renderPicker());
    this.on(this.el('[data-picker]'), 'click', event => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-post-slug]');
      if (button) void this.setPost({ slug: button.dataset.postSlug || '' });
    });
    this.on(this.input, 'change', () => this.chooseFile(this.input.files?.[0] || null));
    this.on(this.el('[data-drop-zone]'), 'dragover', event => event.preventDefault());
    this.on(this.el('[data-drop-zone]'), 'drop', event => {
      event.preventDefault(); if (!this.busy) this.chooseFile((event as DragEvent).dataTransfer?.files?.[0] || null);
    });
    this.on(this.alt, 'input', () => { this.status = 'idle'; this.saved = null; this.hideSuccess(); this.message('Alt text changed. Save it again to confirm the hero.'); this.render(); });
    this.on(this.el('[data-upload-confirm]'), 'click', () => { void this.upload(); });
    this.on(this.el('[data-submit]'), 'click', () => { void this.attach(); });
    this.on(this.el('[data-retry-verification]'), 'click', () => { if (this.saved && !this.busy) void this.verify(this.saved); });
    this.on(this.el('[data-load-retry]'), 'click', () => { if (this.target) void this.setPost(this.target); });
    this.on(this.el('[data-refresh-hero]'), 'click', () => { if (this.target && !this.busy) void this.refresh(); });
    this.on(this.el('[data-copy-hero-prompt]'), 'click', () => { void this.copyPrompt(); });
    this.on(this.el('[data-regenerate-prompt]'), 'click', () => {
      if (!this.post || this.busy) return;
      this.prompt.value = buildFallbackHeroPrompt(this.post, ++this.variation);
      this.el('[data-prompt-source]').textContent = 'Generated from this post’s title and tags.';
    });
    this.on(this.el('[data-save-prompt]'), 'click', () => { void this.savePrompt(); });
    this.reset();
    if (root.dataset.mode === 'picker') void this.loadPicker();
    else if (initialSlug) void this.setPost({ slug: initialSlug });
  }
  private el<T extends HTMLElement = HTMLElement>(selector: string): T { return this.root.querySelector<T>(selector)!; }
  private get input() { return this.el<HTMLInputElement>('[data-file-input]'); }
  private get alt() { return this.el<HTMLInputElement>('[data-alt-input]'); }
  private get prompt() { return this.el<HTMLTextAreaElement>('[data-hero-prompt]'); }
  private get select() { return this.el<HTMLSelectElement>('[data-post-select]'); }
  private get path() { return this.uploadedPath || text(this.post?.heroImage) || text(this.post?.heroImageSrc) || text(this.post?.heroImageUrl); }
  private on(target: HTMLElement, name: string, handler: (event: Event) => void) { target.addEventListener(name, handler, { signal: this.listeners.signal }); }
  private current(token: number) { return !this.disposed && token === this.token; }
  private message(message: string) { this.el('[data-workflow-status]').textContent = message; }
  private error(error: unknown) { const el = this.el('[data-workflow-error]'); el.textContent = error instanceof Error ? error.message : String(error); el.hidden = false; }
  private hideSuccess() { this.el('[data-success]').replaceChildren(); this.el('[data-success]').hidden = true; }
  private clearError() { this.el('[data-workflow-error]').hidden = true; this.el('[data-workflow-error]').textContent = ''; }
  private async request(endpoint: string, body: unknown) {
    const response = await fetch((this.root.dataset.devApi || 'http://localhost:8787') + endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(this.root.dataset.devKey ? { 'X-WC-Dev-Key': this.root.dataset.devKey } : {}) }, body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || data?.ok !== true) throw new Error(data?.error || `Hero request failed (${response.status}).`);
    return data;
  }
  reset() {
    this.token += 1; this.target = null; this.post = null; this.file = null; this.fileToken = -1;
    this.uploadedPath = ''; this.saved = null; this.busy = false; this.status = 'locked'; this.variation = 0;
    this.root.dataset.heroSlug = ''; this.input.value = ''; this.alt.value = ''; this.prompt.value = '';
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = ''; this.el<HTMLImageElement>('[data-preview]').removeAttribute('src'); this.el('[data-preview]').hidden = true;
    this.el('[data-preview-placeholder]').hidden = false;
    this.el('[data-file-info]').textContent = ''; this.el('[data-prompt-status]').textContent = '';
    this.hideSuccess(); this.clearError(); this.message(this.root.dataset.lockedMessage || 'Select a post to prepare its hero image.'); this.render();
  }
  dispose() { this.reset(); this.disposed = true; this.listeners.abort(); instances.delete(this.root); }
  async setPost(target: HeroTarget) {
    this.reset();
    if (!target?.slug) return;
    this.target = { ...target }; this.root.dataset.heroSlug = target.slug; this.select.value = target.slug;
    const token = this.token;
    this.status = 'loading'; this.message(`Loading hero status for ${target.slug}…`); this.render();
    try {
      const post = await this.readPost(target);
      if (!this.current(token)) return;
      this.applyPost(post); this.render();
    } catch (error) {
      if (!this.current(token)) return;
      this.status = 'error'; this.error(error);
      this.message(target.requireDraft ? `Draft replaced, but hero status could not be loaded for ${target.slug}. Retry loading.` : `Hero status could not be loaded for ${target.slug}. Retry loading.`); this.render();
    }
  }
  private async readPost(target: HeroTarget): Promise<Record<string, any>> {
    const data = await this.request('/posts/load', { slug: target.slug });
    if (data.slug !== target.slug || typeof data.frontmatter !== 'string') throw new Error('The reread post identity could not be confirmed.');
    const post = parseYaml(data.frontmatter) as Record<string, any>;
    if (!post || typeof post !== 'object' || !text(post.title) || (post.slug != null && post.slug !== target.slug)
      || (target.expectedTitle && post.title !== target.expectedTitle) || (target.requireDraft && (post.draft !== true || post.slug !== target.slug))) {
      throw new Error('The reread title, slug, or draft state does not match the saved post.');
    }
    return { ...post, slug: target.slug };
  }
  private applyPost(post: Record<string, any>) {
    this.post = post; this.alt.value = text(post.heroImageAlt) || text(post.heroAlt);
    this.prompt.value = text(post.heroImagePrompt) || buildFallbackHeroPrompt(post);
    this.el('[data-prompt-source]').textContent = text(post.heroImagePrompt) ? 'Saved hero prompt from this post.' : 'Fallback hero prompt from this post’s title and tags.';
    this.status = 'idle'; this.clearError();
    const complete = this.path && usefulHeroAlt(this.alt.value, this.path);
    this.message(!this.path ? 'Hero missing.' : !complete ? 'Hero present but alt needs work.' : 'Hero complete — image and useful alt text confirmed on the saved post.');
    if (complete) this.showLinks();
  }
  private showLinks() {
    const success = this.el('[data-success]'); success.replaceChildren();
    const links = [{ label: 'Open in Posts', href: `/admin/posts?slug=${encodeURIComponent(this.target!.slug)}` }];
    if (this.post?.draft === true) links.push({ label: 'Review in Staging', href: `/admin/staging?slug=${encodeURIComponent(this.target!.slug)}` });
    else links.push({ label: 'View live post', href: `/post/${encodeURIComponent(this.target!.slug)}` });
    for (const item of links) { const a = document.createElement('a'); a.href = item.href; a.textContent = item.label; a.className = 'mr-4 underline'; success.append(a); }
    success.hidden = false;
  }
  private render() {
    const ready = Boolean(this.post && this.target);
    this.el('[data-workspace]').hidden = !ready;
    this.el('[data-workflow-identity]').textContent = this.target ? `Post: ${this.post?.title || this.target.expectedTitle || this.target.slug} (${this.target.slug})` : '';
    this.el('[data-load-retry]').hidden = this.status !== 'error' || ready;
    this.input.disabled = this.busy || !ready; this.alt.disabled = this.busy || !ready;
    this.prompt.disabled = this.busy || !ready;
    for (const selector of ['[data-save-prompt]', '[data-regenerate-prompt]', '[data-refresh-hero]']) this.el<HTMLButtonElement>(selector).disabled = this.busy || !ready;
    this.el<HTMLButtonElement>('[data-upload-confirm]').disabled = this.busy || !this.file || this.fileToken !== this.token;
    this.el<HTMLButtonElement>('[data-submit]').disabled = this.busy || !ready || Boolean(this.file && !this.uploadedPath) || !this.path.startsWith(`/images/hero/${this.target?.slug}/`) || !usefulHeroAlt(this.alt.value.trim(), this.path) || ['unverified', 'success'].includes(this.status);
    this.el('[data-submit]').textContent = !this.uploadedPath && this.path ? 'Save alt text on existing hero' : 'Attach to post';
    this.el('[data-retry-verification]').hidden = this.status !== 'unverified'; this.el<HTMLButtonElement>('[data-retry-verification]').disabled = this.busy;
    this.el('[data-existing-hero]').textContent = this.post ? `Current hero: ${text(this.post.heroImage) || text(this.post.heroImageSrc) || 'None'}` : '';
    const summary = this.el('[data-attach-summary]'); summary.replaceChildren();
    if (ready) {
      for (const value of [`Post: ${this.post!.title} (${this.target!.slug})`, `Image: ${this.path || 'Upload artwork first'}`, `Alt text: ${this.alt.value.trim() || 'Add a useful description'}`]) { const p = document.createElement('p'); p.textContent = value; p.style.overflowWrap = 'anywhere'; summary.append(p); }
      if (this.path) { const img = document.createElement('img'); img.src = this.path; img.alt = this.alt.value || 'Artwork awaiting alt text'; img.className = 'h-32 w-48 max-w-full rounded-lg object-contain'; summary.append(img); }
    }
    this.el('[data-upload-status]').textContent = this.uploadedPath ? `Uploaded — not attached yet: ${this.uploadedPath}` : '';
    const pending = this.el('[data-pending-uploads]'); pending.replaceChildren();
    for (const upload of this.pending) { const p = document.createElement('p'); p.style.overflowWrap = 'anywhere'; p.textContent = upload.path ? `Uploaded — not attached yet. Post: ${upload.slug}. Image: ${upload.path}` : `Upload may still finish — attachment not confirmed. Post: ${upload.slug}. Filename: ${upload.filename}. Check that post before uploading again.`; pending.append(p); }
  }
  private chooseFile(file: File | null) {
    if (this.busy || !this.post) return;
    this.file = null; this.uploadedPath = ''; this.saved = null; this.status = 'idle'; this.hideSuccess(); this.clearError();
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = ''; this.el('[data-preview]').hidden = true; this.el('[data-preview-placeholder]').hidden = false;
    this.el('[data-file-info]').textContent = '';
    if (file && (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) this.error(new Error('Choose a PNG, JPG or WEBP image under 5 MB.'));
    else if (file) {
      this.file = file; this.fileToken = this.token; this.previewUrl = URL.createObjectURL(file);
      this.el<HTMLImageElement>('[data-preview]').src = this.previewUrl; this.el('[data-preview]').hidden = false; this.el('[data-preview-placeholder]').hidden = true;
      this.el('[data-file-info]').textContent = `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    }
    this.render();
  }
  private async upload() {
    if (this.busy || !this.file || this.fileToken !== this.token || !this.target) return;
    const file = this.file, slug = this.target.slug, token = this.token, id = ++this.sequence;
    this.busy = true; this.clearError(); this.message('Uploading artwork…'); this.render();
    try {
      const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read artwork.')); reader.readAsDataURL(file); });
      if (!this.current(token)) return;
      this.pending.push({ id, slug, filename: file.name }); this.render();
      const data = await this.request('/upload/hero', { slug, filename: file.name, contentBase64: base64 });
      if (!this.current(token)) return;
      if (!text(data.path).startsWith(`/images/hero/${slug}/`)) throw new Error('The uploaded image path does not belong to this post.');
      this.uploadedPath = data.path; this.pending = this.pending.filter(item => item.id !== id); this.pending.push({ id, slug, filename: file.name, path: data.path });
      this.message('Uploaded — not attached yet. Review the post, image and alt text below.');
    } catch (error) {
      if (!this.current(token)) return;
      // A failed network response can still follow a successful disk write: keep the notice.
      this.error(error); this.message('Upload was not confirmed. Check the upload notice before retrying.');
    } finally { if (this.current(token)) { this.busy = false; this.render(); } }
  }
  private matches(snapshot: SavedHero) { return this.current(snapshot.token) && this.target?.slug === snapshot.slug && this.path === snapshot.path && this.alt.value.trim() === snapshot.alt; }
  private async attach() {
    if (this.el<HTMLButtonElement>('[data-submit]').disabled || this.busy || !this.target) return;
    const snapshot = { slug: this.target.slug, token: this.token, path: this.path, alt: this.alt.value.trim() };
    this.busy = true; this.clearError(); this.hideSuccess(); this.message('Saving the hero shown in this summary…'); this.render();
    try {
      await this.request('/posts/attach-hero', { slug: snapshot.slug, heroImage: snapshot.path, heroAlt: snapshot.alt });
      if (!this.matches(snapshot)) return;
      this.saved = snapshot; this.pending = this.pending.filter(item => item.slug !== snapshot.slug || item.path !== snapshot.path);
      await this.verify(snapshot);
    } catch (error) { if (this.matches(snapshot)) { this.error(error); this.message('Attachment failed; no verified success is reported.'); } }
    finally { if (this.current(snapshot.token)) { this.busy = false; this.render(); } }
  }
  private async verify(snapshot: SavedHero) {
    if (!this.matches(snapshot)) return;
    this.busy = true; this.status = 'verifying'; this.clearError(); this.message('Saved. Rereading the post to verify the hero and alt text…'); this.render();
    try {
      const post = await this.readPost(this.target!);
      if (!this.matches(snapshot)) return;
      if (post.heroImage !== snapshot.path || post.heroImageAlt !== snapshot.alt || post.heroAlt !== snapshot.alt) throw new Error('The reread hero path or alt text does not match the saved summary.');
      this.post = post; this.uploadedPath = ''; this.file = null; this.input.value = ''; this.saved = null; this.status = 'success';
      this.message('Hero image and alt text verified on the saved post. Hero complete.'); this.showLinks();
      const listed = this.posts.find(item => item.slug === snapshot.slug); if (listed) Object.assign(listed, post); this.renderPicker();
      this.root.dispatchEvent(new CustomEvent('hero-workflow:verified', { detail: { slug: snapshot.slug, path: snapshot.path, alt: snapshot.alt } }));
    } catch (error) { if (this.matches(snapshot)) { this.status = 'unverified'; this.error(error); this.message('Saved but not verified. Retry verification before relying on this result.'); } }
    finally { if (this.current(snapshot.token)) { this.busy = false; this.render(); } }
  }
  private async refresh() {
    if (!this.target || this.busy || this.uploadedPath || this.file) { this.message('Attach or clear the selected artwork before refreshing.'); return; }
    const token = this.token; this.busy = true; this.message('Refreshing hero status…'); this.render();
    try { const post = await this.readPost(this.target); if (this.current(token)) this.applyPost(post); }
    catch (error) { if (this.current(token)) { this.post = null; this.saved = null; this.status = 'error'; this.hideSuccess(); this.error(error); this.message(this.target?.requireDraft ? 'Draft replaced, but hero status could not be loaded. Retry loading.' : 'Hero status could not be loaded. Retry loading.'); } }
    finally { if (this.current(token)) { this.busy = false; this.render(); } }
  }
  private async copyPrompt() {
    const token = this.token; const prompt = this.prompt.value;
    try { await navigator.clipboard.writeText(prompt); if (this.current(token)) this.el('[data-prompt-status]').textContent = 'Hero prompt copied.'; }
    catch { if (this.current(token)) this.el('[data-prompt-status]').textContent = 'Select the prompt and copy manually.'; }
  }
  private async savePrompt() {
    if (!this.target || this.busy || !text(this.prompt.value)) return;
    const target = this.target, token = this.token, prompt = this.prompt.value.trim(); this.busy = true; this.render();
    try {
      const data = await this.request('/posts/load', { slug: target.slug });
      if (!this.current(token)) return;
      if (data.slug !== target.slug || typeof data.frontmatter !== 'string') throw new Error('The post could not be confirmed for prompt saving.');
      const post = parseYaml(data.frontmatter); post.heroImagePrompt = prompt;
      await this.request('/posts/update', { originalSlug: target.slug, frontmatter: stringifyYaml(post), markdown: data.markdown || '' });
      if (this.current(token)) { this.post!.heroImagePrompt = prompt; this.el('[data-prompt-status]').textContent = 'Hero prompt saved to this post.'; }
    } catch (error) { if (this.current(token)) this.error(error); }
    finally { if (this.current(token)) { this.busy = false; this.render(); } }
  }
  private async loadPicker() {
    try {
      const data = await this.request('/posts/list', {});
      if (this.disposed) return;
      if (!Array.isArray(data.items)) throw new Error('Malformed post list.');
      this.posts = data.items; this.renderPicker();
      const slug = new URLSearchParams(window.location.search).get('post');
      if (slug && !this.target && this.status === 'locked') void this.setPost({ slug });
    } catch (error) { if (!this.disposed) { this.error(error); this.message('Could not load the post picker. Reload to retry.'); } }
  }
  private renderPicker() {
    if (this.root.dataset.mode !== 'picker') return;
    const query = this.el<HTMLInputElement>('[data-post-search]').value.trim().toLowerCase();
    this.select.replaceChildren(new Option('Select a post', ''));
    for (const post of this.posts) this.select.add(new Option(`${post.title || post.slug} (${post.slug})`, post.slug));
    this.select.value = this.target?.slug || '';
    const visible = this.posts.filter(post => `${post.title} ${post.slug}`.toLowerCase().includes(query));
    const recent = [...visible].sort((a,b) => (Date.parse(b.createdAt || b.publishedAt) || 0) - (Date.parse(a.createdAt || a.publishedAt) || 0)).slice(0,20);
    for (const [selector, posts] of [['[data-recent-posts]', recent], ['[data-missing-hero-posts]', visible.filter(post => !text(post.heroImage) || !usefulHeroAlt(text(post.heroImageAlt) || text(post.heroAlt), text(post.heroImage)))]] as const) {
      const list = this.el(selector); list.replaceChildren();
      if (!posts.length) list.textContent = 'No matching posts.';
      for (const post of posts) { const button = document.createElement('button'); button.type = 'button'; button.dataset.postSlug = post.slug; button.textContent = `${post.title || post.slug} (${post.slug})`; button.className = 'admin-btn-secondary block w-full px-3 py-2 text-left'; list.append(button); }
    }
  }
}
export function mountHeroWorkflow(root: HTMLElement): HeroWorkflow {
  let instance = instances.get(root);
  if (!instance) { instance = new HeroWorkflow(root); instances.set(root, instance); }
  return instance;
}
