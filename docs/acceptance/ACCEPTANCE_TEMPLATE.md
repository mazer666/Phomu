# Acceptance — FEATURE / MILESTONE

**Requirement IDs:**
**Build / Commit:**
**Testing roles:**
**Date:**
**Environment:** (Node version, npm version, operating system, browser)

> **Evidence rule — binding.**
>
> Every statement in this document needs **concrete evidence**:
>
> - a **test name** (the test is quoted, not called "unit tests"),
> - a **command output** (command + exit code + the decisive line),
> - or a **file:line** reference in the repository.
>
> An "implemented", "green", "done" without evidence is **not** a valid
> result. What was not measured is entered as **NOT RUN** with a reason
> — never as passed. Stubs, mock simulations and dummy returns do not count
> as evidence (`NFR-008`).
>
> **Pass condition:** A milestone is only accepted when **all** gates of this
> section are fulfilled. Partial acceptances are possible, but they are named
> as such.

---

## 1. Functional

Every behaviour rule that this milestone touches.

| Scenario | Expectation | Result | Evidence |
|---|---|---|---|
| | | | |

**Rule:** A scenario without an observable result is not a scenario. A
scenario whose result is "works" has not been tested.

---

## 2. Technical

- Architecture boundaries respected: yes / no / partly — Evidence:
- Central configuration respected (`src/config/game-config.ts`): yes / no — Evidence:
- Tests green: yes / no / partly — Evidence:
- Migration / versioning checked: yes / no / not applicable — Evidence:
- Type check: yes / no — Evidence:
- Lint: yes / no — Evidence:
- File size gate: yes / no / **NOT RUN** — Evidence:
- New gates present and runnable: … — Evidence:

---

## 3. Performance

| Metric | Budget | Measured | Result |
|---|---:|---:|---|
| | | | |

**Reference hardware / input:**
**Method:** (which command, which run, how many runs)

> A budget without a measured value is a statement of intent, not a result. If a
> budget is not defined, this says **"budget not defined"** — not an
> estimated number.

---

## 4. Usability

- Number of steps for the main task:
- Discoverability (what is visible, what is not):
- Behaviour on mobile / native:
- Touch targets, focus order, contrast:
- Screen readers (VoiceOver / TalkBack):
- Visual details / open defects:
- **NOT RUN** items with reason:

---

## 5. Security/Privacy

- New stored data:
- Network access (outgoing / incoming):
- Negative tests (which ones, with test name):
- Threat notes:
- What was **not** tested:

---

## 6. Interoperability

- Reopening / reading back the data:
- Third-party viewers / editors / devices:
- Roundtrip (write → read → write):
- Integrity of saves and restores:
- Formats, versions, external systems:

---

## 7. Known limitations

Every known limitation that affects the user or the operator —
here and not only in the fine print.

| ID | Limitation | Effect | Tracked in |
|---|---|---|---|
| | | | |

---

## 8. Decision

**accepted / rejected / accepted with documented limitation**

Rationale, conditions, open points with owner and date. What happens after the
decision (follow-up ticket, next milestone, requirement IDs).
