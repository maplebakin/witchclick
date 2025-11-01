export interface NavLink {
  href: string;
  label: string;
}

export const primaryNavLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/journal", label: "Journal" },
  { href: "/entities", label: "Entities" },
  { href: "/spreads", label: "Spreads" },
  { href: "/about", label: "About" },
];
