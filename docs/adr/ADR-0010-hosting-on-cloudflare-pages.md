# ADR-0010 — The web shell is hosted on Cloudflare Pages

**Status:** accepted
**Date:** 2026-10-27
**Owner role:** Chief Architect
**Related requirement IDs:** SEC-001, SEC-004, QA-SEC-001, QA-SEC-002, QA-SPO-001
**Closes:** the hosting decision of the QA remediation backlog, item 2.6

---

## Context

The web shell is a **static export** (`next.config.ts`: `output: 'export'`) that
is currently deployed to **GitHub Pages**. Three findings of the independent QA
assessment follow from that single fact:

| Finding | Why GitHub Pages cannot solve it |
|---|---|
| **QA-SEC-001** — the security headers never reach the browser | A static host has no configuration surface for response headers. The nine headers in `config/security-headers.mjs` are silently dropped. |
| **QA-SEC-002** — the admin API cannot run | A static export has no server. The route handlers under `src/admin-api/` are never registered, so the admin interface calls an API that does not exist. |
| **QA-SPO-001** — the round payload carries the answer key to the client | Without a server there is nobody who could evaluate the round in the Rust base and keep the solution back. |

The QA assessment named **Cloudflare Pages** as the recommended host. The owner
asked for this decision to be made and the deployment to be prepared.

### What the facts allow

Measured against the Cloudflare documentation (retrieved 2026-10-27):

- A static Next.js export is a supported build (`npx next build` → `out`).
- **Static asset requests are free and unlimited** on every plan. Only requests
  that invoke a Function are counted (100,000 per day on the free plan).
- `_headers` sets response headers for static assets — up to 100 rules, 2,000
  characters per line. The nine headers of this project fit in one rule.
- `_headers` is **not** applied to the responses of a Pages Function. A function
  attaches the headers itself.
- `_routes.json` decides which requests may invoke a Function, so that the
  static traffic stays free.
- The free plan allows 20,000 files per site. The build output of this project
  is **1,797 files**, of which 1,649 are cover images.

### What the facts do not allow

The admin API **writes files** (`src/admin-api/admin/covers/save/route.ts`:
`readFile`, `writeFile`, `mkdir`). The Workers runtime has no file system. The
admin API therefore needs an **R2 bucket** (or a different host) before it can
run as a Pages Function. That is the second half of this decision and it is
**not** part of it.

---

## Decision

The web shell is hosted on **Cloudflare Pages**. GitHub Pages stays as the
fallback host until the Cloudflare deployment has proven itself, and the two
deployments are independent: a failure of the Cloudflare pipeline does not touch
the GitHub Pages one.

**The rules that make the host changeable:**

1. **One source for the security headers.** The list lives in
   `config/security-headers.mjs`. The Next.js server reads it, and
   `scripts/generate-cloudflare-headers.mjs` writes it into `public/_headers`
   for Cloudflare. The CI compares the two (`npm run check:cloudflare-headers`),
   so the hosts cannot drift apart.
2. **The base path is a variable, not a constant.** `NEXT_PUBLIC_BASE_PATH` is
   `/Phomu` on GitHub Pages and empty on a Cloudflare Pages project. Both the
   Next.js config and the runtime (`src/core/phomu-core.ts`) read it.
3. **The WebAssembly module is built before the shell.** The shell loads the
   shared Rust base as a WebAssembly module, so every deployment — GitHub Pages,
   Cloudflare Pages, the CI — has to build the module first. The `prebuild` step
   of `npm run build` does that; the deploy workflows call the package script
   and not `npx next build`, because the latter skips it.
4. **The Content-Security-Policy allows `'wasm-unsafe-eval'`.** Without it the
   browser refuses to compile the module and the game does not start. It is the
   one directive that exists only because of the shared base.

---

## Consequences

### What is gained

- The nine security headers **reach the browser** on the primary host, which
  closes QA-SEC-001 and the delivery half of QA-1.5.
- A place for the **API functions** exists: `/api/*` is reserved in
  `public/_routes.json`, and the static traffic around it stays free.
- The hosting is **free** at the scale of a party game, and the deployment is
  **one workflow** that builds the module, the shell and the headers together.

### What is not gained — and stays open

- The **admin API does not run yet.** It needs R2 for the cover files before it
  can become a Pages Function. Until then the decision is documented as
  *blocked*, not as *solved*. The decision about the admin API itself is
  separate — see [`../cr/CR-0002-admin-api-entscheidung.md`](../cr/CR-0002-admin-api-entscheidung.md).
- The **round API** — the answer key stays in the client until the base
  evaluates the round on the server. The native shells are not affected: they
  run the base on the device.
- The **domain** is not part of this decision. A Pages project is reachable at
  `phomu.pages.dev` from the start; a custom domain needs a domain in the same
  Cloudflare account.

---

## Rejected alternatives

### GitHub Pages, with the headers left undelivered

**What it is.** Keep the current deployment and accept that the security
headers never reach the browser.

**Why rejected.** The security headers are the reason the hosting question
exists. A CSP that is written down but never delivered is a claim in a
document, not a protection. The QA assessment rated the missing headers as a
finding against the release.

### Vercel

**What it is.** The natural host for a Next.js application; it sets headers and
runs route handlers.

**Why rejected for now.** Vercel would want the application as a **server**
instead of a static export, which is a larger change to the build and to the
deployment than the hosting question asks for. It also changes the cost
profile: the free tier is fine for a hobby project, but the product is meant to
grow with the number of parties. Cloudflare Pages keeps the static export, so
the change is limited to the deployment.

### A self-hosted Node server

**What it is.** Run `next start` on a VPS and terminate TLS there.

**Why rejected.** It puts the operation, the patching and the certificate
renewal of a server into the hands of a project that has one serverless
developer and no operations. The native shells need a server much less than
the web shell does.

### Cloudflare Workers with static assets (`assets.run_worker_first`)

**What it is.** The successor shape of Pages: one Worker serves the assets and
the API.

**Why not now.** It solves the same problems, but it moves the deployment away
from the Pages model that the Cloudflare documentation describes for a static
Next.js export, and the `wrangler` configuration differs. Pages is the
documented path for this build output; the Worker shape stays an option for
the point at which the admin API moves to R2.

---

## What has to happen

The deployment is prepared in the repository. Three steps belong to the owner,
because they need the account:

1. Create the Cloudflare account and the Pages project `phomu`.
2. Create the API token with the permission **Cloudflare Pages: Edit** and the
   account id.
3. Add both as the repository secrets `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID`.

The exact steps are in
[`../deployment/CLOUDFLARE.md`](../deployment/CLOUDFLARE.md).
