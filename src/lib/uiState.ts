import { signal } from '@preact/signals';
export const menuOpen = signal(false);
export const searchOpen = signal(false);
export function closeAll() {
  menuOpen.value = false;
  searchOpen.value = false;
}
