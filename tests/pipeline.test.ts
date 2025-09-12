// tests/pipeline.test.ts
import { describe, it, expect } from 'vitest';

function linkifyFirst(html:string, text:string, replacementHtml:string){
  const esc = text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re = new RegExp(`(>[^<]*)\\b(${esc})\\b`,'i');
  return html.replace(re, (m, pre, word)=> m.replace(word, replacementHtml));
}

describe('linkifyFirst', ()=>{
  it('replaces first natural occurrence', ()=>{
    const out = linkifyFirst('<p>Hello magic tea focus ritual</p>', 'focus ritual', '<a>focus ritual</a>');
    expect(out).toContain('<a>focus ritual</a>');
  });
});