import { toAbsoluteUrl, type SiteSettings } from "./settings";

export interface StructuredItem {
  name: string;
  url: string;
  description?: string;
  image?: string;
}

export interface ItemListOptions {
  name: string;
  url: string;
  description?: string;
  itemType?: string;
}

export function createItemListSchema(
  settings: SiteSettings,
  options: ItemListOptions,
  items: StructuredItem[],
) {
  const itemType = options.itemType ?? "Article";
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: options.name,
    description: options.description,
    url: toAbsoluteUrl(options.url, settings),
    itemListElement: items.map((item, index) => {
      const absoluteUrl = toAbsoluteUrl(item.url, settings);
      const image = item.image ? toAbsoluteUrl(item.image, settings) : undefined;
      return {
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl,
        name: item.name,
        item: {
          "@type": itemType,
          name: item.name,
          url: absoluteUrl,
          description: item.description,
          image,
        },
      };
    }),
  };
}

export interface CollectionPageOptions extends ItemListOptions {
  collectionType?: string;
}

export function createCollectionPageSchema(
  settings: SiteSettings,
  options: CollectionPageOptions,
  items: StructuredItem[],
) {
  const list = createItemListSchema(settings, options, items);
  const { "@context": _context, ...listWithoutContext } = list;
  return {
    "@context": "https://schema.org",
    "@type": options.collectionType ?? "CollectionPage",
    name: options.name,
    description: options.description,
    url: toAbsoluteUrl(options.url, settings),
    mainEntity: listWithoutContext,
  };
}

const SCRIPT_END_PATTERN = /<\/(script)/gi;

export function serializeStructuredData(data: unknown) {
  return JSON.stringify(data).replace(SCRIPT_END_PATTERN, "<\\/$1");
}
