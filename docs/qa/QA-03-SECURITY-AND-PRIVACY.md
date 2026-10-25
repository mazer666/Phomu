# QA-03 — Security & Privacy

**Severity of the findings in this report:** P1, P1, P2, P3
**Area:** Attack surface, hardening quality, privacy promises, and the gap between configured and delivered protection.

---

## 1. Summary judgement

**Phomu's security engineering is above the bar I normally expect for a project of this size — and then the deployment model removes most of its value.**

The admin API hardening in `src/admin-api/_lib/security.ts` is genuinely excellent: constant-time token comparison, SSRF defence with per-hop redirect revalidation, streaming byte caps, a bounded rate-limit map, and a stale-lock strategy for concurrent writes. This is not boilerplate; it is the work of someone who has read about these attack classes.

`SECURITY.md` is one of the better security documents I have audited. It defines five trust boundaries (`TB-1` … `TB-5`), maintains a findings table with severity, states what is **not** secured in its own section 5 ("What is **not** secured"), and has a section 9 titled *"Hard limits of the hardening — what a gate does **not** prove"*. Self-documented limitations of this kind are rare and valuable.

The problem is the last mile. The CSP, HSTS and `Permissions-Policy` are **defined in the configuration and never delivered**, because the deployment is a static export. And the hardened admin API is **not deployed and not called**, so 63 of the project's 97 tests protect code no user can reach.

---

## 2. What is already strong — preserve it during remediation

| Control | Implementation | Assessment |
|---|---|---|
| **Token comparison** | SHA-256 of both values, then `crypto.timingSafeEqual` (`security.ts`) | Correct, and hashing first also removes the length-leak that raw `timingSafeEqual` has. Excellent. |
| **Token strength** | Minimum length 32 enforced; short/missing token → `503`, not `401` | Correct: a misconfiguration must not degrade into "any token works". |
| **Token hygiene** | Never logged, never in an error body; the rejection reason is categorical (`missing`/`invalid`/`rate limited`) | Correct. |
| **Brute-force limit** | 10 failures / 5 min per client **plus** a global 100 / 5 min bucket that cannot be bypassed by forging `x-forwarded-for` | Very good — the global bucket is the part most implementations miss. |
| **SSRF — protocol** | `https:` only; credentials embedded in a URL rejected | Correct. |
| **SSRF — host allowlist** | `mzstatic.com`, `dzcdn.net` (+ subdomains) | Correct, and the match is `host === allowed \|\| host.endsWith('.' + allowed)` — the correct form. |
| **SSRF — redirects** | Redirects followed **manually**, and **every hop is re-validated** against the allowlist; max 3 hops | This is the important one. `fetch(..., {redirect: 'follow'})` would happily follow a redirect to `http://169.254.169.254/`. The manual loop prevents it. Outstanding. |
| **Response size** | `content-length` pre-check **and** a streaming reader that aborts mid-body at the cap | Correct, and the streaming reader defeats a `content-length`-less decompression bomb. |
| **Content type** | The response must be `image/*` | Correct. |
| **Timeout** | 7 s default via `AbortController` | Correct. |
| **Rate-limit memory** | `MAX_TRACKED_KEYS = 10_000`, oldest-first eviction, periodic pruning | Correct — prevents unbounded growth from spoofed client keys. |
| **Concurrency** | Lock file with stale detection (`LOCK_STALE_MS = 120_000`) | Correct, and the reasoning about the worst-case legitimate duration is good. |
| **Input validation** | `boundedText` (length caps), `parseSongId` (strict charset regex) | Correct. |
| **XSS surface** | `dangerouslySetInnerHTML` → 0 hits; `eval`/`innerHTML =` → 0 hits; React escaping throughout | The entire stored-XSS class is eliminated by construction. |
| **Type safety** | `strict: true`, 0 `any`, 0 ts-suppressions | Eliminates a whole class of logic defects. |
| **Dependency audit** | `npm audit --omit=dev --audit-level=moderate` → **0 vulnerabilities** | Clean. |
| **CSP derivation** | The allowed origins in `next.config.ts` are derived from the code with file references, and the comment explains *why* each origin is present (including why Apple Music is excluded) | Exemplary. |
| **Privacy policy** | `PRIVACY.md` §2 "Zero telemetry — verified, not claimed"; §3 enumerates every data flow including third-party music requests; §5 explains data deletion; §9 states what could not be proven | Far better than typical. |

---

## QA-SEC-001 — P1 — Security headers are configured but never delivered

### What I measured

`next.config.ts` defines seven headers: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, `X-DNS-Prefetch-Control`.

`npm run build` emits:

```
⚠ Specified "headers" will not automatically work with "output: export". See more info here:
  https://nextjs.org/docs/messages/export-no-custom-routes
...
⚠ rewrites, redirects, and headers are not applied when exporting your application, detected (headers).
```

`next.config.ts` sets `output: 'export'`, so the exported site has **none** of these headers.

### Honest credit where it is due

This is **not** an undocumented defect. It is tracked as finding **F-05** in `SECURITY.md` §3.1 with severity *Medium* and the verdict *not effective*, and explained in §4.6 with the exact Next.js warning. `next.config.ts` repeats the limitation in a comment block with the file reference for the warning source. `REQUIREMENTS.md` and the acceptance table reflect it. This is exemplary self-honesty — and it is why this is a P1 *gap* rather than a P0 *surprise*.

### What is actually at risk

| Header | Effect of it being absent |
|---|---|
| `Content-Security-Policy` | No restriction on injected script sources. With `script-src 'self' 'unsafe-inline'`, a CSP that *is* delivered would still limit `frame-src`/`connect-src`/`object-src` — but **no CSP at all** means any XSS or hostile injection runs unrestricted. |
| `Strict-Transport-Security` | No forced HTTPS for 2 years. `upgrade-insecure-requests` inside the CSP is also lost, so mixed content is not blocked. |
| `X-Content-Type-Options: nosniff` | MIME sniffing is possible on served assets. |
| `Referrer-Policy` | The default `strict-origin-when-cross-origin` is browser behaviour — but the explicit header tightens it for older clients. |
| `Permissions-Policy` | Camera/microphone/geolocation/payment are not explicitly denied. The app only needs the camera (QR scanner). |
| `X-Frame-Options: DENY` / `frame-ancestors 'none'` | Clickjacking protection is absent. |

Note that `frame-ancestors 'none'` is the one most likely to matter in practice for an app that is embedded nowhere but is trivially iframeable.

### Concrete recommendation

**Move the headers to the hosting layer.** This is the single highest-value change in this report, because it is a configuration move, not a code change, and it is the same move that unblocks QA-SPO-001.

| Host | Header support | Recommendation |
|---|---|---|
| **GitHub Pages** | ❌ No custom headers at all | Migrate. |
| **Cloudflare Pages** | ✅ `public/_headers` file | **Recommended.** Free, static, supports the `headers` file directly, and keeps the static export. |
| **Netlify** | ✅ `netlify.toml` or `_headers` | Good alternative. |
| **Cloudflare Workers / Vercel / any Node host** | ✅ Full control | Required anyway if you adopt the catalogue API from QA-SPO-001. |

For **Cloudflare Pages**, create `public/_headers` with the exact same values. Because `public/` is copied verbatim into the export, the file ships as-is:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' https://p.scdn.co https://music.amazon.com; connect-src 'self' https://www.youtube.com; frame-src https://www.youtube.com https://music.youtube.com https://open.spotify.com https://music.amazon.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  Cross-Origin-Opener-Policy: same-origin
  X-DNS-Prefetch-Control: off
```

To prevent drift between `next.config.ts` and `_headers`, **generate one from the other** in a script, and add a CI check that they agree:

```bash
# scripts/check-headers-parity.mjs
// Fails if the CSP in next.config.ts differs from the one in public/_headers.
```

**Accept when**

- `curl -sI https://<the-live-host>/Phomu/` returns all seven headers with the expected values.
- The parity check runs in CI and fails on a deliberate divergence.
- `SECURITY.md` finding **F-05** is updated from *"not effective"* to *"effective"*, with the new host named — and the change is recorded in `CHANGELOG.md`.

---

## QA-SEC-002 — P1 — The hardened admin API is unreachable and uncalled

### What I measured

| Check | Result |
|---|---|
| Importers of `src/admin-api/**` outside `src/admin-api/` | **0** |
| `fetch()` calls to `/admin/covers/*` in `src/app/admin/` | **0** |
| Routes present in the static export (`out/`) | `out/admin/review`, `out/admin/songs` — **no API routes** |
| Build output route list | `/admin/review`, `/admin/songs` — **no `/admin/covers/search`, no `/admin/covers/save`** |
| Test files dedicated to the admin API | **5** (63 of the project's 97 tests) |

The admin pages (`src/app/admin/songs/page.tsx`, `src/app/admin/review/page.tsx`) do not call the API routes. The routes are not part of the static export — with `output: 'export'`, dynamic route handlers are not emitted at all.

So the situation is:

- The admin UI exists and renders.
- The admin API exists and is **very well hardened**.
- **Nothing connects them**, and the API is **not deployed**.

The project's own status file (`project/project.yaml`) and `ARCHITECTURE.md` describe the admin API as a first-milestone deliverable. The reality is a hardened component with no consumer.

### Why this is a finding and not a nit

1. **The security posture is misrepresented.** 63 of 97 tests — 65 % of the suite — guard a component that is not reachable. A reader of the test report will conclude the admin surface is protected. In the deployed artifact it does not exist at all, which is a different kind of problem: the admin *pages* are deployed and look functional, but cover search and cover save are not available.
2. **The 63 tests cost CI time without protecting a product.** Every one of the 97 tests runs on every push; roughly two thirds of the runtime buys nothing.
3. **The published admin pages may mislead.** If the admin UI presents cover search as a feature, a user will try to use it and find it absent.

### Concrete recommendation — decide, do not defer

Choose one of the two options and record it as a CR in `docs/cr/`:

**Option A — Wire it up (recommended if the admin is a real deliverable).**

The admin API writes to the filesystem (`src/data/songs`, `public/covers`). A static export **cannot** do that. Therefore the admin API requires a **server** — which is the same requirement as the catalogue API in QA-SPO-001.

```
GitHub Pages  ──►  static shell (game, lobby, browse, projector)
                 │
Cloudflare Worker / Node server / VPS
   ├─ /api/catalog     → serves rounds, hides answers (QA-SPO-001)
   ├─ /api/covers/*    → the existing admin API, now actually reachable
   └─ /api/...         → headers set here (QA-SEC-001)
```

One hosting decision fixes three findings at once (QA-SEC-001, QA-SEC-002, QA-SPO-001) — this is the highest-leverage change in the whole audit.

**Option B — Remove it (recommended if the admin is not a deliverable yet).**

Delete `src/admin-api/` and its five test files, and remove the admin pages from the build. The catalogue is curated offline (there is already a Python/JS tooling chain in `scripts/`), so the admin UI is arguably a convenience rather than a product feature.

Do **not** leave it in the current state. Half-wired is the worst of the three options.

**Accept when**

- Either: the admin API is reachable from the admin UI in a running deployment, and its tests guard a live path; or: `src/admin-api/` and the admin routes no longer exist, and `REQUIREMENTS.md` no longer claims the admin API as a deliverable.
- `REQUIREMENTS.md` and `project/project.yaml` state the same thing about the admin surface.

---

## QA-SEC-003 — P2 — The rate limiter is per-instance, and the project says so — but the deployed platform makes it worse

`src/admin-api/_lib/rate-limit.ts` documents the limitation honestly:

> *"The buckets live in the memory of a single process. On a serverless platform every cold start begins with an empty bucket and several instances never share state."*

This is correct and well-documented. The consequence for the deployment, however, is not documented anywhere: **GitHub Pages has no server at all**, so the limiter cannot run in its intended environment. Whichever way QA-SEC-002 is resolved, the limitation statement should say what it means in practice — on a static host there is no limiter, and on a serverless host the global bucket resets on every cold start.

**Recommendation:** if the admin API moves to a server, state the rate-limiting guarantee per deployment target in `SECURITY.md` §4.2, and prefer a shared store (Redis, or a KV namespace) over in-process `Map` if the target is serverless.

---

## QA-SEC-004 — P2 — The CSP allows `'unsafe-inline'` for scripts, and that is the residual XSS risk

The CSP comment explains why:

> *"Next.js injects inline bootstrap scripts for the RSC payload. A static export cannot deliver per-request nonces, so 'unsafe-inline' is unavoidable here."*

For a **static export** this is true — there is no per-request request context in which to mint a nonce. For a **server deployment** it is not: a Node/Worker host can generate a per-request nonce and pass it to Next.js, which then emits matching nonces on its inline bootstrap scripts.

Given that QA-SEC-001 already requires moving to a host that can set headers, QA-SPO-001 already requires a server, and the roadmap already targets multiple platforms, **the moment there is a server, the nonce mechanism should be used and `'unsafe-inline'` should be dropped from `script-src`.**

**Recommendation:** plan the migration as one change — new host, nonce-based CSP, catalogue API, admin API. Do not try to bolt a nonce onto a static export; it will not work.

**Accept when:** on the final hosting target, the CSP contains no `'unsafe-inline'` in `script-src`, or a documented technical reason why it still does.

---

## QA-SEC-005 — P3 — Secrets and configuration hygiene

| Check | Result | Assessment |
|---|---|---|
| `.env.example` present with a placeholder | ✅ `ADMIN_API_TOKEN=replace-with-long-random-token` | Good — the example holds no secret. |
| Token in source | ✅ 0 hits; read from `process.env` | Good. |
| Token generator | ✅ `scripts/generate-admin-token.js` + `npm run security:rotate-admin-token` | Good, and the rotation procedure is documented in `SECURITY.md` §3.5. |
| `.gitignore` covers `.env*` | needs confirmation | Should exclude `.env`, `.env.local` and any `*.local` variant. |
| Minimum token length | ✅ 32 characters, enforced server-side | Good — see QA-SEC-006. |

**Recommendation:** confirm that `.gitignore` covers `.env`, `.env.local`, `.env.*.local` and `*.pem`. One check, no code needed.

---

## QA-SEC-006 — P3 — The admin token travels in a custom header over plain HTTP in development

`assertAdminAccess` reads `x-admin-token`. That is a good choice (it avoids URL logging and browser history leakage, unlike a query parameter). But the token is a bearer credential with full write access to the catalogue.

**Recommendation:** document that the admin API must only ever be exposed over HTTPS, and that the admin pages must never be served from a plain-HTTP origin. If the admin UI is ever reachable on a LAN without TLS, the token is exposed to every device on that network. This belongs in `SECURITY.md` §3.5 next to the rotation procedure.

---

## QA-SEC-007 — P3 — The privacy policy is strong; one claim needs re-checking after the hosting change

`PRIVACY.md` §2 is "Zero telemetry — verified, not claimed", and §3.1 correctly discloses that music playback sends requests to YouTube, Spotify and Amazon Music. That is exactly the disclosure a privacy notice needs.

**One check after the hosting migration:** if the catalogue moves behind an API, the API sees the client IP address and the song requested. That is a new data flow relative to today's static delivery, and `PRIVACY.md` §3 must be updated to describe it — including that the IP is not logged and that the response is a single round.

This is the kind of detail that a privacy policy is judged on, and it is much cheaper to add now than to correct later.

**Accept when:** `PRIVACY.md` §3 describes every data flow of the final architecture, and each is traceable to code.

---

## Acceptance summary for this report

| Item | Severity | Accept when |
|---|---|---|
| QA-SEC-001 Deliver the security headers | **P1** | `curl -sI` on the live host returns all seven headers; a parity check runs in CI; **F-05** is closed in `SECURITY.md` |
| QA-SEC-002 Wire up or remove the admin API | **P1** | The admin API is reachable and tested against a live path, **or** it and its routes are deleted and the requirements updated |
| QA-SEC-003 State the rate-limit guarantee per host | P2 | `SECURITY.md` §4.2 names the guarantee for the actual deployment target |
| QA-SEC-004 Drop `'unsafe-inline'` once a server exists | P2 | The deployed CSP has no `'unsafe-inline'` in `script-src`, or the reason is documented |
| QA-SEC-005 Confirm `.gitignore` covers secrets | P3 | `.env*` and key files are ignored |
| QA-SEC-006 Document HTTPS-only for the admin API | P3 | `SECURITY.md` states the transport requirement |
| QA-SEC-007 Update the privacy notice for the API | P3 | `PRIVACY.md` §3 lists every data flow of the final architecture |
