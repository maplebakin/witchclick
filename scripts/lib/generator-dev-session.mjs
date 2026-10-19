/**
 * Keep the generator's unsaved workspace mounted during development content writes.
 * Astro broadcasts content-store changes outside Vite's hotUpdate hooks. Use Vite's
 * exposed per-client socket, not a global ws.send/location.reload override: only a
 * generator tab that explicitly subscribes defers full-reload messages. Watchers,
 * module invalidation, CSS updates, errors and every other client remain untouched.
 */
export function generatorDevSession() {
  return {
    name: 'witchclick-generator-dev-session',
    apply: 'serve',
    configureServer(server) {
      const subscriptions = new Map();
      function release(socket) {
        const original = subscriptions.get(socket);
        if (original) { socket.send = original; subscriptions.delete(socket); }
      }
      server.ws.on('witchclick:generator-session', (data, client) => {
        const socket = client.socket;
        if (data?.active !== true) { release(socket); return; }
        if (subscriptions.has(socket)) return;
        const original = socket.send;
        subscriptions.set(socket, original);
        socket.send = function(message, ...args) {
          let payload;
          try { payload = JSON.parse(String(message)); } catch { /* Non-JSON transport traffic passes through. */ }
          if (payload?.type === 'full-reload') {
            message = JSON.stringify({ type: 'custom', event: 'witchclick:generator-update-deferred', data: {} });
          }
          return original.call(this, message, ...args);
        };
        socket.once('close', () => release(socket));
        client.send('witchclick:generator-session-ready', {});
      });
      server.httpServer?.once('close', () => { for (const socket of subscriptions.keys()) release(socket); });
    },
  };
}
