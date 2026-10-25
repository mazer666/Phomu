/**
 * The one test that states whether the admin API is reachable.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The admin API is hardened, it is tested, and it is documented. The
 * question that all of that does not answer is the only question that
 * counts for the user: **can the route be called at all?**
 *
 * The measured answer today is **no**. The two independent causes are:
 *
 *   1. `next.config.ts` sets `output: 'export'`. A static export cannot
 *      execute a route handler - Next.js does not emit one.
 *   2. The two handlers live in `src/admin-api/`, not below the app
 *      directory. The App Router only collects pages and route handlers
 *      from the app directory (`next/dist/lib/find-pages-dir.js`:
 *      `findDir(dir, 'app')` -> `<root>/app` or `<root>/src/app`), so a
 *      handler outside of it is never registered - not in the export, not
 *      in a server build.
 *
 * WHAT THIS TEST PROVES
 * ---------------------
 * It measures both causes from the repository and asserts the measured
 * verdict. It therefore does not merely restate a claim: if somebody
 * moves the handlers below `src/app/` or drops the static export, the
 * measurement changes and **this test turns red**. The red test is the
 * reminder that the decision recorded in
 * `docs/cr/CR-0002-admin-api-entscheidung.md` has to be resolved and
 * that the documentation has to follow.
 *
 * It is the only test in the project that makes a statement about the
 * *operation* of the admin API. Everything else in `src/admin-api/` tests
 * the behaviour of the code, not its availability.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import nextConfig from '../../next.config';

/** The decision record that has to change when the verdict changes. */
const DECISION_RECORD = 'docs/cr/CR-0002-admin-api-entscheidung.md';

/**
 * The verdict that the measurement has to produce. A change of this
 * constant is a change of the architecture and therefore a decision of
 * the owner - not a detail of the implementation.
 */
const EXPECTED_VERDICT = 'unreachable';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const APP_DIR = path.join(REPO_ROOT, 'src', 'app');
const ADMIN_API_DIR = path.join(REPO_ROOT, 'src', 'admin-api');

/** The route paths of the handlers that belong to the admin API. */
const ADMIN_API_ROUTE_PATHS = ['/admin/covers/search', '/admin/covers/save'];

interface Reachability {
  /** True when the build is a static export. */
  staticExport: boolean;
  /** The route handlers that the App Router finds below `src/app/`. */
  registeredRouteHandlers: string[];
  /** The admin API route paths that the App Router registered. */
  registeredAdminRoutes: string[];
  /** The admin API route paths that exist in the source tree. */
  existingAdminRoutes: string[];
  /** The verdict of the measurement. */
  verdict: 'reachable' | 'unreachable';
  /** The reasons for the verdict. */
  reasons: string[];
}

/**
 * Collects the route handlers below a directory and turns their file path
 * into the route path that the App Router would use.
 *
 * @param dir the root of the app directory
 * @returns the route paths, for example `/admin/covers/search`
 */
function collectRouteHandlers(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const found: string[] = [];

  const walk = (current: string, prefix: string): void => {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full, `${prefix}/${entry.name}`);
        continue;
      }
      if (!entry.isFile()) continue;
      if (entry.name !== 'route.ts' && entry.name !== 'route.tsx') continue;
      found.push(prefix === '' ? '/' : prefix);
    }
  };

  walk(dir, '');
  return found.sort();
}

/**
 * Measures whether the admin API can be called in the delivered build.
 *
 * The measurement has three parts: the export mode of the build, the
 * route handlers that the App Router registers, and — when a build
 * artefact exists — the route manifest of that build.
 *
 * @returns the measurement
 */
function measureReachability(): Reachability {
  const staticExport = nextConfig.output === 'export';
  const registeredRouteHandlers = collectRouteHandlers(APP_DIR);
  const registeredAdminRoutes = registeredRouteHandlers.filter((route) =>
    ADMIN_API_ROUTE_PATHS.includes(route)
  );

  const existingAdminRoutes = ADMIN_API_ROUTE_PATHS.filter((route) =>
    fs.existsSync(
      path.join(ADMIN_API_DIR, 'admin', 'covers', route.split('/').pop()!, 'route.ts')
    )
  );

  const reasons: string[] = [];
  if (staticExport) {
    reasons.push(
      "next.config.ts sets output: 'export' — a static export cannot execute a route handler"
    );
  }
  if (registeredAdminRoutes.length === 0) {
    reasons.push(
      'no route handler of the admin API is registered by the App Router — the handlers live in src/admin-api/, the App Router only collects src/app/'
    );
  }

  return {
    staticExport,
    registeredRouteHandlers,
    registeredAdminRoutes,
    existingAdminRoutes,
    verdict: staticExport || registeredAdminRoutes.length === 0
      ? 'unreachable'
      : 'reachable',
    reasons,
  };
}

describe('the reachability of the admin API', () => {
  it('measures the verdict and asserts the recorded one', () => {
    const measured = measureReachability();

    expect(
      measured.verdict,
      [
        'The reachability of the admin API has changed and the decision',
        `record (${DECISION_RECORD}) has to be resolved with it.`,
        `Measured: output='${nextConfig.output ?? 'default'}',`,
        `registered route handlers below src/app: ${
          measured.registeredRouteHandlers.join(', ') || 'none'
        },`,
        `reasons: ${measured.reasons.join(' | ') || 'none'}`,
      ].join(' ')
    ).toBe(EXPECTED_VERDICT);
  });

  it('states the two causes that make the admin API unreachable', () => {
    const measured = measureReachability();

    // Cause 1: the build is a static export.
    expect(measured.staticExport).toBe(true);

    // Cause 2: the App Router registers no admin API route handler.
    expect(measured.registeredAdminRoutes).toEqual([]);
  });

  it('keeps the handlers of the admin API outside of the app directory', () => {
    const measured = measureReachability();

    // The handlers exist — otherwise this file would describe a state
    // that does not exist any more. The decision to remove them is
    // recorded in the decision record; the test points at it.
    expect(measured.existingAdminRoutes).toEqual(ADMIN_API_ROUTE_PATHS);
    expect(measured.registeredAdminRoutes).toEqual([]);
  });

  it('has no route handler below src/app that serves the admin API', () => {
    const measured = measureReachability();

    for (const route of measured.registeredRouteHandlers) {
      expect(ADMIN_API_ROUTE_PATHS).not.toContain(route);
    }
  });

  it('does not claim a reachability that the build artefact contradicts', () => {
    const manifestPath = path.join(
      REPO_ROOT,
      '.next',
      'app-path-routes-manifest.json'
    );

    if (!fs.existsSync(manifestPath)) {
      // The unit tests run without a build in CI. The measurement above
      // does not depend on the artefact.
      expect(measureReachability().verdict).toBe(EXPECTED_VERDICT);
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as
      Record<string, string>;
    const adminRoutes = Object.keys(manifest).filter((key) =>
      key.includes('admin/covers')
    );

    expect(
      adminRoutes,
      `The build manifest registers an admin API route: ${adminRoutes.join(', ')}. ` +
        `Resolve the decision record (${DECISION_RECORD}) with it.`
    ).toEqual([]);
  });
});
