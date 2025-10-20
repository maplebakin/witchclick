import fs from 'node:fs';
import path from 'node:path';

import { buildCursePrompt } from '../../server/lib/cursePromptBuilder.js';
import { CURSE_TARGETS, CURSE_TONES, CURSE_TYPES } from '../../shared/schema/index.js';

const CWD = process.cwd();
const TMP_DIR = path.join(CWD, 'tmp');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function gencurse({
  type,
  target,
  tone,
  sigilName,
  altarItem,
  journalingFollowUp,
}: {
  type?: string;
  target?: string;
  tone?: string;
  sigilName?: string;
  altarItem?: string;
  journalingFollowUp?: string;
}) {
  const safeType = CURSE_TYPES.includes(type as any) ? (type as typeof CURSE_TYPES[number]) : 'mirror';
  const safeTarget = CURSE_TARGETS.includes(target as any)
    ? (target as typeof CURSE_TARGETS[number])
    : 'person';
  const safeTone = CURSE_TONES.includes(tone as any)
    ? (tone as typeof CURSE_TONES[number])
    : 'poetic';

  const prompt = buildCursePrompt({
    type: safeType,
    target: safeTarget,
    tone: safeTone,
    sigilName,
    altarItem,
    journalingFollowUp,
  });

  ensureDir(TMP_DIR);
  const file = path.join(TMP_DIR, 'curse_prompt.txt');
  fs.writeFileSync(file, prompt, 'utf8');
  console.log(prompt);
  return { file, prompt };
}

export default { gencurse };
