// A pure helper. It reads no store and no component.

import type { PhomuSong } from '@/types/song';

export function titleOf(song: PhomuSong): string {
  return song.title;
}
