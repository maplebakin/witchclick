import type { STRICT_JSON_RULES } from './strictJsonRules.js';

export interface CursePromptOptions {
  type: string;
  target: string;
  tone: string;
  topic?: string;
  sigilName?: string;
  altarItem?: string;
  journalingFollowUp?: string;
  strictJsonRules?: typeof STRICT_JSON_RULES;
}

export declare function buildCursePrompt(options: CursePromptOptions): string;

export default buildCursePrompt;
