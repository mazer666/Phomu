// A component that uses the configuration and the narrow catalogue
// interface. It never touches the raw catalogue.

import { PHOMU_CONFIG } from '@/config/game-config';
import { loadCatalogue } from '@/data/catalogue';

export function Widget(): number {
  return PHOMU_CONFIG.PHASES.length;
}

export async function count(): Promise<number> {
  const entries = await loadCatalogue();
  return entries.length;
}
