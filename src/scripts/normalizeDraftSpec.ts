// src/scripts/normalizeDraftSpec.ts
// Browser bundle exposing the shared normalizePostSpec helper.
import { normalizePostSpec } from '../../server/lib/ingestionAdapter.js';

export type NormalizeDraftSpecOptions = {
  allowedAffiliateKeys?: string[];
};

export function normalizeDraftSpec(spec: unknown, options: NormalizeDraftSpecOptions = {}) {
  const input = (spec && typeof spec === 'object') ? spec : {};
  try {
    const result = normalizePostSpec(input as any, options);
    return result;
  } catch (error) {
    return { spec: input, report: [], warnings: [String((error as Error)?.message || error)] };
  }
}

declare global {
  interface Window {
    WitchClick?: {
      normalizeDraftSpec?: typeof normalizeDraftSpec;
    };
  }
}

if (typeof window !== 'undefined') {
  const ns = (window.WitchClick = window.WitchClick || {});
  ns.normalizeDraftSpec = normalizeDraftSpec;
}

export default normalizeDraftSpec;
