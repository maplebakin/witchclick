export interface NavLink {
  href: string;
  label: string;
  rel?: string;
}

export const primaryNavLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/hub/", label: "Hubs" },
  { href: "/curses/", label: "Curses" },
  { href: "/entities/", label: "Entities" },
  { href: "/salon/", label: "Salon" },
  { href: "/tools/", label: "Tools & Prints" },
];

export const secondaryNavLinks: NavLink[] = [
  { href: "/partners/", label: "Partners" },
  { href: "/about/", label: "About" },
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
