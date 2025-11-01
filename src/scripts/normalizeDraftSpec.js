// src/scripts/normalizeDraftSpec.js
// Browser bundle exposing the shared normalizePostSpec helper.
import { normalizePostSpec } from '../../server/lib/ingestionAdapter.js';

export function normalizeDraftSpec(spec, options = {}) {
  const input = (spec && typeof spec === 'object') ? spec : {};
  try {
    const result = normalizePostSpec(input, options);
    return result;
  } catch (error) {
    return { spec: input, report: [], warnings: [String(error?.message || error)] };
  }
}

if (typeof window !== 'undefined') {
  const ns = (window.WitchClick = window.WitchClick || {});
  ns.normalizeDraftSpec = normalizeDraftSpec;
}
