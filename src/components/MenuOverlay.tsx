/** @jsxImportSource preact */
import { useEffect } from 'preact/hooks';
import { menuOpen, closeAll } from '@/lib/uiState';

type NavItem = {
  href: string;
  label: string;
};

type MenuOverlayProps = {
  nav: NavItem[];
};

export default function MenuOverlay({ nav }: MenuOverlayProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAll();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleClose = () => {
    menuOpen.value = false;
  };

  return (
    <div
      class={`fixed inset-0 z-40 md:hidden ${menuOpen.value ? 'block' : 'hidden'}`}
      aria-hidden={!menuOpen.value}
    >
      <div class="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div
        class="absolute left-0 top-0 flex h-full w-80 flex-col bg-white p-4 shadow-2xl dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div class="mb-4 flex items-center justify-between">
          <span class="font-semibold">WitchClick Paths</span>
          <button class="rounded-xl border px-3 py-1" type="button" aria-label="Close menu" onClick={handleClose}>
            ✕
          </button>
        </div>
        <ul class="space-y-2">
          {nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                class="block rounded-xl px-3 py-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:hover:bg-zinc-800"
                onClick={handleClose}
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
