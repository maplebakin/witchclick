/** @jsxImportSource preact */
import { menuOpen, searchOpen, closeAll } from '@/lib/uiState';

export default function HeaderIsland() {
  return (
    <div class="flex items-center gap-2">
      <button
        class="px-3 py-2 rounded-xl border"
        aria-expanded={menuOpen.value}
        onClick={() => { searchOpen.value = false; menuOpen.value = !menuOpen.value; }}>
        Menu
      </button>
      <button
        class="px-3 py-2 rounded-xl border"
        aria-expanded={searchOpen.value}
        onClick={() => { menuOpen.value = false; searchOpen.value = !searchOpen.value; }}>
        Search
      </button>
      <button class="px-2 py-1 text-sm opacity-70 hover:opacity-100" onClick={() => closeAll()}>
        Reset
      </button>
    </div>
  );
}
