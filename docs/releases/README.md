# Phomu — Release Documentation

This folder contains the release rules of Phomu: when a build may be handed to
users, at which quality level, and what has to be proven before that happens.

## The documents in this folder

| Document                                       | Content                                                                                                                                                                                                                                                                                                                          | Read it when                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`RELEASE-PLAN.md`](RELEASE-PLAN.md)           | The release model Alpha → Beta → Stable, the gate criteria with their verification paths, the release table per track, the version scheme across the core, the bridge and the shells, the release process with rollback and hotfixes, the build and signing profile per track, the effort estimate and the open owner decisions. | You need to know **what a stage means** or **which gate applies to which track**.          |
| [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md) | The executable list for a single release: preconditions, then Alpha, Beta and Stable with their code, test, gate, documentation, signing, distribution, defect, acceptance and approval sections, and the steps after the release.                                                                                               | You are **preparing a release** and want to work through a list instead of reading a plan. |
| [`README.md`](README.md)                       | This index.                                                                                                                                                                                                                                                                                                                      | You are looking for the right document.                                                    |

## The release model in three sentences

**Alpha** is the stage at which the application can be played end-to-end on the
target device and every known defect is written down; it goes to a named test
group and promises nothing beyond that. **Beta** is the stage at which the
release scope is quality-complete — measured, accessible, migratable, free of
open blocker defects — and it goes to a wider group through a store or a
controlled channel with a documented feedback loop. **Stable** is the stage at
which zero defects in the release scope are open, the artifact is signed and
listed, the notes are published, and the update and rollback paths exist and
have been verified.

## "I want to publish Alpha X" — where to look

| Your question                                                                  | The answer is in                                                                                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| May I start the Alpha of my track at all?                                      | [`RELEASE-PLAN.md` §3.2](RELEASE-PLAN.md) — the binding order of the tracks and the "green release candidate" rule           |
| What exactly must be true for an Alpha?                                        | [`RELEASE-PLAN.md` §4.1](RELEASE-PLAN.md) — the criteria `A-01` … `A-14` with their verification path                        |
| Which criteria apply to **my** track on top of the common ones?                | [`RELEASE-PLAN.md` §4.1](RELEASE-PLAN.md), table "Per-track additions to the Alpha gate"                                     |
| What do I have to tick, in which order?                                        | [`RELEASE-CHECKLIST.md` §1 and §2](RELEASE-CHECKLIST.md)                                                                     |
| What is my artifact, how is it signed, what account do I need, what blocks me? | [`RELEASE-PLAN.md` §7](RELEASE-PLAN.md) — the build and signing profile per track                                            |
| Which version do I put on the artifact?                                        | [`RELEASE-PLAN.md` §5.6](RELEASE-PLAN.md)                                                                                    |
| Which core version and which bridge ABI may I use?                             | [`RELEASE-PLAN.md` §5.2 – §5.5](RELEASE-PLAN.md)                                                                             |
| What does the release record have to contain?                                  | [`RELEASE-PLAN.md` §6.3](RELEASE-PLAN.md) and [`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md) |
| Who decides, and who may refuse?                                               | [`RELEASE-PLAN.md` §6.1](RELEASE-PLAN.md) and [`../../AGENTS.md`](../../AGENTS.md)                                           |
| How do I roll a bad release back?                                              | [`RELEASE-PLAN.md` §6.4](RELEASE-PLAN.md)                                                                                    |
| How do I ship a hotfix?                                                        | [`RELEASE-PLAN.md` §6.5](RELEASE-PLAN.md)                                                                                    |
| What is still undecided?                                                       | [`RELEASE-PLAN.md` §10](RELEASE-PLAN.md) — the open owner decisions `OD-01` … `OD-14`                                        |

## How the plan relates to the rest of the documentation

| Relation                                                                           | Where                                                                          |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| The eight acceptance dimensions every gate is derived from                         | [`../../QUALITY.md`](../../QUALITY.md)                                         |
| The measurable quality targets (performance, bundle, coverage, contrast, keyboard) | [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md)                                   |
| The acceptance record format used for a release                                    | [`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md) |
| The roles that may block a release                                                 | [`../../AGENTS.md`](../../AGENTS.md) §3                                        |
| The milestones and the known gaps this plan addresses (`GAP-08`, `GAP-18`, `M8.4`) | [`../../ROADMAP.md`](../../ROADMAP.md)                                         |
| The requirement IDs a release names in its scope                                   | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md)                               |

## Three rules that are not negotiable

1. **A gate is green only with its evidence** — a command with its exit code, a
   test name, or a `file:line` reference. A line without a result is not
   ticked.
2. **No release on stubs.** A build that simulates the feature is not released
   as if it had it (`../../QUALITY.md` §10).
3. **No silent weakening.** A criterion that cannot be met is documented as
   not met, with a reason and an open gap — it is not quietly dropped.
