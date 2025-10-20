export {
  CONTENT_TYPES,
  ENTITY_TYPES,
  EntityTypeSchema,
  PostContentTypeSchema,
  PostSpecV2Schema,
  stripMarkdownToPlainText,
} from '../../shared/schema/index.js';

export { generatePostSpecDocumentation as generateSchemaDocumentation } from '../../shared/schema/index.js';

export type {
  EntityType,
  PostContentType,
  PostSpecV2,
} from '../../shared/schema/index.js';

declare const _default: typeof PostSpecV2Schema;
export default _default;
