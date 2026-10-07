export interface NavLink {
  href: string;
  label: string;
  description?: string;
  rel?: string;
  variant?: 'pill' | 'default';
}

export interface AdminNavSection {
  label: string;
  items: NavLink[];
}

export const primaryNavLinks: NavLink[] = [
  { href: "/start", label: "Start", description: "A guided first path into WitchClick" },
  { href: "/curses", label: "Clean Cursing", description: "Ethical boundary rituals, energetic return, and clean refusal" },
  { href: "/hub", label: "Rituals & Spreads", description: "Tarot spreads, grounding rituals, and symbolic workings" },
  { href: "/entities", label: "Grimoire", description: "Symbolic reference for tarot, herbs, crystals, planets, and rituals" },
  { href: "/search", label: "Search", description: "Find a ritual, spread, symbol, or question" },
];

export const secondaryNavLinks: NavLink[] = [
  { href: "/tags", label: "Tags", description: "Browse topics by tag" },
  { href: "/page/1", label: "All Workings", description: "Browse every published ritual and practical working" },
  { href: "/tools", label: "Practice Tools", description: "Printables and supports for reflective practice" },
  { href: "/partners", label: "Partners", description: "Verified community partners and affiliate disclosures" },
  { href: "/rss.xml", label: "RSS", rel: "alternate", description: "Subscribe to WitchClick updates" },
];

export const headerUtilityLinks: NavLink[] = [
  { href: "/contact", label: "Contact" },
];

export const footerUtilityLinks: NavLink[] = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/disclosures", label: "Disclosures" },
  { href: "/partners", label: "Partners" },
  { href: "/rss.xml", label: "RSS", rel: "alternate" },
  { href: "/feed.json", label: "JSON Feed", rel: "alternate" },
];

export const adminNavSections: AdminNavSection[] = [
  {
    label: "Dashboard",
    items: [
      { href: "/admin", label: "Work queues", description: "Overview and next actions" },
    ]
  },
  {
    label: "Create",
    items: [
      { href: "/admin/generator", label: "Generate a post", description: "Build prompts and save generated posts" },
      { href: "/admin/write", label: "Write a post", description: "Compose a new post in Markdown" },
      { href: "/admin/curses", label: "Generate a curse", description: "Build prompts and ingest curses" },
    ]
  },
  {
    label: "Review",
    items: [
      { href: "/admin/staging", label: "Review drafts", description: "Review, compare, and publish draft posts" },
      { href: "/admin/stubs", label: "Post Stub Forge", description: "Review post stubs and replace them with completed drafts" },
      { href: "/admin/hero", label: "Complete hero images", description: "Upload artwork and attach it to posts" },
    ]
  },
  {
    label: "Library",
    items: [
      { href: "/admin/posts", label: "Posts", description: "Browse and edit existing posts" },
      { href: "/admin/entities", label: "Entities", description: "Create and edit entities, including entity stubs" },
      { href: "/admin/curses/archive", label: "Curse archive & editor", description: "Browse and edit archived curses" },
      { href: "/admin/downloads", label: "Downloads", description: "Create, edit, and archive download records" },
      { href: "/admin/authors", label: "Authors", description: "Create and edit author profiles" },
    ]
  },
  {
    label: "Site",
    items: [
      { href: "/admin/home", label: "Homepage", description: "Configure homepage content" },
      { href: "/admin/calendar", label: "Seasonal calendar", description: "Configure seasons, anchors, and rituals" },
      { href: "/admin/partners", label: "Partners & community", description: "Configure partner sections and affiliate highlights" },
      { href: "/admin/products", label: "Affiliate products", description: "Configure the affiliate product catalogue" },
      { href: "/admin/theme", label: "Themes & typography", description: "Configure palettes, fonts, and theme scopes" },
    ]
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Site settings", description: "Configure site settings" },
    ]
  }
];
