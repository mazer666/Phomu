// A component that imports a barrel, which re-exports the raw catalogue.
// The gate has to catch it as well.

import { ALL_SONGS } from '@/data/packs';

export function count(): number {
  return ALL_SONGS.length;
}
