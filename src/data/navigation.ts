export type NavMatchMode = "exact" | "prefix";
export type NavHighlightMode = "glow" | "underline";

export interface NavLink {
  href: string;
  label: string;
  rel?: string;
  match?: NavMatchMode;
  highlight?: NavHighlightMode;
}

export interface AdminNavSection {
  label: string;
  items: NavLink[];
}

export const primaryNavLinks: NavLink[] = [
  { href: "/", label: "Home", match: "exact", highlight: "glow" },
  { href: "/hub/", label: "Hubs", match: "prefix", highlight: "glow" },
  { href: "/curses/", label: "Curses", match: "prefix", highlight: "glow" },
  { href: "/salon/", label: "Salon", match: "prefix", highlight: "glow" },
  { href: "/tools/", label: "Tools & Prints", match: "prefix", highlight: "glow" },
];

export const secondaryNavLinks: NavLink[] = [
  { href: "/entities/", label: "Entities", match: "prefix", highlight: "underline" },
  { href: "/partners/", label: "Partners", match: "prefix", highlight: "underline" },
  { href: "/about/", label: "About", match: "prefix", highlight: "underline" },
];

export const headerUtilityLinks: NavLink[] = [
  { href: "/contact/", label: "Contact" },
  { href: "/account/", label: "Account" },
];

export const footerUtilityLinks: NavLink[] = [
  { href: "/contact/", label: "Contact" },
  { href: "/partners/", label: "Partners" },
  { href: "/privacy", label: "Privacy" },
  { href: "/rss.xml", label: "RSS", rel: "alternate" },
  { href: "/feed.json", label: "JSON Feed", rel: "alternate" },
];

export const adminNavSections: AdminNavSection[] = [
  {
    label: "Content",
    items: [
      { href: "/admin/", label: "Generator" },
      { href: "/admin/write", label: "Write" },
      { href: "/admin/posts", label: "Posts" },
    ]
  },
  {
    label: "Manage",
    items: [
      { href: "/admin/entities", label: "Entities" },
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
