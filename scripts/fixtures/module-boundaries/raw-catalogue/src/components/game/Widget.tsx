// A component that imports the raw catalogue. The gate has to catch it.

import { ALL_SONGS } from '@/data/songs';

export function count(): number {
  return ALL_SONGS.length;
}
