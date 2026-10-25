# CR-0001 — Documentation and Agent Structure Reform

**Status:** proposed
**Date:** 2026-10-25
**Trigger:** The reform contract of this round (`/workspace/CONTRACT.md`) demands
a referencable documentation set with requirement IDs, a machine-readable
project state, acceptance records with evidence, eight agent roles and a
complete i18n gate. The predecessor documentation does not fulfil that:
behaviour stood in prose, status reports contradicted each other, and there was
no place where a test could point to a requirement.
**Proposed by:** ROLE-01 (Product & Requirements Steward)
**Reviewed by:** ROLE-02 (Chief Architect), ROLE-05 (Internationalization
Engineer), ROLE-06 (QA & Test Engineer), ROLE-08 (Documentation Lead)
**Decision:** **open** — the owner decides.

> **Note on the file name (deliberate deviation):** The order named
> `CR-0001-dokumentations- und-agentenstruktur-reform.md` (with a space).
> The file is called `CR-0001-dokumentations-und-agentenstruktur-reform.md`.
> Reason: the documentation link check (`node scripts/check-doc-links.mjs`)
> resolves a link path up to the first space and reported the path with the
> space as a dead target (`docs/acceptance/M0-ACCEPTANCE.md:231`). A space in
> the file name would also be error-prone in shell commands and scripts.
> **Evidence:** Link check before the rename:
> `docs/acceptance/M0-ACCEPTANCE.md:231 -> ../cr/CR-0001-dokumentations- — Ziel existiert nicht`
> (tool output, originally German: "target does not exist"); after the rename
> the finding is gone.

---

## 1. Problem

Four findings, all measured on 2026-10-25 at commit `d5b6422`:

**1.1 — Behaviour without identity.**
The predecessor documentation (`specifications/`) described the rules of the game
in prose. There were no IDs that a test, a code comment or a reviewer's note
could point to. Evidence:
`specifications/archive/project_roadmap_archivstand_2026-10-25.md` contains
acceptance criteria such as `Session-Playtest: subjektive Musikpräsenz > 8/10`
(session playtest: subjective music presence > 8/10) without a measurement
procedure — no instrument, no sample, no protocol.

**1.2 — Status reports contradicted the code.**
`specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:12`
reports `Lint: ❌ nicht grün (10 Errors, 2 Warnings)` (lint: ❌ not green,
10 errors, 2 warnings). The current run reports the opposite: `npm run lint`
ends with exit 0, 0 errors, 1 warning (`playwright.config.ts:1:1`). Likewise
`README.md` states `37 Packs / 1.629 Songs`, while 135 pack files and 1,615
songs are measured (`npm run validate-catalog`). Two numbers, two truths, no
place that decides.

**1.3 — No acceptance with evidence.**
No acceptance document existed. The term "acceptance-ready" stood in
`specifications/archive/current_status_2026-04-02_archivstand_2026-10-25.md:30`
(`Gesamt Phase 1: 100 % (abnahmefähig)` — overall phase 1: 100 % (acceptance-ready))
without a single test name or command output.

**1.4 — The visible text of the interface is not bilingual.**
`src/i18n/locales/de.json` and `en.json` contain 25 keys each. Measured on
2026-10-25T08:34:52Z, they face **935 literal texts in 47 files**
(`node scripts/check-i18n-completeness.mjs --count`). The interface is therefore
effectively German; English exists only in the six namespace blocks.

**1.5 — The gates exist, but are not runnable.**
`CONTRIBUTING.md:20–25` names `npm run check:i18n`, `npm run check:doc-links`
and `npm run check:file-size`. In `package.json` not a single `check:` script
exists; `scripts/check-file-size.mjs` does not exist.

## 2. Proposed change

**2.1 — New root document set.**
`README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, `ROADMAP.md`,
`QUALITY.md`, `WHERE_TO_CHANGE.md`, `GLOSSARY.md`, `PROJECT_MANAGEMENT.md`,
`LLM.md` (new, short version instead of the master specification).

**2.2 — New `docs/` tree.**
`docs/README.md` (index), `docs/adr/` (ADR-0001 onwards, template
`ADR_TEMPLATE.md`), `docs/cr/` (template `CR_TEMPLATE.md`, this CR-0001),
`docs/acceptance/` (template `ACCEPTANCE_TEMPLATE.md`, acceptance record
`M0-ACCEPTANCE.md`).

**2.3 — `project/project.yaml` as the single machine-readable truth.**
Project name, baseline, product status, current milestone, completed
milestones, licence, platforms, module boundaries with dependency direction,
requirement counts per domain, quality thresholds, milestone status, i18n data.

**2.4 — Requirement ID scheme `<DOMAIN>-<NNN>`** with nine domains
(`CORE`, `GAME`, `LOBBY`, `MEDIA`, `UI`, `I18N`, `CAT`, `SEC`, `NFR`), mandatory
fields (requirement, rationale, acceptance, verification) and the legend
Preset/Optional/Later.

**2.5 — Agent roles `ROLE-01` … `ROLE-08`** with ownership, review and
blocking scope, plus a Mavis roster with the same eight roles
(Product Manager, Chief Architect, Game Engineer, UI Engineer, QA Engineer,
Security & Privacy Manager, Docs Lead, i18n Engineer).

**2.6 — Three new gates** (work contract §6):
`scripts/check-i18n-completeness.mjs`, `scripts/check-doc-links.mjs`,
`scripts/check-file-size.mjs`, each runnable locally via `npm run check:*` and
in the CI.

**2.7 — i18n boundary.** `src/i18n/locales/de.json` and `en.json` are
completely parallel; every visible text comes from the translation;
`src/i18n/locales/parts/` exists only as an interim state of the migration
and is merged into the final state.

**2.8 — Milestone model in `ROADMAP.md`** with purpose, scope, explicit
non-goals, acceptance criteria in six dimensions, QA evidence and release
decision per milestone; status only with evidence.

**2.9 — Archiving instead of deletion.** The predecessor files from
`specifications/` are moved to `specifications/archive/` and carry a date stamp
in the file name. They are **not** deleted.

## 3. Rationale

- `CORE-001` ("Requirements are the truth for behaviour") demands a
  referencable norm; prose does not fulfil that.
- `CORE-009` ("The code is the truth, the documentation follows") demands that
  status statements are measured against the code. That is exactly the
  contradiction from finding 1.2.
- `CORE-010` ("No decoys as accepted functionality") and `NFR-008`
  ("No acceptance based on stubs") demand evidence instead of assertion.
- `I18N-004` and `I18N-007` demand parallelism and a complete translation;
  `NFR-010` demands the gate that this requires.
- `NFR-009` ("Source files stay below the size limit") and `NFR-011`
  ("A doc link check prevents dead references") justify the gates in 2.6.
- `CORE-012` ("Identifiers stay English, project documentation stays German")
  fixes the language rule that 2.1–2.9 follow consistently.

## 4. Affected requirements

IDs according to `REQUIREMENTS.md`, state 2026-10-25.

| ID | Impact |
|---|---|
| `CORE-001` | unchanged — the reform makes it practically usable for the first time |
| `CORE-009` | unchanged — status statements become measurable |
| `CORE-010` | unchanged — acceptance demands evidence |
| `CORE-012` | unchanged — language rule of the new documents |
| `I18N-001` … `I18N-007` | unchanged — the migration to 100 % completeness is the implementation of `I18N-004` and `I18N-007` |
| `NFR-003`, `NFR-004` | unchanged — test coverage remains a goal, not an assertion |
| `NFR-005` | extended by the gates `check:i18n`, `check:doc-links`, `check:file-size` |
| `NFR-009` | extended by the gate script `scripts/check-file-size.mjs` |
| `NFR-010` | unchanged — gate `scripts/check-i18n-completeness.mjs` already exists |
| `NFR-011` | unchanged — gate `scripts/check-doc-links.mjs` already exists |
| `NFR-012` | tightened — the E2E smoke test so far only checks URLs and hits the 404 page because of `basePath: '/Phomu'` (`ROADMAP.md`, GAP-07) |
| `NFR-013` | unchanged — the core journey is still not covered by E2E |
| `GAME`, `LOBBY`, `MEDIA`, `UI`, `CAT`, `SEC` | unchanged in substance — the reform only describes them |

**No** requirement is weakened, deleted or renumbered.
New requirements arise only if the implementation makes a previously uncovered
rule visible; that is a follow-up decision of the owner.

## 5. Affected architecture

- No module in `src/` changes its boundary.
- New or changed: `src/i18n/locales/` (migration `parts/` → one file per
  language), `src/i18n/config.ts` (unchanged, remains the only i18next entry
  point), `scripts/` (three gate scripts).
- The boundary "translation happens in `src/i18n`, not in components" is
  already described by `ADR-0004`; this CR does not introduce it anew.

## 6. Affected platforms

- **Web:** unchanged (Next.js 16, static export, `basePath: '/Phomu'`).
- **Mobile:** the interface becomes bilingual; the layout stays mobile-first.
- **CI:** the gates are added — as `npm run check:*` and in the pipeline.
  The current deploy workflow (`.github/workflows/deploy.yml`) does not yet run
  a gate (`ROADMAP.md`, GAP-18).
- **Deployment:** unchanged GitHub Pages.

## 7. Impact on the milestones

- **New milestone M3 — documentation, requirements and i18n reform.** It takes
  up the work of this round and stays `IN PROGRESS` until all gates are green.
- **M0 stays `COMPLETE`** (evidence in `docs/acceptance/M0-ACCEPTANCE.md`).
- **M1, M2, M6 stay `IN PROGRESS`** with an unchanged state of reasoning.
- **M4, M5, M7, M8 stay `PLANNED`.**
- **No milestone is moved to produce a green status.**

## 8. Impact on acceptance and tests

- New acceptance template with eight sections and the evidence rule
  ("test name, command output or file:line"; `NOT RUN` is a permissible
  result, a promise of success without evidence is not).
- First acceptance record `docs/acceptance/M0-ACCEPTANCE.md` for the as-is
  state.
- New gates: i18n completeness, documentation link check, file size. Every
  gate is **negatively tested** (violation → red → back → green) before it
  counts as fulfilled.
- Existing tests remain valid; the four existing test files (21 test cases)
  are the reference point for M2.

## 9. Risks

| Risk | Probability of occurrence | Impact | Countermeasure | Owner |
|---|---|---|---|---|
| The reform replaces product work with documentation | medium | The catalogue and the game rules remain unimproved | The roadmap continues with M1/M2/M4/M5/M7/M8; the reform is M3, not a replacement for everything | Owner |
| The requirement counts in `project/project.yaml` go stale immediately | high | Tools report wrong numbers | `count_measured_at` and `count_source` are kept in the file and must be updated with every change to `REQUIREMENTS.md` | ROLE-01 |
| The i18n migration breaks the interface | medium | A text is missing or appears twice | The gate `check-i18n-completeness.mjs` prevents untranslated texts; the migration happens file by file | ROLE-05 |
| New gates decay without CI wiring | medium | The state silently slips back | `check:*` scripts in `package.json` and inclusion in the pipeline (GAP-03, GAP-18) | ROLE-06 |
| The documentation link check stays red and blocks everything | high | The progress of the round looks like a standstill | The link check distinguishes by priority; the remaining dead links belong to files of other work areas and are listed by name | ROLE-08 |

## 10. Rollback

The rollback is **lossless**, because nothing is deleted:

1. `git checkout -- .` (or `git restore .`) on the branch
   `feature/vocument-style-docs-and-i18n` restores the state before the reform;
   no conflict with the archived files arises.
2. The moved files are moved back:
   `git mv specifications/archive/<name>_archivstand_2026-10-25.md specifications/<name>`
   for all files listed in `specifications/archive/README.md`.
3. `LLM.md` is retrieved with `git checkout -- specifications/archive/LLM_archivstand_2026-10-25.md`
   and renamed.
4. The new root files (`REQUIREMENTS.md`, `ARCHITECTURE.md`, `AGENTS.md`,
   `QUALITY.md`, `WHERE_TO_CHANGE.md`, `GLOSSARY.md`, `PROJECT_MANAGEMENT.md`,
   `ROADMAP.md`, `project/project.yaml`, `docs/`) are **not** deleted,
   but moved to `specifications/archive/reform_2026-10-25/`.
5. `scripts/check-i18n-completeness.mjs`, `scripts/check-doc-links.mjs` and
   `scripts/count-ui-literals.mjs` stay in place — they do not change any
   runtime behaviour.
6. `src/i18n/locales/parts/` is not deleted; the migration is reversible via
   `scripts/merge-i18n-parts.mjs`.

**Cannot** be rolled back: the move of the files in the git history, once it is
committed. That is why it is done with an archiving commit and a descriptive
file name stamp.

## 11. Decision

**Open.** The decision of the owner is required on:

1. **Milestone numbering** — do M0–M8 from the old phases 1–5 remain, or does
   M3 become the new M0? (Recommendation: keep M0–M8, because the history in
   `ROADMAP.md` would otherwise not be findable.)
2. **`product_status`** — prose or a pure token schema?
   (Recommendation: token schema, prose in `product_status_summary`.)
3. **Handling of the unreachable admin API** — remove it, convert it to a Node
   server, or move it into the export as a build step?
   (Recommendation: as a build step, because the interface already uses it.)
4. **Coverage target** — keep 60 % lines for the scope `src/utils/**` or widen
   the scope first? (Recommendation: widen the scope first, then set the
   target; a target on a scope that is too small produces green numbers without
   meaning.)

After the decision, this CR is set to `approved` or `rejected` and the
decision is added with date and conditions in this section.
