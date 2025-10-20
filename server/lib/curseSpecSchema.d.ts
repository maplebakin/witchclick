export {
  CURSE_TAGS,
  CURSE_TARGETS,
  CURSE_TONES,
  CURSE_TYPES,
  CurseGeneratorInputSchema,
  CurseSpecSchema,
  countCurseWords as countWords,
  generateCurseSchemaDocumentation,
} from '../../shared/schema/index.js';

export type {
  CurseGeneratorInput,
  CurseSpec,
} from '../../shared/schema/index.js';

declare const _default: typeof CurseSpecSchema;
export default _default;
