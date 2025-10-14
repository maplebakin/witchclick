/** @jsxImportSource preact */
import { useEffect, useRef } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import { searchOpen } from '@/lib/uiState';

type SearchPanelProps = {
  label?: string;
};

export default function SearchPanel({ label = 'Search posts' }: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    searchOpen.value = false;
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useSignalEffect(() => {
    if (!searchOpen.value) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  });

  return (
    <div
      class={`fixed inset-0 z-40 ${searchOpen.value ? 'block' : 'hidden'}`}
      aria-hidden={!searchOpen.value}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div class="absolute inset-0 bg-black/50" onClick={close} />
      <div class="absolute inset-x-0 top-0 mx-auto mt-10 w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold">{label}</h2>
          <button class="rounded-xl border px-3 py-1" type="button" aria-label="Close search" onClick={close}>
            ✕
          </button>
        </div>
        <input
          ref={inputRef}
          type="search"
          placeholder="Type to search…"
          class="w-full rounded-xl border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        />
      </div>
    </div>
  );
}
