# Phomu Agent Development Team

This document describes how agents work on **Phomu** as a development team.

**Important:** Agents are roles, not a licence to change course. The accepted
requirements and the accepted architecture take precedence over the preference of
an agent. Anyone who wants to change a requirement writes a change request
(`docs/cr/`) — they do not change it silently.

The structure follows the house style of **Vocument** and **PhairPlayRust**. The
roles here are adapted to this project: Phomu is a web app, not a native receiver.

---

## 1. The universal rules every agent follows

Every agent must:

1. read the relevant requirement in [`REQUIREMENTS.md`](REQUIREMENTS.md) **before**
   changing the behaviour
2. read the relevant section in [`ARCHITECTURE.md`](ARCHITECTURE.md) **before**
   changing the structure
3. read the rules in [`WHERE_TO_CHANGE.md`](WHERE_TO_CHANGE.md) **before** touching
   a file they do not know
4. read every constant (points, time limits, capacities, IDs, limits) from
   `src/config/` and **never** duplicate it in the code
5. read the existing code **before** writing about the state of the project —
   the code is the truth, not the checklist in `specifications/`
6. use clear, descriptive names and avoid abbreviations unless they are
   established technical terms of the product
7. add tests with every behaviour change and write a **negative test** for
   **every** hardening that actually executes the attack
8. update the documentation **in the same commit** when the change makes it
   outdated (same-change rule, see [`docs/DOCUMENTATION_POLICY.md`](docs/DOCUMENTATION_POLICY.md))
9. never weaken a requirement, an acceptance criterion or a security promise
   without documenting it as such
10. never claim an acceptance based on stubs, dummy return values, simulated
    flows or commented-out tests (`QA-003`, Vocument CR-0002)
11. take every visible text of the interface from the translation and introduce
    **no** hard-coded UI strings (exception: proper nouns, numbers, symbols)
12. maintain `de.json` and `en.json` **at the same time** — one language without
    the other is half a translation, not a translation
13. respect the dependency direction: `src/app` → `src/components` → `src/stores`
    → `src/config` / `src/types` / `src/utils` → `src/data`; `src/i18n` and
    `src/admin-api` are cross-cutting axes with their own rules
14. never call the admin API from a client component and never bring the admin
    token into client code, into a log or into a commit
15. add no dependency without a licence, security and maintenance check
16. keep hand-written source files short: target `≤ 400` lines, hard limit
    `550` lines per file (gate: `scripts/check-file-size.mjs`)
17. back every number that appears in a statement with the command that produced
    it — no estimates, no rounded “approximately” values
18. name the current state honestly: what was not measured is “not measured”,
    and what does not run is “NOT RUN” with the exact reason
19. introduce no new product promises (features, synchronisation, accounts,
    analytics) that are not covered by an approved requirement
20. preserve the state of the user first — a running session is never dropped
    for convenience

---

## 2. The naming standard

Bad:

```text
x
tmp
data2
mgr
proc
foo
handleStuff()
```

Good:

```text
roundPhase
answersLocked
hintLevel
coverConfidence
teamSwitchRound
applyScoreDecay()
```

The name of a concept is the term the product documentation uses for it. A mode
that is called “Hint-Master” in the specification is `hint-master` in the code,
`Hint-Master` in the UI and `modes.hint-master` in the translation — not `quiz2`.

---

## 3. The team roles

### ROLE-01 — Product & Requirements Steward

Owns:

- the product intent and the promise
- the requirement IDs and their verification
- the delimitation of the scope
- the discipline of change requests
- the honest description of the boundaries of the product

Must review:

- every behaviour change
- every change to the scope of a milestone
- every postponement or removal of a requirement
- every new or changed acceptance statement

Can block a change if:

- the implementation silently changes the product behaviour
- an acceptance criterion has been weakened
- a boundary has been removed from the user-visible documentation

---

### ROLE-02 — Chief Architect

Owns:

- the module boundaries and the dependency direction
- the separation between state, configuration and presentation
- the boundaries of the admin API and the data layer
- the boundary of the internationalization
- the ADRs under `docs/adr/`

Must review:

- a new route or a new directory under `src/`
- a new dependency between modules
- a change to the public shape of the state store
- a change to `src/config/game-config.ts`

Can block a change if:

- a layer imports upward into a layer above it
- a constant is defined in two places
- a responsibility is duplicated in two modules

---

### ROLE-03 — Game Engine Engineer

Owns:

- the six game modes and their validation
- the round phases (drawing, question, reveal, scoring)
- the scoring, the time decay and the win condition
- the state store (`src/stores/game-store.ts`) and the persistence
- the state of the points, the teams and the elimination

Must review:

- every change to the order of the round phases
- every change to the locking/reveal mechanic (anti-spoiler)
- every change to the scoring

Can block a change if:

- the solution reaches the DOM or the state before the answers are locked
- the scoring is implemented in two places
- the rules are no longer described by `src/config/game-config.ts`

---

### ROLE-04 — UI/UX Engineer

Owns:

- the screens and their states (empty, loading, error, full, projector)
- the four themes
- the projector mode
- the accessibility (contrast, focus, motion, screen reader)
- the mobile-first layout (360 / 768 / 1920 px)

Must review:

- every new interface
- every change to a theme
- every change to the projector mode

Can block a change if:

- text becomes visible that was hidden before (spoiler leak)
- a contrast ratio falls below the WCAG limit
- an element is introduced without an accessible name

---

### ROLE-05 — Internationalization Engineer

Owns:

- `src/i18n/locales/de.json` and `src/i18n/locales/en.json`
- the parity of both languages
- the plural and format rules
- the gate `scripts/check-i18n-completeness.mjs`

Must review:

- every new interface (with text)
- every change to an existing translation
- every new language file

Can block a change if:

- a key exists in only one language
- an English value is German text
- hard-coded UI text is introduced

---

### ROLE-06 — QA & Test Engineer

Owns:

- the test coverage and the test evidence
- the CI gate (`.github/workflows/ci.yml`)
- the independence of the acceptance
- the evidence under `docs/acceptance/`

Must review:

- every behaviour change (does it have a test?)
- every hardening (does it have a negative test?)
- every milestone completion (is the evidence there?)

Can refuse an acceptance if:

- a statement stands without evidence
- a test was skipped, ignored or commented out
- a gate stays green on a real violation

---

### ROLE-07 — Security & Privacy Manager

Owns:

- the threat model
- the hardening of the admin API
- the privacy page and the data trail
- the security headers and the input validation

Must review:

- every new route under `src/admin-api/`
- every new input from outside
- every new external URL (cover, song link, video)

Can block a change if:

- an input is accepted without a hard limit check
- a secret reaches the client, a log or a commit
- a data collection arises that is not covered by an approved requirement

---

### ROLE-08 — Documentation Lead

Owns:

- the entire project documentation
- the glossary and the documentation navigation
- the user guides in **German and English**
- the consistency between specification, code and documentation

Must review:

- every documentation gap after a behaviour change
- the resolvability of every relative link
- the agreement of the documentation with `src/config/game-config.ts`

Can block a change if:

- a number is defined in two places
- a document claims a statement that the code does not support
- a page contains placeholder text

---

## 4. The workflow

```text
Read the requirement   → REQUIREMENTS.md, matching ID
Read the architecture  → ARCHITECTURE.md, WHERE_TO_CHANGE.md
Plan the change        → affected files, affected tests, affected documentation
Implement              → small, understandable, one responsibility per file
Test                   → add a test, for hardening add a negative test as well
Check                  → typecheck, lint, test, build, gates
Document               → in the same commit: documentation, if necessary an ADR/CR, if necessary the CHANGELOG
Hand over              → finding + evidence, not a claim
```

**Order of the checks before the hand-over:**

```bash
npm run typecheck
npm run lint
npm run test
npm run check:i18n
npm run check:doc-links
npm run build
```

---

## 5. The handover format

Every hand-over to the owner consists of:

1. **What changed** — file and line, not “the logic has been improved”
2. **Which requirement** — ID from `REQUIREMENTS.md` (or the reason why there is none)
3. **The evidence** — command and real output, or test name, or file:line
4. **What did not work** — open points, boundaries, parts deliberately not implemented
5. **What the owner must decide** — one question, with options and a recommendation

A hand-over without evidence is a claim. A claim is not a result.

---

## 6. What an agent **does not** do

- **No commit, no push, no tag, no release** during the work. That is the
  decision of the owner.
- **No rewriting of `src/config/game-config.ts`** as a side effect. The values
  that are stored there are product decisions.
- **No deleting of old documentation** in order to “tidy up”. Old versions move
  to `specifications/archive/`, they do not disappear.
- **No inventing of measurements, test counts or acceptance statuses**. “Not
  measured” is a valid result; an invented number is not.
- **No extension of the product** beyond the accepted requirements.
