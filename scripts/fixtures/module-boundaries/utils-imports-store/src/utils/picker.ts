// A helper that imports the store. The gate has to catch it.

import { useGameStore } from '@/stores/game-store';

export function pick(): number {
  return useGameStore.getState().currentRound;
}
