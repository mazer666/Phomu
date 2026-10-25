/**
 * The catalogue of the shell.
 *
 * WHAT: the hook that loads the records of the catalogue from the base.
 *
 * WHY the hook exists: the catalogue is the answer key of the game and it
 * travels to the browser as a compressed artefact. Only the base reads it.
 * A surface that needs the records — the catalogue browser and the
 * administrative surfaces — asks the base for them and waits for the answer
 * (docs/qa/QA-09-REMEDIATION-BACKLOG.md § 1.1).
 *
 * WHY the records are not in the markup: the export is static. A catalogue
 * that were rendered into the HTML would put every title into a file that
 * every visitor downloads.
 *
 * EXAMPLE: `const { records, isLoading } = useCatalogueRecords();`
 */
'use client';

import { useEffect, useState } from 'react';
import type { PhomuSong } from '@/types/song';
import { catalogueSongs } from '@/core/catalogue-service';

/** The state of the catalogue of the shell. */
export interface CatalogueState {
  /** The records of the catalogue — empty while they are loading. */
  records: PhomuSong[];
  /** Whether the records are still loading. */
  isLoading: boolean;
  /** The failure of the load, if there was one. */
  failure: string | null;
}

/**
 * Loads the records of the catalogue from the base.
 *
 * WHY the hook and not a service call in every page: the load happens once
 * per session of the browser, and every surface sees the same records.
 *
 * @returns The records of the catalogue and the state of the load.
 */
export function useCatalogueRecords(): CatalogueState {
  const [records, setRecords] = useState<PhomuSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const loaded = await catalogueSongs();
        if (cancelled) return;
        setRecords(loaded);
        setFailure(null);
      } catch (reason) {
        if (cancelled) return;
        setFailure(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { records, isLoading, failure };
}
