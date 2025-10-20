// server/lib/curseSpecSchema.js
// Shared curse schema bridged through the centralized registry.

import {
  CURSE_TAGS,
  CURSE_TARGETS,
  CURSE_TONES,
  CURSE_TYPES,
  CurseGeneratorInputSchema,
  CurseSpecSchema,
  countCurseWords,
  generateCurseSchemaDocumentation,
} from '../../shared/schema/index.js';

export {
  CURSE_TAGS,
  CURSE_TARGETS,
  CURSE_TONES,
  CURSE_TYPES,
  CurseGeneratorInputSchema,
  CurseSpecSchema,
  countCurseWords,
  generateCurseSchemaDocumentation,
};

export const countWords = countCurseWords;

export default CurseSpecSchema;
