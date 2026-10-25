# Phomu — Specification Folder (`docs/spec/`)

This folder holds the **specification of the multi-platform extension** of
Phomu: the family of applications that share one Rust base and carry
platform-specific frontends.

It is **not** the product specification. The behaviour of the game — the six
modes, the scoring, the lobby, the media providers, the catalogue, the security
promises — is specified in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) and is
**not** changed by this programme.

---

## 1. What is in this folder

| File                                                   | Purpose                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`SRS.md`](SRS.md)                                     | The Software Requirements Specification: purpose, scope, goals, system context, overall description, external interfaces, non-functional requirements, data requirements, UI attributes per platform, constraints, traceability, open points, and the list of contradictions with the existing requirements |
| [`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md) | The requirements of the extension, baseline P-1: **114 requirements** in seven domains, each with ID, requirement, rationale, acceptance and verification; plus the per-track acceptance matrices                                                                                                           |
| [`TRACEABILITY.md`](TRACEABILITY.md)                   | The traceability matrix: requirement → source → design document → ADR → test → acceptance document → track → status; plus the prioritised lists of the requirements without a test and without an acceptance document                                                                                       |
| [`README.md`](README.md)                               | This file: the index, the path from a requirement to its test and its acceptance, and the rules that apply to every document in this folder                                                                                                                                                                 |

### Documents outside this folder that belong to the same programme

| Document                                                                         | Owner         | Relation                                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/design/PLATFORM-ARCHITECTURE.md` (parallel, **not yet in the repository**) | Architect     | The structure of the core, the bridge and the shells — the _Design_ column of the traceability matrix points here                                                                                |
| `docs/design/BUILD-CONTRACT.md` (parallel, **not yet in the repository**)        | Architect     | Toolchain, build commands, signing, CI — referenced by `REL-*`, `BRIDGE-116`, `PERF-*`                                                                                                           |
| [`../releases/RELEASE-PLAN.md`](../releases/RELEASE-PLAN.md)                     | Release       | **Binding**: the tracks `T0`…`T5`, the binding order, the gates `A-01`…`A-14` / `B-01`…`B-12` / `S-01`…`S-12`, the versioning, the signing profile per track, the open decisions `OD-01`…`OD-14` |
| [`../licensing/APPLE-LICENSING.md`](../licensing/APPLE-LICENSING.md)             | Legal / Owner | The Apple distribution and licence strategy — a draft decision basis with the open decisions `D1`…`D8`; referenced by `SHELL-106`, `REL-108`, `REL-118`, `CORE-116`                              |
| [`../design/GAME-CONTRACT.md`](../design/GAME-CONTRACT.md)                       | Architect     | The round flow, the modes, the anti-spoiler boundary, the provider contracts — **binding** for the core as well                                                                                  |
| [`../acceptance/`](../acceptance/)                                               | QA            | The acceptance documents — the template is [`ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md)                                                                                      |

---

## 2. From a requirement to its test and its acceptance

The path is always the same, and it is the same path the product already uses:

```text
requirement  →  design  →  ADR  →  test  →  acceptance  →  decision
```

1. **Requirement.** Every behaviour of the extension has an ID in
   [`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md). An ID is never
   reused and never silently changed — a change to a requirement needs a change
   request ([`../cr/CR_TEMPLATE.md`](../cr/CR_TEMPLATE.md)).
2. **Design.** The _Design_ column of
   [`TRACEABILITY.md`](TRACEABILITY.md) names the document that carries the
   design. For the platform programme that is the platform architecture and the
   build contract; for the game behaviour it is the game contract.
3. **ADR.** A decision that moves a boundary gets an architecture decision
   record ([`../adr/ADR_TEMPLATE.md`](../adr/ADR_TEMPLATE.md)). The planned
   ADRs are numbered `ADR-0005` upwards in the traceability matrix.
4. **Test.** The _Test_ column names the test — either one that exists today
   (`existing:`) or one that has to be written (`to be written:` with the
   planned path and the planned test name).
5. **Acceptance.** The _Acceptance_ column names the acceptance document that
   closes the requirement. The documents follow the template of
   [`../acceptance/ACCEPTANCE_TEMPLATE.md`](../acceptance/ACCEPTANCE_TEMPLATE.md)
   and are named per track and per phase.
6. **Decision.** The acceptance ends in exactly one decision — `ACCEPTED`,
   `ACCEPTED WITH LIMITS` or `NOT ACCEPTED` — with a rationale and evidence
   ([`../../QUALITY.md`](../../QUALITY.md) § 9).

### The ID scheme of this folder

```
<DOMAIN>-<NNN>
```

| Domain   | Subject              | Range                       |
| -------- | -------------------- | --------------------------- |
| `CORE`   | The shared Rust base | `CORE-101` … `CORE-116`     |
| `SHELL`  | The frontends        | `SHELL-101` … `SHELL-120`   |
| `PLAT`   | Platform behaviour   | `PLAT-101` … `PLAT-122`     |
| `BRIDGE` | The FFI bridge       | `BRIDGE-101` … `BRIDGE-116` |
| `REL`    | The release process  | `REL-101` … `REL-118`       |
| `A11Y`   | Accessibility        | `A11Y-101` … `A11Y-110`     |
| `PERF`   | Performance budgets  | `PERF-101` … `PERF-112`     |

The platform extension uses the range **101–199** in every domain, because
[`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) already owns `CORE-001` …
`CORE-012` and the other ranges from 001. The result is that every ID in the
repository is globally unique.

### The tracks

| Track | Platforms                             | Order |
| ----- | ------------------------------------- | ----: |
| `T0`  | Web — stays and is extended           |     — |
| `T1`  | Android — phone and tablet            |     1 |
| `T2`  | Google TV / Fire TV                   |     2 |
| `T3a` | macOS                                 |     3 |
| `T3b` | Linux                                 |     3 |
| `T4`  | iPadOS and iOS                        |     4 |
| `T5`  | Windows and further operating systems |     5 |

The order is binding (`REL-101`): a track starts only when the previous track
has a green Stable release candidate.

---

## 3. The rules for the documents in this folder

These rules come from [`../DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md),
[`../../QUALITY.md`](../../QUALITY.md) and [`../../AGENTS.md`](../../AGENTS.md).

### 3.1 Rules that apply to every document here

1. **Every requirement carries the same five fields:** ID, requirement,
   rationale, acceptance, verification. A requirement without a verification
   is not a requirement.
2. **Every requirement is verifiable.** A verification is an existing test, a
   test to be written (with path and test name), a measurement command, or an
   acceptance check. "It works" is not a verification.
3. **Every number has a source.** A target value is written as a target with a
   measurement method. A measured value is written only with the command that
   produced it. No estimates.
4. **No acceptance on the basis of stubs, mock simulations or dummy return
   values** (`NFR-008`, `QUALITY.md` § 10.1).
5. **No weakened acceptance criteria.** What cannot be met is documented as
   "not met" with a rationale — not cut short (`QUALITY.md` § 10.2).
6. **No skipped tests.** No `skip`, no `@Ignore`, no commented-out test to make
   a gate green (`QUALITY.md` § 10.3).
7. **Refer, do not duplicate.** A rule that exists in the game contract or in
   the product requirements is referenced by ID, not copied. Duplication is how
   two documents drift apart.
8. **The code is the truth.** Where a document and the code disagree, that is a
   finding, reported with `file:line` — not a reason to edit the document
   quietly (`CORE-009`).
9. **One subject per document.** This folder specifies the **extension**. The
   product behaviour stays in [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md).

### 3.2 Language

The documents in this folder are written in **English**, because they specify a
technical extension with several readers (architect, QA, release, external
contributors) and they use the English identifiers of the code. The rest of the
project documentation remains German (`CORE-012`). This deviation from the
documentation policy is recorded as **OPEN-02** in
[`SRS.md`](SRS.md#12-open-points) and awaits the owner's decision.

### 3.3 What a change to this folder has to look like

| Kind of change                 | What has to happen                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A new requirement              | A new ID in the next free number of its domain, with all five fields, plus a row in the traceability matrix                                            |
| A changed requirement          | The change is documented in the requirement itself; a change that alters a product behaviour additionally needs a change request in [`../cr/`](../cr/) |
| A changed acceptance criterion | Never weaker without a change request and a written rationale                                                                                          |
| A new design document          | A row in the traceability matrix points at it                                                                                                          |
| A new test                     | The _Test_ cell of the row changes from `to be written:` to `existing:` with the path and the test name                                                |
| A closed acceptance            | The acceptance document appears under [`../acceptance/`](../acceptance/) and the row names it                                                          |

---

## 4. How to read the four documents

| If you want to know                                             | read                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| What the programme is and what it is not                        | [`SRS.md`](SRS.md) § 1                                     |
| What is measurable about it                                     | [`SRS.md`](SRS.md) § 2                                     |
| How the product interacts with its surroundings                 | [`SRS.md`](SRS.md) § 3                                     |
| Which platform requirements apply to which track                | [`SRS.md`](SRS.md) § 4.6                                   |
| Which external interfaces exist — and which deliberately do not | [`SRS.md`](SRS.md) § 6                                     |
| What the budgets are and how they are measured                  | [`SRS.md`](SRS.md) § 7.1                                   |
| Where the state, the catalogue and the session live             | [`SRS.md`](SRS.md) § 8                                     |
| What the decisions are that the owner still has to make         | [`SRS.md`](SRS.md) § 12                                    |
| What contradicts the existing requirements                      | [`SRS.md`](SRS.md) § 13                                    |
| What exactly has to be built                                    | [`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md)     |
| What the acceptance of a track looks like                       | [`REQUIREMENTS-PLATFORM.md`](REQUIREMENTS-PLATFORM.md) § 8 |
| Where a requirement is tested and accepted                      | [`TRACEABILITY.md`](TRACEABILITY.md) § 2 … § 8             |
| Which requirements still have no test                           | [`TRACEABILITY.md`](TRACEABILITY.md) § 10                  |
| Which requirements still have no acceptance document            | [`TRACEABILITY.md`](TRACEABILITY.md) § 11                  |

---

## 5. Known gaps of this baseline

The baseline is honest about what does not exist yet:

| Gap                                           | Size                                                                     | Where it is tracked                         |
| --------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| Requirements without an executable test       | 108 of 114                                                               | [`TRACEABILITY.md`](TRACEABILITY.md) § 10   |
| Requirements without an acceptance document   | 114 of 114                                                               | [`TRACEABILITY.md`](TRACEABILITY.md) § 11   |
| Open owner decisions                          | 10                                                                       | [`SRS.md`](SRS.md) § 12                     |
| Contradictions with the existing requirements | 16 (10 of them against [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md)) | [`SRS.md`](SRS.md) § 13                     |
| Design documents of the parallel work         | not yet delivered                                                        | [`TRACEABILITY.md`](TRACEABILITY.md) § 11.1 |

None of these gaps is filled by a statement in this folder. They are filled by
code, by tests and by acceptance documents — the same rule that applies to the
rest of the project.
