// server/lib/postSpecSchema.js
// Canonical PostSpec schema bridged through the shared registry.

import {
  CONTENT_TYPES,
  ENTITY_TYPES,
  EntityTypeSchema,
  PostContentTypeSchema,
  PostSpecV2Schema,
  generatePostSpecDocumentation,
  stripMarkdownToPlainText,
} from '../../shared/schema/index.js';

export {
  CONTENT_TYPES,
  ENTITY_TYPES,
  EntityTypeSchema,
  PostContentTypeSchema,
  PostSpecV2Schema,
  stripMarkdownToPlainText,
};

export const generateSchemaDocumentation = generatePostSpecDocumentation;

export default PostSpecV2Schema;
