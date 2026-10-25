# CR-0002 — The fate of the admin API

**Status:** proposed
**Date:** 2026-10-25
**Trigger:** The independent QA assessment of 2026-10-25 — finding **QA-SEC-002** (P1) and the remediation backlog item **1.6** ([`docs/qa/QA-09-REMEDIATION-BACKLOG.md`](../qa/QA-09-REMEDIATION-BACKLOG.md), line 136 ff.). The assessment was triggered by the release readiness review of the web shell.
**Proposed by:** Security & Privacy Manager (ROLE-07), with the Quality & QA stream
**Reviewed by:** open — Architecture (ROLE-02) and Product Owner (ROLE-01) have not decided yet
**Decision:** open — **owner decision required**; the decision falls automatically when the condition of section 11.3 is met

---

## 1. Problem

The admin API exists, is hardened, is tested — and cannot be called. The
half-wired state is the worst of the three possible states, because the
documentation, the requirement catalogue and the status file all describe a
capability that the delivered build does not have.

### 1.1 What was measured

All measurements were taken on the state of `main` on 2026-10-25.

| # | Measurement | Command | Result |
|---|---|---|---|
| M1 | The route handlers of the admin API | `find src -name "route.ts"` | `src/admin-api/admin/covers/save/route.ts`, `src/admin-api/admin/covers/search/route.ts` — **no** handler below `src/app/` |
| M2 | The route tree of the production build | `npm run build` | a route list of 20 entries; `/admin/review` and `/admin/songs` — **no** `/admin/covers/search`, **no** `/admin/covers/save` |
| M3 | The route manifest of the build | `cat .next/app-path-routes-manifest.json` | 21 entries (the printed list has 20; the manifest additionally holds the internal `/_global-error`) — **no** admin API entry |
| M4 | The compiled route handlers | `find .next/server/app -name "route.js"` | `apple-icon.png/route.js`, `icon.png/route.js` — **no** admin API handler |
| M5 | The published artefact | `ls out/admin/`, `grep -rn "admin/covers" out/` | `review.html`, `songs.html`; **0 hits** for the API path |
| M6 | Consumers of the module | `grep -rn "admin-api" src/ \| grep -v "^src/admin-api/"` | **0 hits** — nothing imports the module |
| M7 | Calls from the admin user interface | `grep -rn "fetch(" src/app/admin/` | **0 hits** — the pages work on `localStorage` only |
| M8 | The mode of the build | `next.config.ts` | `output: 'export'` — a static export cannot execute a route handler |
| M9 | Where the App Router looks for handlers | `node_modules/next/dist/lib/find-pages-dir.js` | `findDir(dir, 'app')` → `<root>/app` or `<root>/src/app`; a handler outside of it is never registered |
| M10 | The tests of the module | `npm run test` | 78 test cases in 7 files guard the admin API — 0 of them reach a running endpoint |

### 1.2 The two independent causes

Both causes have to disappear before the API can be called:

1. **The build is a static export** (`next.config.ts`, `output: 'export'`).
   Next.js does not emit a route handler into an export — the build itself
   prints `⚠ rewrites, redirects, and headers are not applied when
   exporting your application`.
2. **The handlers lie outside the app directory.** They are in
   `src/admin-api/`, not in `src/app/`. The App Router collects pages and
   route handlers only from the app directory (M9). This cause is
   independent of cause 1: **even a server build without the static export
   would not register these two handlers.** The statement in
   `WHERE_TO_CHANGE.md` that the routes "only work while the app runs via
   `next dev` or `next start`" is therefore not backed by the code and was
   corrected in this change.

### 1.3 What is wrong with the current state

- **The security posture is misrepresented.** 78 test cases — the largest
  block of the unit test suite — guard a component that no user and no
  attacker can reach. A reader of the test report concludes that the admin
  surface is protected. In the delivered artefact it does not exist at all.
- **The published admin pages mislead.** `/admin/songs` and `/admin/review`
  are shipped and render. They work on `localStorage`; the cover search and
  the cover save are not part of them, and the interface does not offer
  them. A user who reads `README.md` or `docs/GETTING-STARTED.md` is told
  that the admin interface needs a token — the admin interface does not
  talk to the API at all (M7).
- **The requirement catalogue claims a capability that does not exist.**
  `REQUIREMENTS.md` §8 (SEC-001 … SEC-018) describes an admin API as a
  live interface; `project/project.yaml` lists it as a module of the
  product; `SECURITY.md` lists the token gate, the SSRF guard and the rate
  limit under "What is already secured" without a reachability note on the
  same page.
- **Half-wired is the worst state.** Removing the module alone loses the
  hardening; wiring it alone without the documentation fix repeats the
  misrepresentation.

---

## 2. Proposed change

This change request decides **nothing**. It records the fork, the two
options with their costs, a recommendation, and the condition under which
the decision falls automatically.

The part that is implemented with this CR — and that is correct under
**both** options — is:

1. **The reachability is stated, measured and tested.** A single test
   (`src/admin-api/admin-api-reachability.test.ts`) measures the two causes
   and asserts the measured verdict. It turns **red** the moment the state
   changes, and it names the decision record in its failure message.
2. **The hardening that holds in both cases** is applied: no token in a
   log, in an error message or in the client; answers that do not tell
   whether a token exists; a hard upper bound for every input and every
   answer of both routes.
3. **Every document that claims reachability is corrected** and the state
   is marked as **blocked** with the condition of section 11.3.

---

## 3. Rationale

- **QA-SEC-002** names the defect; the backlog item **1.6** names the
  acceptable outcomes: "the admin API is reachable from the admin UI and
  tested against a live path, **or** it no longer exists and no document
  claims it."
- **SEC-001 … SEC-018** are requirements for the *code* of the admin API.
  They stay valid under both options and must therefore not be deleted —
  only their operational status changes.
- **The principle "no claim without evidence"** (`QUALITY.md`, `AGENTS.md`)
  forbids a status file that describes a capability the build does not
  have. The honest intermediate state is *blocked with a condition*, not
  *done* and not *silently open*.
- **The hosting decision (backlog item 2.6) is the lever.** A host that
  runs route handlers fixes QA-SEC-001, QA-SEC-002 and QA-SPO-001 at once.
  The fate of the admin API therefore cannot be decided before the hosting
  model is decided — and it must not be decided *by omission* in the
  meantime.

---

## 4. Affected requirements

| ID | Impact |
|---|---|
| SEC-001 … SEC-018 | **unchanged** as requirements on the code; their *operational status* changes to "blocked" — the endpoints they describe are not registered in the delivered build |
| CAT-015 | **unchanged** — the admin user interface edits songs locally and exports them; it never used the admin API |
| NFR-009 | **unchanged** — the file size gate; the new modules stay below the soft limit of 400 lines |
| SEC-005 (security headers) | **unchanged** — this CR does not deliver headers; that is item 1.5 and depends on 2.6 |
| — | **no requirement is added or removed**; the count of 175 requirement blocks in `REQUIREMENTS.md` stays as it is |

---

## 5. Affected architecture

No dependency direction changes. The change touches:

- `src/admin-api/_lib/errors.ts` — **new**: `AdminRequestError` and the single answer of a misconfigured server.
- `src/admin-api/_lib/hard-limits.ts` — **new**: the hard upper bounds (request body 16 KB, image 5 MB, third-party JSON 512 KB, answer field 300 characters, URL 2048 characters) and the body reader that enforces them.
- `src/admin-api/_lib/security.ts` — the token gate (uniform answers), the URL length limit; it re-exports the new module.
- `src/admin-api/admin/covers/save/route.ts` — the request body is read under the hard limit instead of `request.json()`.
- `src/admin-api/admin/covers/search/route.ts` — the fields of the third-party answer are cut off at the hard limit; the number of inspected entries is bounded.
- `src/admin-api/admin-api-hardening.test.ts` — **new**: ten negative tests for the hardening above.
- `src/admin-api/admin-api-reachability.test.ts` — **new**: the single test that states the reachability.

The module boundary is unchanged: `src/admin-api/` still depends on nothing but itself and on `next/server`. `ARCHITECTURE.md` §3.3 (A4) stays valid — the module still has no consumer.

---

## 6. Affected platforms

| Platform | Effect |
|---|---|
| Web (static export) | **none** — the build is unchanged; the admin API remains absent from the artefact |
| Web (a future server) | the handlers have to be **moved** below `src/app/` before they are registered; this CR does not do that, it makes the requirement explicit |
| Android, tvOS, macOS/Linux, iOS, Windows | **none** — the native shells consume the catalogue artefact and never served the admin API (`docs/spec/SRS.md` §4.7) |
| Deployment / CI | none — no workflow is touched |

---

## 7. Impact on the milestones

| Milestone | Impact |
|---|---|
| **M6 — Security hardening** | stays **IN PROGRESS**. The hardening of the module is done and now tested against a real attack; the *availability* of the module is the open point and is handed to the owner with this CR. |
| **M1 — Catalogue and data quality** | unchanged. The catalogue is curated offline through the repository; the admin API was never part of that path. |
| **M2 — Test coverage & QA maturity** | unchanged. The number of test cases grows (63 → 78); the coverage denominator is a separate item (1.7). |
| **M3 — Documentation reform** | unchanged. |
| — | **no milestone is silently postponed.** The item stays visible as an owner decision in [`docs/remediation/STATUS.md`](../remediation/STATUS.md). |

---

## 8. Impact on acceptance and tests

### 8.1 Tests that exist now

| Test | What it proves |
|---|---|
| `src/admin-api/admin-api-reachability.test.ts` → `measures the verdict and asserts the recorded one` | the measured reachability of the admin API is `unreachable` — and the test turns red when it changes |
| `…` → `states the two causes that make the admin API unreachable` | cause 1 (`output: 'export'`) and cause 2 (no handler below `src/app/`) |
| `…` → `keeps the handlers of the admin API outside of the app directory` | the handlers exist in `src/admin-api/` and are not registered |
| `…` → `has no route handler below src/app that serves the admin API` | the App Router registers no admin API route |
| `…` → `does not claim a reachability that the build artefact contradicts` | the route manifest of the build contains no admin API route |
| `src/admin-api/admin-api-hardening.test.ts` → `answers a missing token and a wrong token identically` | no token oracle: missing and wrong token produce byte-identical answers |
| `…` → `answers a missing configuration and a too short token identically` | the answer does not disclose whether a usable secret exists |
| `…` → `never writes the token into a log line` | no token value in `console.warn` / `console.error` |
| `…` → `never writes the token into a log line when the token is too short` | the log names the reason but not the value |
| `…` → `refuses an oversized request body with 413 before it is parsed` | a body above 16 KB is refused; nothing is fetched, no file is written |
| `…` → `refuses a malformed request body with 400` | a body that is not JSON is refused |
| `…` → `refuses an overlong image URL with 400` | a URL above 2048 characters is refused |
| `…` → `refuses an overlong image URL in the validator itself` | the validator itself carries the limit |
| `…` → `cuts a field of the third-party answer off at the hard limit` | a field of an answer of iTunes/Deezer is cut off at 300 characters |
| `…` → `answers with at most ten results` | the answer contains at most ten results |

### 8.2 Negative proof of the reachability test

The tripwire was proven by deliberately placing a handler at
`src/app/admin/covers/search/route.ts`: **3 of the 5 tests turned red**
with the message that the decision record has to be resolved with the
change. The probe was removed again; the suite is green.

### 8.3 Acceptance criterion of the backlog item 1.6

> "the admin API is reachable from the admin UI and tested against a live
> path, **or** it no longer exists and no document claims it."

**Not met yet** — it cannot be met before the decision falls. What *is* met
now is the second half in its weaker, honest form: *no document claims that
the admin API is reachable*, and the state is marked as blocked with the
condition of section 11.3.

---

## 9. Risks

| Risk | Probability of occurrence | Impact | Countermeasure | Owner |
|---|---|---|---|---|
| The decision is deferred again and the documentation drifts back | medium | high — the misrepresentation returns | the reachability test turns red on every architectural change; the gap row in `REQUIREMENTS.md` and the entry in `docs/remediation/STATUS.md` name the condition | Product Owner |
| Option (b) is chosen and the hardening is lost | low | medium — 78 test cases and the SSRF guard disappear with the module | the hardening is small and portable; if the module returns it can be restored from the decision record | Architecture |
| Option (a) is chosen and the module is registered under a static export | medium | high — a route that looks reachable but is not | the reachability test asserts the verdict; a handler below `src/app/` in an export is an error in the Next.js build | Architecture |
| The token is exposed in the log of the new server | low | high — the token is a full write credential | the negative tests above; the log carries the reason, never the value | Security & Privacy |
| The rate limiter is believed to be a distributed limit | medium | medium — a serverless deployment resets the buckets on every cold start | `SECURITY.md` §4.2 states the guarantee per deployment target (open, item 2.6) | Security & Privacy |

---

## 10. Rollback

The implementation of this CR is additive and can be undone file by file:

1. `git checkout -- src/admin-api/_lib/security.ts src/admin-api/admin/covers/search/route.ts src/admin-api/admin/covers/save/route.ts` — restores the previous guard.
2. `rm src/admin-api/_lib/errors.ts src/admin-api/_lib/hard-limits.ts src/admin-api/admin-api-hardening.test.ts src/admin-api/admin-api-reachability.test.ts` — removes the new modules and tests.
3. `git checkout -- REQUIREMENTS.md SECURITY.md project/project.yaml README.md …` — restores the previous documentation.
4. `rm docs/cr/CR-0002-admin-api-entscheidung.md`.

The rollback restores the half-wired state. It is listed here for completeness, not as a recommendation.

---

## 11. Decision

### 11.1 The two options

**Option A — wire it up.**

| Item | Content |
|---|---|
| Work | move the handlers below `src/app/` (for example `src/app/api/admin/covers/{search,save}/route.ts`), drop `output: 'export'` or keep the export and add a separate function host, deploy a server |
| Precondition | the hosting model of backlog item 2.6 is decided (a host that runs route handlers) |
| Effort | 2–4 days (hosting, deployment workflow, the admin user interface that actually calls the routes, the catalogue API of item 1.1) |
| Effect | QA-SEC-002, QA-SEC-001 and QA-SPO-001 fall together; the hardening of the module becomes effective; the rate limiter becomes effective per instance |
| Risk | the whole delivery changes from "a static file" to "a service" — every deployment assumption, the CSP without `'unsafe-inline'` and the privacy notice have to follow |
| Keeps | SEC-001 … SEC-018 as live requirements |

**Option B — remove it.**

| Item | Content |
|---|---|
| Work | delete `src/admin-api/` and its five test files, remove the admin routes from the build, correct every document, retire SEC-001 … SEC-018 or re-scope them to "the catalogue is curated offline" |
| Precondition | the owner confirms that the admin interface is a convenience for the maintainer and not a product feature |
| Effort | 0.5–1 day (the catalogue is curated offline today; `scripts/` already carries the tooling chain) |
| Effect | QA-SEC-002 is closed by removal; 63 of the 78 test cases disappear from the suite; the "half-wired" state is gone |
| Risk | the hardening (constant-time comparison, SSRF guard with per-hop revalidation, streaming caps) is lost with the module; it has to be rebuilt if the feature returns |
| Keeps | SEC-001 … SEC-018 as **historical** requirements with the status "not implemented" |

### 11.2 Recommendation

**Option A**, but **only together with the hosting decision of item 2.6** —
and the two belong in one decision, not in two.

The reason is the measurement, not a preference: the admin API is the
**only** place where Phomu changes data. The catalogue is the one asset
that has to stay correct for 1,615 songs and a party game. A tool that
fetches a cover from the internet and writes it into the repository is
worth having — but only with the guard that is already written, and that
guard only becomes effective on a server. Option B removes the need for a
server at the price of the guard.

**If the owner does not want a server** — which is a legitimate product
decision, because the game itself needs none — then **Option B** is the
correct choice and it has to be taken explicitly. The catalogue is curated
in the repository; that is a workable process without a server.

What must **not** happen is the third option: keeping the module in
`src/admin-api/` without registering it, without deleting it and without
naming it as blocked in the documentation.

### 11.3 The condition under which the decision falls

The decision falls **automatically** — without a new meeting — when the
first of the following becomes true:

1. **The hosting model of item 2.6 is decided for a host that executes
   route handlers** (Cloudflare Pages with Functions, Cloudflare Workers,
   Netlify, a Node host). Then **Option A** applies, and the handlers are
   moved below `src/app/` as part of that change.
2. **The owner confirms in writing that Phomu stays a static export with
   no server.** Then **Option B** applies: `src/admin-api/` and its test
   files are deleted, SEC-001 … SEC-018 are re-scoped, and every document
   is corrected.

Until one of the two happens, the state is **blocked**, and the following
holds:

- The documentation states the measured reachability and marks the state as
  blocked — in `REQUIREMENTS.md` (gap row and the preamble of §8),
  `project/project.yaml`, `SECURITY.md`, `docs/design/PLATFORM-ARCHITECTURE.md`
  and `README.md`.
- The reachability test asserts the measured verdict `unreachable` and
  turns red when the architecture changes.
- The hardening that holds in both cases is in place and is tested against
  the real attack.

### 11.4 What follows from the decision

| Decision | Consequence | Ticket |
|---|---|---|
| Option A | the handlers move below `src/app/`; the deployment workflow gains a server; `SECURITY.md` F-01 is closed with the host named; `PRIVACY.md` §3 describes the new data flow of the API | backlog items 2.6, 1.5, 1.1 |
| Option B | `src/admin-api/` is deleted; SEC-001 … SEC-018 are re-scoped or retired; `SECURITY.md` F-01 is closed by removal; the test suite shrinks by 78 cases | this CR, section 11.1 |
