// This module has no effect in production and subscribes only on the generator page.
if (import.meta.hot) {
  const hot = import.meta.hot;
  const subscribe = () => hot.send('witchclick:generator-session', { active: true });
  hot.on('witchclick:generator-session-ready', () => {
    document.querySelector('[data-panel-root]')?.setAttribute('data-dev-session-ready', 'true');
  });
  hot.on('witchclick:generator-update-deferred', () => {
    const notice = document.querySelector<HTMLElement>('[data-dev-update-notice]');
    if (notice) notice.hidden = false;
  });
  hot.on('vite:ws:connect', subscribe);
  subscribe();
  hot.dispose(() => hot.send('witchclick:generator-session', { active: false }));
  window.addEventListener('pagehide', () => hot.send('witchclick:generator-session', { active: false }));
}
