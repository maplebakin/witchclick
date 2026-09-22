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
  { href: "/tags", label: "Topics", description: "Browse topics by tag" },
  { href: "/page/1", label: "Archive", description: "Browse every published ritual and practical working" },
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
    label: "Content",
    items: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/generator", label: "Generator" },
      { href: "/admin/staging", label: "Staging" },
      { href: "/admin/write", label: "Write" },
      { href: "/admin/posts", label: "Posts" },
      { href: "/admin/curses", label: "Curses" },
    ]
  },
  {
    label: "Manage",
    items: [
      { href: "/admin/entities", label: "Entities" },
      { href: "/admin/stubs", label: "Entity Stubs" },
      { href: "/admin/authors", label: "Authors" },
      { href: "/admin/partners", label: "Partners" },
      { href: "/admin/calendar", label: "Calendar" },
      { href: "/admin/downloads", label: "Downloads" },
    ]
  },
  {
    label: "Design",
    items: [
      { href: "/admin/theme", label: "Theme" },
      { href: "/admin/hero", label: "Hero Images" },
      { href: "/admin/home", label: "Homepage" },
    ]
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/settings", label: "Settings" },
    ]
  }
];
