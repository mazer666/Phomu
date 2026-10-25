/**
 * The deterministic environment of the conformance runner
 *
 * WHY: the reference must be measured in a state that does not depend on the
 * machine it runs on. Two things leak into the store today: the
 * `localStorage` of the persist middleware and the wall clock (the `time`
 * ending condition reads `Date.now()`).
 *
 * WHAT: a memory-only `localStorage` and a clock that the harness controls.
 * The module installs the storage at import time — the store has to be
 * imported **after** this module, otherwise the persist middleware has
 * already captured a missing storage.
 *
 * EXAMPLE: `setClock(1700000000000)` freezes `Date.now()` at that instant.
 */

/** The clock the harness controls — the reference reads it via `Date.now`. */
let clockMs = 1_700_000_000_000;

/**
 * The memory-only storage of the persist middleware.
 *
 * @returns a `Storage`-shaped object that keeps everything in a map
 */
function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
    clear: () => entries.clear(),
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
  } as Storage;
}

// The persist middleware of the store resolves its storage when the store is
// created — therefore the stub has to exist before the store is imported.
// The middleware reads `window.localStorage`, so the stub lives on `window`.
if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: createMemoryStorage() },
    configurable: true,
    writable: true,
  });
} else if (typeof globalThis.window.localStorage === 'undefined') {
  Object.defineProperty(globalThis.window, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}

Date.now = () => clockMs;

/**
 * Sets the clock of the harness.
 *
 * @param ms - the instant the clock reports, in milliseconds since the epoch
 */
export function setClock(ms: number): void {
  clockMs = ms;
}

/**
 * Resets the clock to the default instant of the runner.
 *
 * WHY: every vector starts from the same instant — otherwise a vector that
 * sets the clock would influence the next one.
 */
export function resetClock(): void {
  clockMs = 1_700_000_000_000;
}
