# Security Policy

**Project:** Phomu — hybrid music party game
**Repository:** <https://github.com/mazer666/Phomu>
**As of:** 2026-10-25
**Applies to:** the state on branch `feature/vocument-style-docs-and-i18n`

This document describes **what Phomu actually secures** and **what it does not
secure**. Every statement under "What is already secured" is backed by a file and
line in the repository. What could not be backed is listed under "What is not
secured" — that is not a flaw, that is the statement.

**About the line references:** They refer to the repository state of 2026-10-25. In
files that are being edited in parallel
(`src/components/game/**`, `src/components/browse/**`, `src/app/**`), the symbol
(variable name, function name, URL) is therefore given as well, so that the location
remains findable even after a line shift.

---

## 1. What Phomu is

Phomu is a pure browser game: a Next.js app that is deployed as a static export
(`output: 'export'`, `next.config.ts:64`) on GitHub Pages under the path `/Phomu`.
There is **no Phomu server**, no accounts, no synchronisation between devices. The
game logic, the catalog and the game state run entirely in the browser.

The most important sentence of this document follows from this architecture:

> Phomu is a **client application without an authority server**. Every boundary
> that is drawn only in the browser is a boundary that a user with developer
> tools can remove.

The only server-side boundary in the project is the admin API
(`src/admin-api/**`). The game does not use it and it is currently not reachable
(see section 5, item 1).

**Status of the admin API — blocked, with a condition.** The code of the admin
API is hardened and tested; the **endpoints are not registered in the delivered
build**. The decision — wire it up (needs the server of the hosting decision)
or remove the module — belongs to the owner and is recorded in
[`docs/cr/CR-0002-admin-api-entscheidung.md`](docs/cr/CR-0002-admin-api-entscheidung.md).
Every statement in section 4 about the admin API therefore describes **code**,
not a running service. The single test that states the measured reachability is
`src/admin-api/admin-api-reachability.test.ts`; it turns red as soon as the
architecture changes.

---

## 2. Trust boundaries

| # | Boundary | What lies on one side | What lies on the other side |
|---|---|---|---|
| **TB-1** | Admin API against the internet | The admin token (`ADMIN_API_TOKEN`), the allowlist of cover hosts, the file system of the server | Incoming requests from the network |
| **TB-2** | Catalog and cover data against the admin | The JSON packs under `src/data/songs/`, the covers under `public/covers/` | The admin import (iTunes/Deezer responses, cover URLs) |
| **TB-3** | Client against a manipulated localStorage state | The browser of the user | `localStorage`: game state, score, players, configuration |
| **TB-4** | Foreign URLs as an SSRF/tracking vector | The server of the admin API, the browser | YouTube, Spotify, Amazon Music, Apple Music, `p.scdn.co` |
| **TB-5** | QR scan input | The scanner (`src/utils/qr-intent.ts`) | The content of any QR code that someone prints on a poster |

### TB-1 — Admin API against the internet

The admin API is the only place where Phomu *changes* data. It is protected via the
header `x-admin-token` against the environment variable
`ADMIN_API_TOKEN` (`src/admin-api/_lib/security.ts:81-112`).

**This boundary does not exist in the delivered build.** The two handlers lie in
`src/admin-api/`, not below `src/app/`, and are therefore not registered by the
App Router; in addition the build is a static export (`output: 'export'`), which
cannot execute a route handler at all. The controls below are implemented and
tested, but there is no reachable endpoint at which they could take effect.
See F-01 and section 5, item 1.

### TB-2 — Catalog and cover data against the admin

The admin may specify cover URLs. This URL is fetched by the server and stored as a
file. That is a classic SSRF vector if the check only looks at the first URL. The
check therefore happens per hop (`src/admin-api/_lib/security.ts:280-310`).

### TB-3 — Client against a manipulated localStorage state

The game state lives in `localStorage` under the key `phomu-game-state`
(`src/stores/game-store.ts:619`). Anyone who edits this value edits score, player
names and game rules. That is a deliberate design decision (see section 5, item 3).

### TB-4 — Foreign URLs as an SSRF/tracking vector

There are three different accesses to third parties:

1. **The browser loads the media embeds.** YouTube (iframe API script and embed
   frame), Spotify (embed frame, preview audio), Amazon Music (embed frame). The
   provider sees IP address and cookies. Phomu has no influence on this and does not
   collect this data itself either.
2. **The admin API server calls iTunes and Deezer**
   (`src/admin-api/admin/covers/search/route.ts:77`, `:95`) — only with a valid
   token.
3. **The user reports a missing link.** The user triggers this themselves; the
   payload goes to GitHub, not to Phomu (see `PRIVACY.md`, section 4).

### TB-5 — QR scan input

`parseQrIntent` (`src/utils/qr-intent.ts`) reads arbitrary strings from the camera.
Four formats are recognised: `@Name`, `?session=…`, `?pack=…` and `?id=…` (the
last one explicitly as *not supported*).

---

## 3. Threat model

| Attack surface | Attacker | Entry point | Damage potential | Countermeasure | Status |
|---|---|---|---|---|---|
| Admin API: token brute force (**F-04**) | Unauthorised party on the internet | `x-admin-token` on every admin route | Full access to cover import and catalog mutation | Token comparison in constant time (`security.ts:63-67`), minimum length 32 (`security.ts:25`), failed attempts are counted per client and globally (`security.ts:118-141`) | **secured in the code, not reachable in the delivered build (F-01)** |
| Admin API: SSRF via cover URL (**F-02**) | Attacker with a valid token or a compromised cover host | `imageUrl` in `POST /admin/covers/save` | Access to internal services (metadata endpoint, internal APIs) of the admin server | HTTPS mandatory, host allowlist, **check of every redirect hop**, maximum 3 hops (`security.ts:306-330`) | **secured in the code, not reachable in the delivered build (F-01)** |
| Admin API: DoS through a large file (**F-03**) | Attacker with a valid token | Cover download, oversized request body | Filling up the memory and disk of the server | Streaming read with a hard limit of 5 MB (`hard-limits.ts:52-95`), request body capped at 16 KB (`hard-limits.ts:20`), JSON responses limited to 512 KB (`hard-limits.ts:26`) | **secured in the code, not reachable in the delivered build (F-01)** |
| Admin API: lock deadlock (**F-11**) | Crash of the process during a save operation | `.covers-save.lock` | Cover saving permanently blocked (503) | A stale lock (older than 120 s) is detected and released (`save/route.ts:37`, `:78-86`) | **secured in the code, not reachable in the delivered build (F-01)** |
| Admin API: error information (**F-10**) | Attacker with a valid token | Error responses of the routes | Disclosure of internal paths, file names, stack parts | Unexpected errors are logged server-side and answered without a detailed response (`save/route.ts:194-201`, `search/route.ts:156-162`); a missing token and a wrong token produce byte-identical answers, and the two misconfigurations produce byte-identical answers (`admin-api-hardening.test.ts`) | **secured in the code, not reachable in the delivered build (F-01)** |
| Browser: XSS via catalog or player data (**F-12**) | Attacker who gets data into the catalog or into the local state | Song titles, player names, hints | Execution of scripts in the context of the user | React escapes all text output; `object-src 'none'` in the CSP; no `dangerouslySetInnerHTML` in the project (`grep -rn "dangerouslySetInnerHTML" src` → 0 hits) | **partially secured** (see section 4) |
| Browser: manipulated game state (**F-15**) | Participant of a party session | `localStorage["phomu-game-state"]` | Manipulate score, players, game mode, XP | None. The server does not know the game state. | **not secured (design)** |
| Browser: QR code of an attacker | Anyone with access to the camera | `parseQrIntent` | Arbitrarily long strings in the user interface; pack selection | No length limit in `parseQrIntent` | **not secured** (finding **F-06**) |
| Browser: data trail at third parties | YouTube, Spotify, Amazon | Media embeds | IP address, cookies, playback behaviour at the provider | None. Phomu has no influence on the embeds. | **not secured (external)** |
| Privacy: device fingerprint in the error report | User who clicks "Report missing" (`game.music.reportMissing`) | `src/components/game/MusicPlayer.tsx` (key `DEVICE_KEY`, `REPORT_KEY`, payload `issuePayload`) | Device ID, time zone, locale and region leave the device (via GitHub) | None. The user triggers the procedure themselves. | **not secured** (finding **F-07**) |
| Supply chain: GitHub Actions | Compromised maintainer access or manipulated dependency | `.github/workflows/deploy.yml` | Execution of arbitrary code in the build | `permissions` are reduced to `contents: read`, `concurrency` prevents parallel deploys | **partially secured** (actions are not pinned by SHA, finding **F-08**) |
| Dependencies | Attacker via a transitive dependency | `npm install` | Execution in the build or in the browser | `npm audit --omit=dev --audit-level=moderate` → **0 vulnerabilities** (measured 2026-10-25). With dev dependencies: 14 reports (9 high), all in `vite`/`launch-editor`/`zod`. | **partially secured** (finding **F-09**) |
| Delivery: missing security headers (**F-05**) | Attacker who finds a vulnerability in the app | HTTP headers of the delivered files | Missing hardening against clickjacking, MIME sniffing, referrer leaks | Headers are defined in `next.config.ts:24-59` — **but they are not delivered with the static export** | **not effective** (finding **F-05**) |

### 3.1 Overview of the findings

The complete description with attack path, damage potential, fix and test name is
part of the handover to the owner. Only the assignment is listed here:

| ID | Short title | Severity | State |
|---|---|---|---|
| **F-01** | Admin API is not reachable (no effective token protection) | High | **blocked** — owner decision, see `docs/cr/CR-0002-admin-api-entscheidung.md`; the decision falls with the hosting decision (QA-09 item 2.6) or with the owner's confirmation that Phomu stays a static export |
| **F-02** | SSRF via redirect during the cover download | Medium | **fixed** |
| **F-03** | DoS through an unthrottled download body | Medium | **fixed** |
| **F-04** | No rate limiting on the admin API | Medium | **fixed** (only effective per instance) |
| **F-05** | Security headers are not delivered with the static export | Medium | configuration in place, delivery still open |
| **F-06** | QR input without a length or format limit | Low | open, file outside the workspace |
| **F-07** | Device ID, time zone and locale in the error report | Low | open, file outside the workspace |
| **F-08** | GitHub Actions not pinned by SHA | Low | open |
| **F-09** | 14 vulnerabilities in the dev dependencies | Low | open (production is clean) |
| **F-10** | Internal error details in the API response | Low | **fixed** |
| **F-11** | Orphaned lock file blocks all cover saves | Low | **fixed** |
| **F-12** | No hard limits in the song validators | Low | **fixed** |
| **F-13** | CI runs no security checks | Medium | open |
| **F-14** | Admin token is written to stdout when generated | Info | deliberate, with a note |
| **F-15** | Game state is manipulable by the user | Info | design decision |
| **F-16** | Outdated catalog audit report (`specifications/catalog_issues_report.json`) | Info | open, file outside the workspace |
| **F-17** | The request body of the cover save route was read without a size limit (`request.json()`) | Medium | **fixed** — the body is streamed and cut off at 16 KB (`src/admin-api/_lib/hard-limits.ts`, `readCappedJsonBody`); negative test `refuses an oversized request body with 413 before it is parsed` |
| **F-18** | The fields of the third-party answer were handed back without a length limit | Low | **fixed** — every field is cut off at 300 characters (`boundedOutputText`); negative test `cuts a field of the third-party answer off at the hard limit` |
| **F-19** | The two misconfigurations of the server answered with different texts and therefore disclosed whether a usable secret exists | Low | **fixed** — both answer with 503 and the same body (`ADMIN_UNAVAILABLE_MESSAGE`); the reason goes into the log. Negative test `answers a missing configuration and a too short token identically` |

---

## 4. What is already secured

All statements with file and line. The negative tests can be found under
`src/admin-api/*.test.ts` and `src/utils/validate-song-limits.test.ts`.

**Read this first:** sections 4.1 to 4.3 describe the **code** of the admin
API. The endpoints it describes are **not registered in the delivered build**
(F-01, section 5 item 1). A control that guards a route nobody can call
protects nothing today — it is nevertheless the control that becomes effective
the moment the admin API is wired up, and it is tested against the real
attack so that it is effective on the day it is switched on.

### 4.1 Token gate of the admin API

| Measure | Location | Negative test |
|---|---|---|
| Missing token → **401** | `src/admin-api/_lib/security.ts:104-109` | `src/admin-api/admin-token-guard.test.ts` → `rejects a request without a token (401)` |
| Wrong token → **401** | `src/admin-api/_lib/security.ts:104-109` | `src/admin-api/admin-token-guard.test.ts` → `rejects a request with a wrong token (401)` |
| Not configured → **503** (fail closed) | `src/admin-api/_lib/security.ts:83-91` | `src/admin-api/admin-token-guard.test.ts` → `fail-closed: without a configured env variable the API responds with 503` |
| Token shorter than 32 characters → **503** | `src/admin-api/_lib/security.ts:92-101` | `src/admin-api/admin-token-guard.test.ts` → `fail-closed: a too short token responds with 503` |
| Comparison in constant time (`crypto.timingSafeEqual` over SHA-256 digests, so that the buffers are always the same length) | `src/admin-api/_lib/security.ts:63-67` | `src/admin-api/admin-token-guard.test.ts` → `compares the token with timingSafeEqual instead of ===` and `rejects a token with only one correct character (401)` |
| **No token in the log and no token values in error messages** | `src/admin-api/_lib/security.ts:86`, `:96` (the message contains neither token nor IP) | `src/admin-api/admin-token-guard.test.ts` → `keeps the token value out of responses and logs`; `src/admin-api/admin-api-hardening.test.ts` → `never writes the token into a log line` and `never writes the token into a log line when the token is too short` |
| **The answer does not tell whether a token exists**: a missing token and a wrong token produce byte-identical answers | `src/admin-api/_lib/security.ts:104-109` | `src/admin-api/admin-api-hardening.test.ts` → `answers a missing token and a wrong token identically` |
| **The answer does not disclose the state of the server**: "not configured" and "token too short" produce byte-identical answers; the reason goes into the log | `src/admin-api/_lib/security.ts:83-101`, `src/admin-api/_lib/errors.ts:34` | `src/admin-api/admin-api-hardening.test.ts` → `answers a missing configuration and a too short token identically` |
| Token only as a server environment variable, **no** `NEXT_PUBLIC_*` | `src/admin-api/_lib/security.ts:82` | `grep -rn "NEXT_PUBLIC" src` → only `MusicPlayer.tsx` (`NEXT_PUBLIC_GITHUB_ISSUE_URL`, issue URL, no token) |
| Token generation with 32 random bytes, minimum length 16 bytes | `scripts/generate-admin-token.js:4-10` | — |

> **Note on the `.env.example`:** The placeholder
> `ADMIN_API_TOKEN=replace-with-long-random-token` is **30 characters** long and
> therefore shorter than the minimum length 32. If the file is taken over
> unchanged, the API answers with **503** and not with open access. That is
> intentional (fail closed).

### 4.2 Rate limiting of the admin API

| Measure | Location | Negative test |
|---|---|---|
| Failed attempts per client: 10 every 5 minutes | `src/admin-api/_lib/security.ts:36`, `:119` | `src/admin-api/admin-token-guard.test.ts` → `limits brute-force attempts per client (429 after 10 failed attempts)` |
| Failed attempts globally per instance: 100 every 5 minutes — not circumventable via forged `x-forwarded-for` headers | `src/admin-api/_lib/security.ts:49`, `:124` | `src/admin-api/admin-token-guard.test.ts` → `limits brute-force attempts even when x-forwarded-for is forged` |
| Cover search: 30 requests per minute and client | `src/admin-api/admin/covers/search/route.ts:46`, `:72` | `src/admin-api/admin-routes-hardening.test.ts` → `responds with 429 when there are too many search requests` |
| Cover saving: 10 requests per minute and client | `src/admin-api/admin/covers/save/route.ts:40`, `:136` | `src/admin-api/admin-routes-hardening.test.ts` → `responds with 429 when there are too many save requests` |
| The number of stored buckets is limited (10 000), an attacker cannot inflate the memory without bounds | `src/admin-api/_lib/rate-limit.ts:43`, `:65-77` | `src/admin-api/admin-rate-limit.test.ts` → `limits the number of stored keys (no unbounded growth)` |
| Response with `Retry-After` | `src/admin-api/_lib/security.ts:126-129`, `:147-160` | `src/admin-api/admin-rate-limit.test.ts` → `responds with 429 and Retry-After when the limit is exceeded` |

### 4.3 Input validation of the admin API

| Measure | Location | Negative test |
|---|---|---|
| `songId`: only letters, digits, `-`, `_`; 3–120 characters — **no `.`, no `/`**, so that no path traversal is possible | `src/admin-api/_lib/security.ts:175-180` | `src/admin-api/admin-routes-hardening.test.ts` → `rejects a songId with path segments` |
| Cover URL: only `https:` | `src/admin-api/_lib/security.ts:214-215` | `src/admin-api/cover-fetch-guard.test.ts` → `rejects a different scheme (file:, data:, javascript:)`, `src/admin-api/admin-routes-hardening.test.ts` → `rejects a plaintext URL` |
| Cover URL: no embedded credentials (`user:pass@…`) | `src/admin-api/_lib/security.ts:216-217` | `src/admin-api/cover-fetch-guard.test.ts` → `rejects embedded credentials` |
| Cover URL: host allowlist (`mzstatic.com`, `is1-ssl.mzstatic.com`, `cdn-images.dzcdn.net`, `dzcdn.net`) including subdomains | `src/admin-api/_lib/security.ts:187-190`, `src/admin-api/admin/covers/save/route.ts:19-24` | `src/admin-api/cover-fetch-guard.test.ts` → `rejects a URL with a host that is not allowlisted`, `rejects a URL whose host only matches as a suffix` |
| Internal addresses (`localhost`, `127.0.0.1`, `169.254.169.254`, `[::1]`) are not on the allowlist | `src/admin-api/_lib/security.ts:187-190` | `src/admin-api/cover-fetch-guard.test.ts` → `rejects localhost and internal addresses` |
| **Redirects are followed manually, every hop is checked again**, maximum 3 hops | `src/admin-api/_lib/security.ts:306-330` | `src/admin-api/cover-fetch-guard.test.ts` → `aborts a redirect into the internal network (SSRF)`, `aborts a redirect to a host that is not allowlisted`, `aborts a redirect to plaintext HTTP`, `follows a redirect within the allowlist`, `aborts a redirect loop at the hop limit` |
| Response must be `image/*` | `src/admin-api/_lib/security.ts:338-340` | `src/admin-api/cover-fetch-guard.test.ts` → `rejects a response that is not an image` |
| Hard size limit 5 MB, checked **while streaming** (also without `content-length`) | `src/admin-api/_lib/hard-limits.ts:23`, `:52-95` | `src/admin-api/cover-fetch-guard.test.ts` → `rejects an oversized file that declares its own size`, `rejects an oversized file that sends no content-length` |
| JSON responses of the search API limited to 512 KB | `src/admin-api/_lib/hard-limits.ts:26`, `search/route.ts:94-96`, `:117-119` | — (the mechanism is the same as for the image, tested in `cover-fetch-guard.test.ts`) |
| Search terms limited to 120 characters, required fields checked | `src/admin-api/_lib/security.ts:164-172`, `search/route.ts:82-89` | `src/admin-api/admin-routes-hardening.test.ts` → `rejects a missing search field with 400`, `rejects an overlong search field with 400` |
| **Unexpected errors** are answered without a detailed response (500, generic text), details only in the server log | `src/admin-api/admin/covers/save/route.ts:186-202`, `src/admin-api/admin/covers/search/route.ts:148-162` | `src/admin-api/admin-api-hardening.test.ts` → `refuses a malformed request body with 400` and `refuses an oversized request body with 413 before it is parsed` (the routes answer with 400/401/413/429 in the tests above and do not disclose internal paths) |
| **The request body** of the cover save route is read under a hard limit of 16 KB, before a field is looked at | `src/admin-api/_lib/hard-limits.ts:20`, `:108-120` | `src/admin-api/admin-api-hardening.test.ts` → `refuses an oversized request body with 413 before it is parsed` |
| **The URL** of a cover is limited to 2048 characters | `src/admin-api/_lib/hard-limits.ts:32`, `src/admin-api/_lib/security.ts:205-206` | `src/admin-api/admin-api-hardening.test.ts` → `refuses an overlong image URL with 400` and `refuses an overlong image URL in the validator itself` |
| **Every field of the answer** of the search route is cut off at 300 characters; the answer holds at most 10 results, at most 25 entries of a provider are inspected | `src/admin-api/_lib/hard-limits.ts:29`, `:135-141`, `src/admin-api/admin/covers/search/route.ts:53`, `:56`, `:146` | `src/admin-api/admin-api-hardening.test.ts` → `cuts a field of the third-party answer off at the hard limit` and `answers with at most ten results` |
| Mutations of the catalog are serialised via a file lock; an orphaned lock (older than 120 s) is released | `src/admin-api/admin/covers/save/route.ts:37`, `:78-86` | — |

### 4.4 Hard limits in the song catalog

The catalog is not trustworthy input: it is maintained, imported and edited via the
admin interface. `src/utils/validate-song-limits.ts` defines hard upper limits per
field; `src/utils/validate-song-data.ts:107-112` feeds them into the result as
**errors** (not as warnings).

| Measure | Location | Negative test |
|---|---|---|
| `id` ≤ 120, `title` ≤ 200, `artist` ≤ 200, `genre` ≤ 80 characters | `src/utils/validate-song-limits.ts:29-48` | `src/utils/validate-song-limits.test.ts` → `reports a field that is too long`, `reports an id that is too long` |
| `mood` ≤ 20 entries, each ≤ 60 characters; `packs` ≤ 50 entries, each ≤ 100 characters | `src/utils/validate-song-limits.ts:35-38` | `src/utils/validate-song-limits.test.ts` → `reports too many entries in an array`, `reports an array entry that is too long` |
| `hints` each ≤ 600, `hintEvidence` each ≤ 500 characters | `src/utils/validate-song-limits.ts:136, :143` | `src/utils/validate-song-limits.test.ts` → `reports a hint that is too long` |
| Lyrics lines each ≤ 200, fake lyrics ≤ 200 characters | `src/utils/validate-song-limits.ts:153, :156` | `src/utils/validate-song-limits.test.ts` → `reports a lyric line that is too long` |
| Links ≤ 500 characters, `youtubeAlternatives` ≤ 10 entries | `src/utils/validate-song-limits.ts:163, :167` | `src/utils/validate-song-limits.test.ts` → `reports a link that is too long` |
| `supportedModes`: only known modes, ≤ 20 entries | `src/utils/validate-song-limits.ts:175-186` | `src/utils/validate-song-limits.test.ts` → `reports an unknown game mode` |
| A violation is an **error**, not a warning — the validator does not fail open | `src/utils/validate-song-data.ts:107-112` | `src/utils/validate-song-limits.test.ts` → `reports a violation as an error, not as a warning` |
| The existing catalog (1 615 songs) remains valid under these limits | — | `src/utils/validate-song-limits.test.ts` → `keeps the current catalog valid` (checked across all 135 packs) |

Counter-check: `npm run validate-catalog` reports **0 schema errors**, 0 duplicate
groups, 0 missing years.

### 4.5 Security headers (configuration present — see the limitation in 4.6)

In `next.config.ts:24-59` the following are defined:

`Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
`Permissions-Policy` (camera only for the own origin),
`Strict-Transport-Security`, `Cross-Origin-Opener-Policy`,
`X-DNS-Prefetch-Control`.

The CSP allows exactly the origins that the code uses (derivation in section 6).
Checked in `src/admin-api/security-headers.test.ts`: `sets the minimum header baseline`,
`sets a CSP with all expected directives`, `allows exactly the media origins
documented in the code`, `contains no wildcard and no unsafe object-src`.

### 4.6 What the security headers do **not** achieve (important)

The project state is a **static export** (`next.config.ts:64` `output: 'export'`)
that is hosted on GitHub Pages. Next.js does not apply `headers()` in this mode.
That is not an assumption but a warning from Next.js itself. The build
(`npx next build`, Next.js 16.4.3) provides the evidence twice:

```
▲ Next.js 16.4.3 (Turbopack)
⚠ Specified "headers" will not automatically work with "output: export".
  See more info here: https://nextjs.org/docs/messages/export-no-custom-routes
...
  Finalizing page optimization ...
⚠ rewrites, redirects, and headers are not applied when exporting your
  application, detected (headers).
  See more info here: https://nextjs.org/docs/messages/export-no-custom-routes
```

The source of the installed version contains the same warning:

```
node_modules/next/dist/server/config.js:477
_log.warn('Specified "headers" will not automatically work with "output: export".
  See more info here: https://nextjs.org/docs/messages/export-no-custom-routes');
```

**Consequence:** The headers in `next.config.ts` are **not effective** today.
They only become effective when

1. the app is delivered with `next start` (Next server), or
2. the host sets the headers itself (e.g. Netlify, Cloudflare Pages, a reverse
   proxy, a CDN in front of GitHub Pages).

In addition, GitHub Pages **cannot** deliver own headers. For the current
operation the effective protection is therefore the code itself (token gate,
allowlist, validation) — not the HTTP header.

---

## 5. What is **not** secured

This list is the honest other side of section 4.

1. **The admin API is currently not reachable (F-01).** `src/admin-api/**` lies
   outside of `src/app/`. Next.js only registers route handlers below the app
   router directory (`node_modules/next/dist/lib/find-pages-dir.js`:
   `findDir(dir, 'app')` → `<root>/app` or `<root>/src/app`); in addition
   `output: 'export'` excludes route handlers in general. The production build
   prints a route list of 20 static routes — **none** of them is an admin API
   route:

   ```
   Route (app)
   ┌ ○ /
   ├ ○ /_not-found
   ├ ○ /admin/review
   ├ ○ /admin/songs
   ├ ○ /browse
   ├ ○ /game
   ├ ○ /game-over
   ├ ○ /guide
   ├ ○ /lobby
   ├ ○ /privacy
   ├ ○ /projector
   ├ ○ /settings
   …
   └ ○ /terms
   ```

   So there is **no** reachable endpoint at which the token gate could take
   effect. The same is already stated in `ARCHITECTURE.md` (§6.1,
   "A4 — `admin-api/` has no consumer").
   *Consequence:* The token gate is implemented and tested, but it currently
   protects nothing, because there is no route that reaches it. Anyone who
   changes the catalog today does so via files in the repository — there **no**
   token applies, but the write permission in the repository.

   **The measured evidence (2026-10-25):**

   | # | Measurement | Command | Result |
   |---|---|---|---|
   | 1 | The route handlers | `find src -name "route.ts"` | the two admin handlers in `src/admin-api/`, **none** below `src/app/` |
   | 2 | The route tree of the build | `npm run build` | a printed route list of 20 entries, **none** of them an admin API route |
   | 3 | The route manifest | `cat .next/app-path-routes-manifest.json` | 21 entries, **no** admin API entry |
   | 4 | The compiled route handlers | `find .next/server/app -name "route.js"` | only `apple-icon.png/route.js` and `icon.png/route.js` |
   | 5 | The published artefact | `grep -rn "admin/covers" out/` | **0 hits** |
   | 6 | Consumers of the module | `grep -rn "admin-api" src/ \| grep -v "^src/admin-api/"` | **0 hits** |
   | 7 | Calls from the admin user interface | `grep -rn "fetch(" src/app/admin/` | **0 hits** — the pages work on `localStorage` only |

   **The condition under which this item is resolved:** the decision — wire the
   API up (needs the server of the hosting decision, QA-09 item 2.6) or remove
   `src/admin-api/` and its test files — belongs to the owner and is recorded
   in
   [`docs/cr/CR-0002-admin-api-entscheidung.md`](docs/cr/CR-0002-admin-api-entscheidung.md).
   It falls automatically when the hosting model is decided for a host that
   executes route handlers, or when the owner confirms in writing that Phomu
   stays a static export without a server. Until then the state is **blocked**,
   not open and not done. The single test that states the measured reachability
   is `src/admin-api/admin-api-reachability.test.ts`; it turns red when the
   architecture changes.

2. **The headers are not delivered (F-05).** See 4.6.

3. **The game state is manipulable by the user (F-15).** `localStorage` belongs to
   the user. Score, player names, XP, game mode and round number can be set
   freely. A server that validates the state does not exist — that would be a
   server and therefore a different product.
   *Not persisted* on the other hand are `currentSong`, `currentAnswers` and
   `roundHistory` (see `partialize` in `src/stores/game-store.ts:620-637`), so the
   anti-spoiler protection **cannot** be circumvented via a restart.

4. **The QR input is not limited (F-06).** `parseQrIntent` passes session code,
   pack ID and player names on unfiltered; there is no length limit and no format
   check for `?session=` and `?pack=`.
   *Deliberately not fixed:* The file `src/utils/qr-intent.ts` was outside the
   approved scope in this work order. The fix is small (length limits in
   `parseQrIntent`), but it belongs in the same commit as the change that calls
   the scanner.

5. **The report function transmits device data (F-07).** "Report missing link"
   writes a random device ID (`phomu-device-id`) into `localStorage` and builds a
   payload from song ID, title, artist, pack, provider, time zone, locale, region
   and device ID (`src/components/game/MusicPlayer.tsx`, key `DEVICE_KEY` and
   `REPORT_KEY`, payload `issuePayload`). This payload goes to GitHub (issue
   form), not to a Phomu server. It is a transfer triggered by the user, but it
   contains more than the "technical metadata" named in the privacy notice. The
   privacy notice was therefore adjusted accordingly.

6. **The dependencies of the development environment are not clean (F-09).**
   `npm audit --omit=dev` reports 0 vulnerabilities — the delivered app is
   therefore clean. With dev dependencies `npm audit` reports 14 findings
   (9 high) in `vite`, `launch-editor` and `zod`. These tools only run on the
   developer's machine, not in the delivered app.

7. **The CI does not check the security boundaries (F-13).** `.github/workflows/deploy.yml`
   builds and deploys, but runs neither `npm test`, `npm run lint`,
   `npm run typecheck` nor `npm audit`. An earlier version of this document
   named "CI mandatory checks: `npm audit`, secret scanning, SAST" — that was
   **not** covered by the repository at the time of measurement and has therefore
   been removed here.

8. **The token is printed locally on the console (F-14).**
   `scripts/generate-admin-token.js:11-12` writes the new token to `stdout`.
   That is the intended way (the token is supposed to go into the secret store of
   the operator), but anyone who runs the command in a shared shell or in a CI log
   has the token in the log.

9. **There is no authentication, no authorization and no multi-tenancy** — for a
   local party game without a server that is not needed either. The only secret
   value in the project is the admin token.

10. **The headers are not bound to a gate.** The test
    `src/admin-api/security-headers.test.ts` proves the *configuration*, not the
    *delivery*. Only when the operation switches to a Next server or to a host
    that supports headers does this become an effective measure.

---

## 6. Derived CSP origins

The list is **derived from the code**, not from memory. Every line names the
location.

| Origin | Purpose | Location |
|---|---|---|
| `https://www.youtube.com` | Iframe API script (`https://www.youtube.com/iframe_api`) | `src/components/game/MusicPlayer.tsx`, `loadApi()` (`tag.src`) |
| `https://www.youtube.com` | Embed frame in the browse list | `src/components/browse/SongCard.tsx`, `src={`https://www.youtube.com/embed/${song.links.youtube}…`}` |
| `https://www.youtube.com` | Player frame created by the iframe API | `src/components/game/MusicPlayer.tsx`, `new window.YT.Player(…, { playerVars: { host: … } })` |
| `https://music.youtube.com` | alternative player domain (switch "Music") | `src/components/game/MusicPlayer.tsx`, state `activeDomain` + `toggleDomain()` |
| `https://open.spotify.com` | Spotify embed frame | `src/components/game/MusicPlayer.tsx`, `src={`https://open.spotify.com/embed/track/${spotifyTrackId}…`}` |
| `https://music.amazon.com` | Amazon Music embed frame | `src/components/game/MusicPlayer.tsx`, `src={`https://music.amazon.com/embed/track/${amazonTrackId}…`}` |
| `https://p.scdn.co` | Spotify preview audio (`<audio src=…>`) | `src/components/game/MusicPlayer.tsx`, `<audio src={spotifyFreePreview}>`; host from the catalog, e.g. `src/data/songs/E4.json` |
| `https://music.amazon.com` | Amazon Prime preview audio (`<audio src=…>`) | `src/components/game/MusicPlayer.tsx`, `<audio src={amazonPrimePreview}>` |
| `https://itunes.apple.com` | Cover search (only **server-side**, in the admin API — an endpoint that is not registered in the delivered build, see F-01) | `src/admin-api/admin/covers/search/route.ts:93` |
| `https://api.deezer.com` | Cover search (only **server-side**, in the admin API — an endpoint that is not registered in the delivered build, see F-01) | `src/admin-api/admin/covers/search/route.ts:116` |

**Deliberately not included:**

- `https://music.apple.com` — Apple Music is only a **link** in the catalog
  (`links.appleMusic`, e.g. `src/data/songs/*.json`), there is no Apple embed in
  the code (`src/config/game-config.ts:26` lists `'apple-music'` as "future"). The
  origin is therefore not needed for `frame-src`. If the Apple embed is added
  later, the CSP **must** be extended.
- `https://github.com` — only as the target of the user-triggered report and issue
  links (`src/components/game/MusicPlayer.tsx`, `window.open(issueUrl…)`), not a
  request of the page itself.
- `'unsafe-eval'` — is not needed anywhere.
- `*` — nowhere.

**Why `script-src 'unsafe-inline'`:** Next.js injects inline scripts for the RSC
payload during the static export (`out/*.html`, `<script id="_R_">`). A static
export cannot deliver per-request nonces. The inline part of the CSP can
therefore not be avoided. The protection against XSS in this app is **React** (all
text output is escaped), not the CSP. That is an honest classification, not a
whitewash.

---

## 7. Reporting a vulnerability

Please do **not** publish exploit details in a public issue. Two ways are possible:

1. **Private message to the owner** via the repository
   (<https://github.com/mazer666/Phomu>) — for vulnerabilities that are supposed to
   be fixed before publication.
2. **Issue in the repository**
   (<https://github.com/mazer666/Phomu/issues>) — for everything that is not
   confidential: errors in the validation, gaps in the documentation, suggestions
   for improvement. Issues are public.

A meaningful report contains:

- the affected route or component (with file and line),
- reproducible steps,
- which trust boundary is violated (see section 2),
- the impact,
- a mitigation proposal, if available.

For privacy requests see `PRIVACY.md`, section 8.

---

## 8. Supported versions and patch policy

Phomu is at version state `0.1.0` (`package.json`) and has not been released yet.

| State | Status |
|---|---|
| `main` / current release state | Maintained |
| Older states, branches, forks | **Not** maintained |

**Patch policy**

- **Security vulnerabilities in the admin API** are treated with priority: The
  token is regenerated immediately via `npm run security:rotate-admin-token`
  (`scripts/generate-admin-token.js`) and set in the deployment environment.
- **Security vulnerabilities with an impact on delivered data** (catalog, game
  state) are fixed before feature work.
- **Documentation gaps** (this document, `PRIVACY.md`) are corrected with the
  next release.
- There is **no** LTS commitment and **no** public support contract — the project
  is an open source prototype without an operator SLA.

**Dependencies**

`npm audit --omit=dev --audit-level=moderate` is part of
`scripts/local-ci.sh` (step 8) and was green on 2026-10-25 (0 findings).
The CI in `.github/workflows/deploy.yml` does **not** run the audit — that is an
open gap (section 5, item 7).

---

## 9. Hard limits of the hardening — what a gate does **not** prove

| Gate | What it does **not** prove |
|---|---|
| Token gate of the admin API | That there is a reachable admin API at all. See section 5, item 1. |
| `crypto.timingSafeEqual` | That the token is not disclosed somewhere else (log, issue, environment variable of the host). The comparison only protects against guessing the comparison in time. |
| Rate limiter | No protection against distributed attacks, no effect across instance boundaries, no effect behind a proxy that does not overwrite `x-forwarded-for`. It is a **per-instance misuse brake**, not DDoS protection. |
| Host allowlist | No protection against a compromised allowlist host that itself forwards to internal targets. Only the hop-by-hop check helps against SSRF *via* the allowlist. |
| Size limit 5 MB | No protection against many small requests — the rate limit is responsible for that, with the same limitation. |
| Security headers in `next.config.ts` | That the headers are **delivered**. With `output: 'export'` they are not. See section 4.6. |
| Hard limits in the validator | No check of the **contentual** correctness of a song (title, lyrics, links). The validator checks form and size, not truth. |
| `npm audit --omit=dev` | No statement about the dev dependencies (there are 14 findings there). |
| Tests of the admin API | No statement about the routes being reachable or correctly configured in operation — the tests call the handlers directly. The single exception is `src/admin-api/admin-api-reachability.test.ts`, which measures the reachability itself and asserts the measured verdict. |

---

## 10. Further documents

- `PRIVACY.md` — which data flows, where it is stored, how to delete it.
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` — the version that the user
  reads in the browser.
- `ARCHITECTURE.md` §6.1 — the admin API boundary and its (missing) reachability.
- [`docs/cr/CR-0002-admin-api-entscheidung.md`](docs/cr/CR-0002-admin-api-entscheidung.md) — the decision template for the fate of the admin API (wire it up or remove it) and the condition under which the decision falls.
- `REQUIREMENTS.md`, gap **GAP-030** — the same state in the requirement catalogue.
- `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md` §5 —
  the security audit the open points come from.
