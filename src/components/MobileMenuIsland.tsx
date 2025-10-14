/** @jsxImportSource preact */
import { useSignalValue } from '@preact/signals';
import { menuOpen } from '@/lib/uiState';

type NavItem = {
  href: string;
  label: string;
};

interface Props {
  items: NavItem[];
}

export default function MobileMenuIsland({ items }: Props) {
  const isOpen = useSignalValue(menuOpen);

  return (
    <div
      class={`md:hidden fixed inset-0 z-40 ${isOpen ? 'block' : 'hidden'}`}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-black/50" onClick={() => (menuOpen.value = false)}></div>
      <div class="absolute left-0 top-0 h-full w-80 bg-white p-4 shadow-2xl dark:bg-zinc-900">
        <div class="mb-4 flex items-center justify-between">
          <span class="font-semibold">WitchClick Paths</span>
          <button
            class="rounded-xl border px-3 py-1"
            aria-label="Close menu"
            onClick={() => (menuOpen.value = false)}
            type="button"
          >
            ✕
          </button>
        </div>
        <ul class="space-y-2">
          {items.map((n) => (
            <li>
              <a
                href={n.href}
                class="block rounded-xl px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => (menuOpen.value = false)}
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
