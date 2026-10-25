# Phomu Project Management

How Phomu is run: milestones, risks, decisions and documentation.

The binding product content is in [`REQUIREMENTS.md`](REQUIREMENTS.md) and
[`ARCHITECTURE.md`](ARCHITECTURE.md). This document describes the **process**
around it.

---

## 1. The basic model

Phomu works in **milestones**. A milestone is a completed, provable state — not a
work package.

Every milestone has:

- a purpose (in one sentence)
- explicit **non-goals**
- acceptance criteria across all eight dimensions from [`QUALITY.md`](QUALITY.md)
- QA evidence (test name, command output or file:line)
- a release decision

A milestone counts as reached **when** the evidence exists. A tick in a checklist is
not evidence. What is not evidenced is “in progress” — even if the code already
looks finished.

The current status is in [`ROADMAP.md`](ROADMAP.md). The machine-readable version
is in [`project/project.yaml`](project/project.yaml) and is the single source of
truth for machine evaluation; the Markdown files refer to it.

---

## 2. Status discipline

A status is never estimated. For every claim the following applies:

| Claim | Admissible evidence |
|---|---|
| “implemented” | existing code **and** a test that executes the behaviour |
| “green” | real command output with number of tests, number of errors and duration |
| “done” | acceptance evidence under [`docs/acceptance/`](docs/acceptance/) |
| “fast” | a measurement with the command that produced it |
| “secure” | a negative test that executes the attack |

What was not measured is reported as **“not measured”**. What did not run is
reported as **“NOT RUN”** with the exact reason. Both are a valid result. An
invented number is not.

---

## 3. Change Requests

Material changes to behaviour, scope or requirements go through a change request
under [`docs/cr/`](docs/cr/):

```text
CR-0001-dokumentations- und-agentenstruktur-reform.md
```

A CR answers: what triggers it, which requirements are affected, what changes, why,
and how it is rolled back. Without a CR the following applies: **the behaviour does
not change**.

---

## 4. The risk register

The register is part of the milestone completion and is updated with every
milestone. Format:

| Risk | Likelihood | Impact | Countermeasure | Owner | Status |
|---|---|---|---|---|---|

The three risk classes that Phomu keeps hitting:

1. **Catalogue quality.** The catalogue grows; a song can violate the schema and
   the duplicate rules. Countermeasure: the gate
   `npm run validate-catalog`, which checks against a baseline and turns red on a
   regression.
2. **Spoiler leak.** The anti-spoiler protection is a product promise. Every new
   interface must check whether title, artist or cover reaches the DOM before the
   locking.
3. **Provider outage.** YouTube, Spotify, Amazon and Apple do not guarantee
   availability. Countermeasure: the fallback to the next source must be documented
   and tested per mode.

---

## 5. Decisions

Architecture decisions are recorded as **ADR** under [`docs/adr/`](docs/adr/):
status, date, context, decision, consequences, rejected alternatives.

Product decisions are recorded as **CR** under [`docs/cr/`](docs/cr/).

Both number ranges are consecutive. An existing file is **never** overwritten — a
new decision replaces an old one through a new file that references the old one.

---

## 6. The agent structure

Phomu works with eight roles, which are described in [`AGENTS.md`](AGENTS.md):

| Role | Responsibility |
|---|---|
| ROLE-01 Product & Requirements Steward | product intent, requirement IDs, scope |
| ROLE-02 Chief Architect | module boundaries, dependency direction, ADRs |
| ROLE-03 Game Engine Engineer | game modes, round logic, scoring, state |
| ROLE-04 UI/UX Engineer | interface, themes, projector, accessibility |
| ROLE-05 Internationalization Engineer | DE/EN completeness, plural and format rules |
| ROLE-06 QA & Test Engineer | test coverage, CI gate, acceptance evidence |
| ROLE-07 Security & Privacy Manager | threat model, admin API, privacy |
| ROLE-08 Documentation Lead | documentation, glossary, user guides DE/EN |

Agents are roles, not a change of course. A role can block a change — the reason
is in the role description. The decision about a blocked change is made by the
owner.

---

## 7. Documentation management

### The same-change rule

A code or configuration change is **incomplete** when it leaves the documentation
outdated. That is why the update belongs in the **same** commit:

| Change | Document that follows |
|---|---|
| Behaviour | `REQUIREMENTS.md` (if applicable via CR), `docs/user-guide/` |
| Structure or boundary | `ARCHITECTURE.md` (if applicable ADR), `WHERE_TO_CHANGE.md` |
| Default or limit | `src/config/`, `REQUIREMENTS.md` |
| Milestone or status | `ROADMAP.md`, `project/project.yaml` |
| Quality or test gate | `QUALITY.md`, `docs/acceptance/` |
| Translation | `src/i18n/locales/de.json` **and** `en.json` |

### One truth per number

Every constant, every metric and every limit is defined in exactly one place. The
other documents refer to it. Exceptions are documented: the catalogue size is
**measured** and named in the README, the rules of the product are in
`src/config/game-config.ts`.

### The language rule

| Level | Language |
|---|---|
| Project documentation | English |
| Code, identifiers, comments, commit messages | English |
| User guides | German **and** English, two files |
| User interface | German first, English complete |

### Old versions

Historical documents are **not** deleted, but moved to `specifications/archive/` and
versioned there with a date stamp in the file name. `specifications/` itself
contains the predecessors of the current documentation; every old version has a
counterpart in the new set, and the mapping is in
`specifications/archive/README.md`.

---

## 8. The handover report

Every work round ends with a report to the owner:

1. **What** changed (file, line)
2. **Which requirement** (ID)
3. **The evidence** (command + output, test name or file:line)
4. **What did not work** (open points, deliberately not implemented)
5. **What the owner must decide** (one question, with options and a recommendation)

Without evidence it is a claim. Without a claim it is nothing.
