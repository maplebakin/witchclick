/** @jsxImportSource preact */
import { searchOpen } from "@/lib/uiState";

type SearchPanelProps = {
  label?: string;
};

export default function SearchPanel({ label = "Search posts" }: SearchPanelProps) {
  return (
    <div
      class={`fixed inset-0 z-40 ${searchOpen.value ? "block" : "hidden"}`}
      aria-hidden={!searchOpen.value}
    >
      <div class="absolute inset-0 bg-black/50" />
      <div class="absolute inset-x-0 top-0 mx-auto mt-10 w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold">{label}</h2>
          <button
            class="rounded-xl border px-3 py-1"
            aria-label="Close search"
            onClick={() => {
              searchOpen.value = false;
            }}
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
