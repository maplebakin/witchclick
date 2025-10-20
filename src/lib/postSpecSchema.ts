// src/lib/postSpecSchema.ts
export {
  ENTITY_TYPES,
  CONTENT_TYPES,
  EntityTypeSchema,
  PostContentTypeSchema,
  PostSpecV2Schema,
  generatePostSpecDocumentation as generateSchemaDocumentation,
  stripMarkdownToPlainText,
} from '../../shared/schema/index.js';

export type {
  EntityType,
  PostContentType,
  PostSpecV2,
} from '../../shared/schema/index.js';
