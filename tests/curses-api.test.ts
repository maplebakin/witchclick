import { describe, expect, it } from 'vitest';

import { POST } from '../src/pages/api/curses/prompt.json.ts';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/curses/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

describe('curses prompt API', () => {
  it('returns a prompt with guard phrases', async () => {
    const response = await POST({ request: makeRequest({ type: 'mirror', target: 'person', tone: 'gentle' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.prompt).toContain('WHITE MAGIC CURSE GENERATOR');
    expect(data.prompt).toContain('CurseSpec v1');
  });
});
