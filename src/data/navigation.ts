export interface NavLink {
  href: string;
  label: string;
  rel?: string;
}

export interface AdminNavSection {
  label: string;
  items: NavLink[];
}

export const primaryNavLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/hub/", label: "Hubs" },
  { href: "/curses/", label: "Curses" },
  { href: "/salon/", label: "Salon" },
  { href: "/tools/", label: "Tools & Prints" },
];

export const secondaryNavLinks: NavLink[] = [
  { href: "/start", label: "Start Here" },
  { href: "/entities/", label: "Entities" },
  { href: "/partners/", label: "Partners" },
  { href: "/about/", label: "About" },
];

export const headerUtilityLinks: NavLink[] = [
  { href: "/contact/", label: "Contact" },
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
