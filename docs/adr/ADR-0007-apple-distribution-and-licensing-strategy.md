# ADR-0007 — Apple Distribution and Licensing Strategy

**Status:** proposed
**Date:** 2026-10-25
**Owner role:** Project owner (decision authority) with Chief Architect (implementation)
**Related requirement IDs:** CORE-002 (free open source without a forced account), CORE-003 (local-first, data-minimising), CORE-011 (no telemetry), CORE-012 (documentation language) — see [§7 Deviations](#7-deviations-from-the-template-and-from-existing-requirements)

> **Language note.** `docs/DOCUMENTATION_POLICY.md` §3 and CORE-012 require
> German for `docs/`. This ADR is written in **English** because the
> assignment that produced it required English. That conflict is recorded
> below as an open decision, not resolved here.

---

## Context

Phomu is licensed GPL-3.0-or-later. `LICENSE` states "This project (Phomu) is
licensed under GPL-3.0", `README.md` says "GPL-3.0-or-later", and
`package.json` carries `"license": "GPL-3.0"` — the version statement is
already inconsistent across the repository.

The planned iOS/iPadOS track is the **fourth of five** platform tracks
(Android → Google TV/Fire TV → macOS/Linux → **iOS/iPadOS** → Windows). The
web app exists, works, and is a static export on GitHub Pages
(`project/project.yaml`: `platforms.web.rendering: "static export"`,
`platforms.deployment.target: "GitHub Pages"`); `platforms.mobile.native_app`
is `false` today. The project owner **does not hold an Apple Developer
account** and intends to acquire one.

The tension is specific and well documented. GPL-3.0 §10 forbids imposing
further restrictions on the exercise of the granted rights; the Free Software
Foundation identified the App Store's Usage Rules and FairPlay DRM as exactly
such restrictions in the 2010 GNU Go case, and VLC was removed from the App
Store in January 2011 over the same conflict. The VLC project resolved the
conflict by relicensing its library from GPLv2 to LGPLv2 (October 2011) and
its application to the MPL (July 2013) — i.e. by abandoning copyleft, not by
obtaining an exception.

A narrow instrument exists for the alternative: GPL-3.0 §7 lets the copyright
holders grant additional permissions that "supplement the terms of this License
by making exceptions from one or more of its conditions", and §7 itself defines
non-permissive additional terms as "further restrictions". Working examples of
a §7 app-store exception exist in the wild (Haven's "App store distribution
exception" under AGPL-3.0 §7; Litter's app-store permission under GPL-3.0 §7).

The decisive practical constraint is that **Apple's App Store is the only
distribution channel for iOS/iPadOS with global reach**. The DMA alternatives
are EU-only and, as of Apple's business terms updated 2026-08-18 and effective
2026-10-01, require the developer to satisfy at least one of seven eligibility
criteria (a Dun & Bradstreet financial-stability score, public listing, venture
funding, a financial audit, government/educational/non-profit status, a USD
1,000,000 stand-by letter of credit, or one million first annual installs) —
none of which an individual open-source project plausibly meets today. The
App Store therefore has to be on the table, and the licence question has to be
answered before the Apple track starts, not after.

The full evidence base — with URLs, retrieval dates and an explicit
fact/interpretation/recommendation separation — is in
[`docs/licensing/APPLE-LICENSING.md`](../licensing/APPLE-LICENSING.md).

---

## Decision

**Phomu stays licensed GPL-3.0-or-later in its entirety; the Apple track is
built as a native iOS/iPadOS application on a shared Rust core and is
distributed through the Apple App Store, with TestFlight as the first
distribution step and the existing web app remaining the primary and
fallback channel.** To make App Store distribution lawful, the project grants
exactly one additional permission under GPL-3.0 §7 — the *Phomu App Store
Exception*, published in `LICENSES/APP-STORE-EXCEPTION.md` — which permits
conveying the covered work through app-store distribution services
notwithstanding their DRM and usage rules, while leaving every copyleft
obligation (complete corresponding source, licence notices, no further
restrictions imposed by Phomu itself) fully intact and remaining revocable per
copy and per contributor under §7. The core is not relicensed, not
dual-licensed and not placed under LGPL. The App Store Exception may only be
published once every copyright holder has consented, so the contributor
agreement and the retroactive consent for existing contributors are
prerequisites for the first TestFlight upload, not follow-up work. The Apple
track remains the fourth priority: if the owner never acquires an Apple
Developer account, the shared Rust core is still built and shipped to the
other tracks, and the Apple app stays "designed, not shipped".

---

## Consequences

### Positive

- **The licence model survives intact.** The work remains GPL-3.0-or-later; only
  one distribution channel's conflicting terms are neutralised, through the
  mechanism the licence itself provides.
- **Visibility is preserved.** The App Store is the only channel with global
  iOS/iPadOS reach; the EU alternatives are EU-only and gated behind criteria
  Phomu does not meet today.
- **The precedent is real, not theoretical.** §7 app-store exceptions are in
  active use by other free-software projects, so the mechanism is exercised
  rather than untested.
- **The Rust core is reused five times.** The shared core, the UniFFI bridge
  and the dependency rules serve the iOS track and every other track; the
  work is not Apple-specific and is not wasted if the Apple track stalls.
- **The web app remains the fallback.** With no Apple account the web app and
  the other three tracks are unaffected; the plan degrades safely instead of
  blocking.
- **The exception is revocable.** GPL-3.0 §7 lets a recipient remove an
  additional permission from a copy, so a dissenting contributor can withdraw
  consent for their own contribution without a licence change for the project.
- **The decision is documented before it is needed.** The legal analysis, the
  channel map and the build constraints are now written down, so the Rust core
  can be designed against them from the start.

### Negative / Trade-offs

- **A consent problem appears where there was none.** A §7 permission can only
  be granted by the copyright holders. `CONTRIBUTING.md` currently contains no
  CLA, no DCO and no sign-off clause (verified: exactly one licence mention in
  the file), so the project does not yet have the standing to grant the
  exception over all contributions. Every new contributor before this is
  settled enlarges the problem.
- **The residual dispute is not eliminated.** Whether a §7 permission alone
  reconciles App Store distribution with the GPL is not settled in any public
  source consulted. The mitigation is the model's existence in the wild, not a
  ruling. A single contributor could still object, and the VLC precedent shows
  that objection is a realistic mechanism, not a theoretical one.
- **App Review is a new gate.** Guideline 4.2 (Minimum Functionality) is a
  judgement call that a native app must survive even though a working web app
  exists; the mitigation is a genuinely native feature set, not a guarantee.
- **The account, the fee and the annual cycle arrive.** 99 USD per membership
  year, plus an annual re-signing, re-review and SDK-floor maintenance
  obligation.
- **Two licence regimes have to be documented.** Users receive the GPL terms
  plus the exception; the App Store Connect Custom EULA, the `NOTICE` and the
  in-app licence display must all state the same thing.
- **The platform floor moves.** Uploads must be built with Xcode 26+ and the
  iOS 26 SDK or later since 2026-04-28, so the Rust toolchain and the Xcode
  version must move together.
- **A privacy manifest becomes mandatory.** `PrivacyInfo.xcprivacy` at the root
  of the app bundle, with required-reason API declarations, enforced since
  2024-05-01.
- **The build becomes platform-conditional.** The shared core must compile for
  `aarch64-apple-ios` with the full standard library, must not spawn
  processes, must not download or execute code at runtime, and must be
  delivered as exactly one static library behind one UniFFI bridge.
- **Two open questions remain outside the licence question:** whether the
  project forms a non-profit or educational entity (which would unlock both the
  fee waiver and one EU eligibility criterion), and whether a native app
  carrying the same catalogue as the web app passes guideline 4.2.3(ii) on
  download size.

### What the decision makes impossible

- **Shipping a GPL-3.0 build through the App Store without the §7 exception**
  is no longer an option this project may choose. If consent is refused, the
  App Store channel is closed and the Apple track must fall back to
  ad-hoc/sideloading or be dropped.
- **Relicensing the core permissively** (MIT, Apache-2.0, BSD) is off the
  table for this project.
- **Dual licensing** (GPL-3.0-or-later *or* a proprietary/App-Store
  licence) is off the table; the §7 exception is the only additional
  permission Phomu will grant.
- **Using LGPL for the core** is off the table: the LGPL's linking exception
  requires the user to be able to replace the library, which a locked-down
  platform prevents, so it does not solve the problem it appears to solve.
- **Using the Apple Developer Enterprise Program for public distribution** is
  off the table; the programme is limited to proprietary in-house apps for
  employees of an organisation with 100+ employees.
- **Distributing the native app through a third-party marketplace or the web
  as the primary channel** is off the table; those channels stay reserved for
  the EU, where they are available, and for fallback use.

---

## Rejected alternatives

### 1. Sideloading only, no Apple account — *rejected*

**What it is.** No paid membership. Distribute signed builds via ad-hoc
distribution, AltStore-style sideloading, or — in the EU — an alternative
marketplace.

**Why rejected.** Reach collapses. Ad-hoc is capped at 100 devices per product
family per membership year (and requires a paid membership). A free Apple
Account permits 3 device registrations and up to 3 apps per device, with App
IDs, device registrations and provisioning profiles all expiring after 7 days.
The EU channels are EU-only and gated behind eligibility criteria Phomu does
not meet. The track would exist as source code and a build recipe with no
audience, which contradicts the purpose of a platform track.

**What it costs to keep as a fallback.** Nothing — it remains the documented
fallback if the account never materialises.

### 2. Ship through the App Store under plain GPL-3.0, without an exception — *rejected*

**What it is.** Submit the GPL-3.0 app and rely on the fact that Apple accepts
GPL apps in practice.

**Why rejected.** This is the option the FSF identified as non-compliant in
2010, and the option VLC was removed from the store for in 2011. The risk is
not hypothetical: it is the project's legal position resting on nobody
enforcing the GPL, and enforcement has happened. It would also expose the
project to an App Review rejection under guideline 5.2.1 (apps must be
submitted by the party that owns or has licensed the relevant IP rights),
which is the most likely place for the problem to surface first.

### 3. Relicense the core under a permissive licence — *rejected*

**What it is.** MIT, Apache-2.0 or BSD for the shared core; the Apple app
becomes legally trivial.

**Why rejected.** It discards the licence identity that is the project's main
asset and its stated purpose as free open-source software, and it requires
consent from every copyright holder to change the licence of work already
contributed. The problem being solved is a *distribution-channel* problem; a
whole-work relicensing is a disproportionate answer to it.

### 4. Drop the Apple track / defer it as "Later" — *rejected*

**What it is.** Remove iOS/iPadOS from the five-track plan and spend the
capacity on the tracks that are already in flight.

**Why rejected.** It forfeits an entire platform's audience, and it discards
the Rust-core reuse that the Apple track motivates. Deferral is retained only
as a *sequencing* fact — the Apple track is fourth — not as a decision to
drop it. Note that a free Apple Account is sufficient to build and run the
app on the developer's own device for 7 days at a time, so the track can be
designed and developed long before an account exists.

### 5. Exclusive Enterprise-programme route — *rejected*

**What it is.** Enrol in the Apple Developer Enterprise Program (299 USD per
membership year) and distribute privately via MDM, avoiding the App Store
terms entirely.

**Why rejected.** The programme is not open to Phomu. It requires 100 or more
employees, a legal entity, proprietary in-house apps for internal use only,
and it is explicitly limited to cases not adequately addressed by the App
Store, Custom Apps, Ad Hoc or TestFlight. Using enterprise certificates to
distribute a public open-source app to the public would breach the
programme's terms, and Apple does verify and continuously evaluate enterprise
enrolments.

### 6. Dual licensing (GPL-3.0-or-later **or** a proprietary/App-Store licence) — *rejected*

**What it is.** The copyright holder sells a proprietary licence for the
App-Store build; everyone else gets the GPL.

**Why rejected.** It reaches the same legal destination as the §7 exception
with strictly more machinery: a second licence to write, publish and enforce,
and the permanent possibility of a proprietary downstream fork that the §7
exception does not create. It also requires the project to hold all copyright
outright — which requires a CLA, the very instrument the §7 route also needs.
Given that the CLA is needed either way, the §7 exception is the smaller
change with the same outcome.

### 7. LGPL core with a GPL application — *rejected*

**What it is.** Follow VLC: relicense the shared core to LGPL and keep the
application under GPL.

**Why rejected.** The LGPL's linking exception requires that the user be able
to replace the library with a modified version; on a locked-down platform they
cannot, so the LGPL does not deliver what it appears to deliver. LWN's
contemporaneous analysis of the VLC relicensing reached the same conclusion.
Using LGPL would also give up copyleft for exactly the part of the project —
the shared core — that is most worth protecting.

---

## Verification

How this decision can be checked. Items marked **(not yet applicable)** become
checkable once the corresponding work has happened.

| Check | Command / location | Expected result |
|---|---|---|
| The project licence is unchanged by this ADR | `grep -n "GPL" LICENSE` | Still GPL-3.0; the exception lives in `LICENSES/APP-STORE-EXCEPTION.md`, not in `LICENSE` |
| The exception is a §7 additional permission, not a licence change | `grep -n "section 7" LICENSES/APP-STORE-EXCEPTION.md` | One §7 permission, scoped to app-store channels only |
| The licence version statement is consistent | `grep -rn "GPL-3.0" LICENSE README.md package.json CONTRIBUTING.md` | One version statement everywhere (currently inconsistent — see [§7](#7-deviations-from-the-template-and-from-existing-requirements)) |
| The contributor agreement grants §7 consent | `grep -n "section 7\|Additional permission" CONTRIBUTING.md` | Inbound licence **and** §7 consent are both stated |
| The core builds for the Apple target | `cargo build --target aarch64-apple-ios` in the Rust core crate | Succeeds with the full standard library available |
| The core spawns no processes and loads no code at runtime | `cargo tree` of the core crate | No `std::process`, no `tokio::process`, no process-spawning dependency |
| Exactly one Rust static library is linked | Xcode build log / `otool -L` on the app binary | One Rust archive; no duplicate-symbol errors |
| The privacy manifest exists in the bundle | Xcode archive → `PrivacyInfo.xcprivacy` at the bundle root | Present, with required-reason API declarations |
| The App Store build meets the SDK floor | App Store Connect upload | Built with Xcode 26+ / iOS 26 SDK or later; targets iOS 13 or later |
| The web app is unaffected by this decision | `npm run build && npm run local-ci` | Unchanged; the static export still builds and all gates pass |
| **The plan holds without an Apple account** | `cargo build --target aarch64-apple-ios` without any membership; web app still deploys | Core builds; web app ships; the Apple app is "designed, not shipped" |

---

## 7. Deviations from the template and from existing requirements

| Deviation | Detail | Decision needed from |
|---|---|---|
| **Language** | `docs/DOCUMENTATION_POLICY.md` §3 and **CORE-012** require German for `docs/`. This ADR and `docs/licensing/APPLE-LICENSING.md` are in English because the assignment required English. | Owner: either translate both documents, or amend CORE-012 / the policy to permit English for licensing documents (which quote English-language legal sources verbatim and are harder to keep authoritative in translation). **CORE-012 must not be silently violated.** |
| **ADR role list** | `docs/adr/ADR_TEMPLATE.md` lists eight roles; none is a licensing/legal role. This ADR is owned by the project owner with the Chief Architect. | Owner / Docs Lead: extend the template's role list. |
| **Requirement IDs** | No existing requirement covers platform distribution or licensing; the domains are CAT, CORE, GAME, LOBBY, MEDIA, NFR, SEC, UI. | Product Manager: create distribution/licensing requirement IDs and link them here. This ADR deliberately references only IDs that exist today (CORE-002, CORE-003, CORE-011, CORE-012). |
| **Licence version statement** | `LICENSE` and `package.json` say "GPL-3.0"; `README.md` (licence section) and `CONTRIBUTING.md` say "GPL-3.0-or-later". | Owner / Docs: settle on "GPL-3.0-or-later" before the exception is published, so that the §7 permission applies to a defined licence range. |
| **Outside this worker's scope** | `LICENSE`, `CONTRIBUTING.md`, `README.md`, `docs/README.md`, `ARCHITECTURE.md`, `project/project.yaml`, `REQUIREMENTS.md`, `ROADMAP.md`, `docs/design/**`, `SECURITY.md`, `PRIVACY.md` were **not** modified. The required follow-ups are listed in `docs/licensing/APPLE-LICENSING.md` §13. | Respective owners. |
