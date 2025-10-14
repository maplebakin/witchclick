/** @jsxImportSource preact */
import { menuOpen } from "@/lib/uiState";

type NavItem = {
  href: string;
  label: string;
};

type MobileDrawerProps = {
  nav: NavItem[];
};

export default function MobileDrawer({ nav }: MobileDrawerProps) {
  return (
    <div
      class={`fixed inset-0 z-40 md:hidden ${menuOpen.value ? "block" : "hidden"}`}
      aria-hidden={!menuOpen.value}
    >
      <div class="absolute inset-0 bg-black/50" />
      <div class="absolute left-0 top-0 h-full w-80 bg-white p-4 shadow-2xl dark:bg-zinc-900">
        <div class="mb-4 flex items-center justify-between">
          <span class="font-semibold">WitchClick Paths</span>
          <button
            class="rounded-xl border px-3 py-1"
            aria-label="Close menu"
            onClick={() => {
              menuOpen.value = false;
            }}
          >
            ✕
          </button>
        </div>
        <ul class="space-y-2">
          {nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                class="block rounded-xl px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => {
                  menuOpen.value = false;
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
