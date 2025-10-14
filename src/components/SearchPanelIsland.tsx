/** @jsxImportSource preact */
import { useSignalValue } from '@preact/signals';
import { searchOpen } from '@/lib/uiState';

interface Props {
  label?: string;
}

export default function SearchPanelIsland({ label = 'Search posts' }: Props) {
  const isOpen = useSignalValue(searchOpen);

  return (
    <div
      class={`fixed inset-0 z-40 ${isOpen ? 'block' : 'hidden'}`}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-black/50" onClick={() => (searchOpen.value = false)} />
      <div class="absolute inset-x-0 top-0 mx-auto mt-10 w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold">{label}</h2>
          <button
            class="rounded-xl border px-3 py-1"
            aria-label="Close search"
            onClick={() => (searchOpen.value = false)}
            type="button"
          >
            ✕
          </button>
        </div>
        <input
          type="search"
          placeholder="Type to search…"
          class="w-full rounded-xl border px-3 py-2"
        />
      </div>
    </div>
  );
}
