import { loadAllPosts, filterPostsByCategory, POST_CATEGORY_MEANDERING } from "@/utils/posts";

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

const hasPublishedMeanderings =
  filterPostsByCategory(loadAllPosts(), POST_CATEGORY_MEANDERING).length > 0;

export const primaryNavLinks: NavLink[] = [
  { href: "/start", label: "Start Here" },
  { href: "/entities", label: "Grimoire" },
  { href: "/hub", label: "Hubs", description: "Entry rooms for calm, focus, release, and perspective shifts" },
  { href: "/tools", label: "Ritual Tools" },
  ...(hasPublishedMeanderings
    ? [
        {
          href: "/meanderings",
          label: "Essays",
          variant: "pill", // keeps your “special” highlight on this slot
        } satisfies NavLink,
      ]
    : []),
];

export const secondaryNavLinks: NavLink[] = [
  { href: "/curses", label: "White Magic Curses", description: "Ethical refusal and boundary rituals" },
  { href: "/page/1", label: "Archive", description: "Browse every ritual, essay, and reference in one place" },
  { href: "/tags", label: "Tags", description: "Browse all topics by tag" },
  { href: "/partners", label: "Partners", description: "Small businesses and ethical brands we love" },
];

export const headerUtilityLinks: NavLink[] = [
  { href: "/contact", label: "Contact" },
];

export const footerUtilityLinks: NavLink[] = [
  { href: "/author", label: "Authors" },
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
