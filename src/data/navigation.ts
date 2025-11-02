export interface NavLink {
  href: string;
  label: string;
}

const showAdmin =
  import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_ADMIN === "true";

export const primaryNavLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/journal", label: "Journal" },
  { href: "/entities", label: "Entities" },
  { href: "/spreads", label: "Spreads" },
  { href: "/about", label: "About" },
];

export const devOnlyNavLinks: NavLink[] = showAdmin
  ? [{ href: "/admin", label: "Admin" }]
  : [];
