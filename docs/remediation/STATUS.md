# Remediation status

This document tracks the state of the remediation backlog produced by the
independent QA assessment in [`docs/qa/`](../qa/). The backlog itself is the
plan; this file is the **execution record**: what is done, what is in flight,
what is still open, and what the owner has to decide.

**Source of truth:** [`docs/qa/QA-09-REMEDIATION-BACKLOG.md`](../qa/QA-09-REMEDIATION-BACKLOG.md)
— 28 items, 50 findings, estimated 18–26 working days.

**Last updated:** 2026-10-27

---

## How to read the columns

| Column | Meaning |
|---|---|
| **Item** | The number in the QA backlog |
| **Finding** | The QA finding it closes |
| **State** | `done` · `in flight` · `open` · `owner decision` |
| **Evidence** | Where the proof is |

`done` means: the change is in the repository, the acceptance criterion from
the backlog is met, and the measurement is reproducible. Not "looks right".

---

## Stage 0 — Recover

| Item | Finding | State | Evidence |
|---|---|---|---|
| 0.1 | QA-REL-001 | **done** | Tags `recovery/0903997` and `recovery/2026-10-25-platform-wave` on the remote |
| 0.2 | QA-REL-001 | **done** | `main` is linear: the catalogue base `38319b3` plus the consolidated platform wave `89b7c50`. No force push was needed for the consolidation |
| 0.3 | QA-REL-002 | **done** | `youtube-search-without-api-key` removed — the pinned tarball no longer exists in the registry. `npm ci` exits 0 |

---

## Stage 1 — Close the release blockers

| Item | Finding | State | Evidence |
|---|---|---|---|
| 1.1 | QA-SPO-001 | in flight | The web shell consumes the question view of the Rust core; the solution must not reach the client |
| 1.2 | QA-SPO-007 | in flight | The fake lyric line is selected in the base, never in the client |
| 1.3 | QA-SPO-002 | in flight | The cover names become opaque, derived from the song id |
| 1.4 | QA-SPO-003 | in flight | `src/utils/censor-utils.test.ts` with the invariant test |
| 1.5 | QA-SEC-001 | **owner decision** | Depends on 2.6 (hosting model) — the headers have to be set by the host that serves the app |
| 1.6 | QA-SEC-002 | **owner decision — blocked** | The decision template is ready: [`docs/cr/CR-0002-admin-api-entscheidung.md`](../cr/CR-0002-admin-api-entscheidung.md). The documentation states the measured reachability, the reachability is asserted by a test, and the hardening that holds under both options is in place |
| 1.7 | QA-TST-001 | in flight | The coverage denominator covers `src/**`, the thresholds sit below the measured value |
| 1.8 | QA-TST-002 | in flight | The CI gains the jobs e2e, format and dependency-audit |

---

## Stage 2 — Best-in-class core

| Item | Finding | State | Evidence |
|---|---|---|---|
| 2.1 | QA-ARC-001 | in flight | The file-size gate gets three channels: new file over the soft limit is an error, a legacy file that grew is an error, a legacy file that shrank updates the recorded state |
| 2.2 | QA-ARC-002 | **open** | Six files are still over the hard limit. The split order is in the backlog; the work is a day per file |
| 2.3 | QA-UX-001, QA-UX-002 | **open** | Live regions, focus management, roles and the keyboard path |
| 2.4 | QA-ARC-005, QA-ARC-006 | in flight | The boundary check covers the raw catalogue and the config/utils/store edges |
| 2.5 | QA-UX-004, QA-SPO-004b | **open** | The catalogue content becomes localised: `hints: { de, en }` |
| 2.6 | QA-SEC-001, QA-SEC-002, QA-SPO-001 | **owner decision** | The hosting model. It decides three findings at once and is the highest-leverage decision in the plan |
| 2.7 | QA-PERF-001 | **open** | The covers move out of the repository and the payload of one round stays under 60 KB |
| 2.8 | QA-DOC-001 | **done** | The project is under **AGPL-3.0-or-later**, GitHub reports `spdx_id: AGPL-3.0`. The licence consistency gate (`npm run check:license`) keeps it that way |
| 2.9 | QA-ARC-007 | in flight | The file-size gate covers `.rs` files |
| 2.10 | QA scope gap | **done** | `docs/qa/QA-11-RUST-BASE.md` audits the Rust base with real cargo output |
| 2.11 | QA-RST-001, QA-RST-002, QA-RST-003 | **done** | The three P1 findings of the Rust base are closed — the bridge surface is declared and gated ([`docs/qa/QA-12-BRIDGE-SURFACE.md`](../qa/QA-12-BRIDGE-SURFACE.md)) |

---

## Stage 3 — Excellence

| Item | Finding | State | Evidence |
|---|---|---|---|
| 3.1–3.7 | QA-DOC-003, performance budgets, E2E depth, licence polish | **open** | The stage is not started; it depends on the stages above |

---

## The three P1 findings of the Rust base are closed

The audit of the Rust base ([`docs/qa/QA-11-RUST-BASE.md`](../qa/QA-11-RUST-BASE.md)) raised three findings of severity **P1**. All three are closed, and the evidence for each is reproducible with one command.

| Finding | State | Evidence | Command |
|---|---|---|---|
| **QA-RST-001** — the WebAssembly bridge exported three functions, so a shell could not play a game through it | **done** | The bridge exports 37 symbols, the game loop among them; the declared surface (`platform/phomu-wasm/src/surface.rs`) is compared with the export section of the built module by `platform/phomu-wasm/tests/export_surface.rs` | `cargo test -p phomu-wasm` |
| **QA-RST-002** — an unanswered round could not be closed through the exported surface | **done** | `Session::force_reveal` is exported as `phomu_session_timeout` (`platform/phomu-wasm/src/exports_session.rs:200`); the transition table is tested against the dead ends of the automaton in `core/phomu-core/tests/phase_escape.rs` | `cargo test -p phomu-core` |
| **QA-RST-003** — 20 of the public operations of the session were unreachable from every shell | **done** | Every public operation of the session is declared in `platform/bridge-surface.json` with a bridge symbol or with a written exemption; the gate `scripts/check-bridge-surface.mjs` fails when an operation has neither, and its negative self-test has been seen red | `npm run check:bridge-surface` |

The gate is the sixth of the eight gates of `npm run check:all`, and its negative self-test is `npm run check:bridge-surface:test`. The report is [`docs/qa/QA-12-BRIDGE-SURFACE.md`](../qa/QA-12-BRIDGE-SURFACE.md).

**What stays open.** One operation of the session — `Session::from_state`, the rehydration of a stored state — is still not exported by any bridge. It is declared with a written exemption and named as **OPEN-BS-01** in the report; the decision whether the persisted state belongs to the wire model of the bridges belongs to the owner. The remaining findings of QA-11 (QA-RST-004 … QA-RST-011) are open and are not touched by this entry.

---

## The decisions that belong to the owner

Two items cannot be decided by an agent, because they change what the product
**is** and not only how it is built:

### 2.6 — The hosting model

Today the web shell is a **static export** on GitHub Pages. That has three
consequences, all measured by the QA assessment:

1. The security headers cannot be set by the application (QA-SEC-001) — the
   values in `next.config.ts` never reach a response.
2. The admin API cannot run at all (QA-SEC-002).
3. The round payload has to be delivered to the client, because there is no
   server that could keep the solution back (QA-SPO-001).

Moving to a host that serves headers **and** runs API routes — Cloudflare Pages
with Functions is the recommendation of the QA assessment — fixes all three at
once. The alternatives and their costs are in
[`docs/qa/QA-09-REMEDIATION-BACKLOG.md`](../qa/QA-09-REMEDIATION-BACKLOG.md)
item 2.6.

**What the platform wave changes here:** the Android shell needs no server at
all — the game rules are in the shared Rust core and run on the device. The
hosting decision therefore affects the **web shell** and the admin API, not the
native shells.

### 1.5 — Delivering the security headers

Follows from 2.6. The headers are written in `next.config.ts`; with a static
export they are inert. The decision is which host carries them.

### 1.6 — The fate of the admin API

Either the admin API is wired up — which needs the server from 2.6 — or it is
removed together with its routes and its test files, and every document
that claims it works is corrected. **It must not stay half-wired.**

**The decision template is ready:**
[`docs/cr/CR-0002-admin-api-entscheidung.md`](../cr/CR-0002-admin-api-entscheidung.md).
It names the two options with their costs, the recommendation (option A,
together with the hosting decision 2.6) and the condition under which the
decision falls automatically: the hosting model is decided for a host that
executes route handlers — or the owner confirms in writing that Phomu stays a
static export without a server.

**What is already done and does not depend on the decision:**

- The reachability is **measured** and the measurement is **asserted by a
  test**: `src/admin-api/admin-api-reachability.test.ts` measures the two
  causes (the static export and the handlers outside `src/app/`) and asserts
  the measured verdict `unreachable`. It turns red as soon as the
  architecture changes — the tripwire was proven with a deliberate probe.
- The hardening that holds under both options is in place and is tested
  against the real attack: no token in a log, in an error message or in the
  client; answers that do not disclose whether a token exists; a hard upper
  bound for the request body, the URL and every field of the answer
  (`src/admin-api/admin-api-hardening.test.ts`).
- Every document that claimed reachability has been corrected:
  `REQUIREMENTS.md` (gap **GAP-030**), `project/project.yaml`,
  `SECURITY.md` (finding **F-01**), `docs/design/PLATFORM-ARCHITECTURE.md`,
  `README.md`, `docs/GETTING-STARTED.md`, `GLOSSARY.md`, `QUALITY.md`,
  `WHERE_TO_CHANGE.md`, `PRIVACY.md`.

---

## What the QA assessment already found fixed

Some findings were raised against a baseline that has since moved. They are
closed by the platform wave, not by the remediation:

| Finding | Closed by |
|---|---|
| QA-DOC-001 (the licence was inconsistent across four files) | The move to AGPL-3.0-or-later plus the licence consistency gate |
| QA-REL-002 (`npm ci` failed) | The removal of the withdrawn package |
| The scope gap (the Rust base was not audited) | `docs/qa/QA-11-RUST-BASE.md` |

---

## The rule for this document

A line moves to `done` only with:

1. the change in the repository,
2. the acceptance criterion from the backlog met,
3. the measurement that proves it, reproducible with one command.

Everything else stays open. A backlog item that "looks finished" is still open
until the third point holds.
