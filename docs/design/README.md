# Phomu — Design contracts

This folder contains the **design contracts** of the project: binding
documents that define the interfaces *between* the building blocks.
They sit one level deeper than [`../ARCHITECTURE.md`](../../ARCHITECTURE.md)
(layers and dependency direction) and one level above the code.

> **Language:** German for the projection, English for all identifiers, types
> and file names in the code. The two are not mixed. (All root documents are
> German as of baseline 0.1 — the English documentation round of 2026-10-25
> moved the root documentation and `docs/` to English; the identifier rule is
> unaffected.)

---

## The index

| Contract | Binding | What it regulates | Who reads it |
|---|---|---|---|
| [`GAME-CONTRACT.md`](GAME-CONTRACT.md) | **Binding** | The game flow: round phase state machine, anti-spoiler boundary, the six game modes, scoring and time rules, team and round logic, persistence rules, music providers, module boundaries for `src/components/**` | Game Engineer, UI Engineer, QA, Chief Architect, Product Manager, Owner |

**More contracts are planned** and will be added at this point:
admin-API contract (server boundary), catalogue contract (data quality),
i18n contract (translation boundary). They emerge when the boundary in
question is robustly defined in the code — not before.

---

## What "binding" means here

A contract in this folder is **binding** in exactly one sense:

> **Whoever changes a boundary described in the contract does not only violate
> the code conventions, but a contract.** That is visible in the review,
> provable in the test and a duty to give reasons in the acceptance.

Concretely that means:

| Element | Binding force |
|---|---|
| Round phase names (`drawing`, `question`, `locked-in`, `reveal`, `scoring`) | immutable without a contract change |
| Anti-spoiler rules per mode | tightening is allowed, loosening only with an ADR |
| Mode contracts (input, validation, result, points, error cases) | extension yes, renaming or deletion no without an ADR |
| Persistence rules (what lies in `localStorage`) | extension only by fields without solution relevance |
| Provider order and fallback behaviour | only with an ADR |
| Module boundaries | only with an ADR |

**No contract replaces the code.** If the code does not match the contract,
that is a **finding**, not a free pass: either the code is adjusted or the
contract — with a rationale and, for boundary shifts, with an ADR.

---

## The change rule

> **Whoever changes a boundary changes the contract in the same commit — and for
> boundary shifts additionally via an ADR.**

Three cases, three actions:

| Case | Action | Form |
|---|---|---|
| **Addition** — a rule is made more precise, an error case is documented, a measured value is added | Update the contract in the same commit | Direct edit in [`GAME-CONTRACT.md`](GAME-CONTRACT.md), name the change in the commit message |
| **Shift** — state transitions, anti-spoiler rules, mode contracts, persistence, provider order, module boundaries | Contract **and** a new ADR | [ADR template](../adr/ADR_TEMPLATE.md), numbering from `ADR-0001`, never overwrite |
| **Correction** — the contract describes something the code does not (or no longer does) | Align the contract to the code **or** correct the code | Correction backed with file:line; open decision to the owner |

**ADR obligation for shifts.** An ADR without the alternative that was
rejected is a note, not a decision. The format is binding:
`Status | Date | Context | Decision | Consequences | Alternatives`
(see [`../adr/ADR_TEMPLATE.md`](../adr/ADR_TEMPLATE.md)).

**Carry the requirement IDs.** Every contract rule refers to the requirement
it secures, from [`../REQUIREMENTS.md`](../../REQUIREMENTS.md)
(`GAME-*`, `MEDIA-*`, `LOBBY-*`, `CAT-*`). A new contract rule without a
requirement reference needs either a new requirement or a rationale for
why none is needed.

**Do not freeze numbers in the contract.** The numbers of the game are in
`PHOMU_CONFIG` (`src/config/game-config.ts`). A contract quotes them with
evidence location, it does not invent them.

---

## How the contract is checked

Every contract names its own checks at the end. For
[`GAME-CONTRACT.md`](GAME-CONTRACT.md) these are listed in § 10; the most
important ones are:

```bash
# Persistence: the song must not lie in localStorage
grep -n "partialize" -A 18 src/stores/game-store.ts

# Phase 'locked-in' must never be entered
grep -rn "advancePhase(" src

# No forbidden dependency from src/components/
grep -rn "from '@/app\|from '@/admin-api\|from '@/data" src/components/

# Doc links resolvable
npm run check:doc-links
```

---

## Relation to the other documents

```text
PROJECT_MANAGEMENT.md / ROADMAP.md     ← What is achieved when
        │
REQUIREMENTS.md                        ← What the product MUST do (with IDs)
        │
ARCHITECTURE.md                        ← Where code may go (layers, direction)
        │
docs/design/GAME-CONTRACT.md           ← HOW the game flow behaves
        │
docs/adr/*.md                          ← WHY a boundary is so and not otherwise
        │
docs/acceptance/*.md                   ← WHETHER the implementation is correct (with evidence)
```

A contradiction between two levels is not smoothed over silently, but
reported as a **finding**: to the owner, with file:line.

---

## Related documents

| Document | Content |
|---|---|
| [`../README.md`](../README.md) | Index of the entire documentation |
| [`../DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md) | Same-change rule, single source of truth, language rule |
| [`../adr/`](../adr/) | Architecture decisions |
| [`../cr/`](../cr/) | Change requests for material behaviour changes |
| [`../acceptance/`](../acceptance/) | Acceptance evidence per milestone |
