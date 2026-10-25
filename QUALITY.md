# Phomu Quality and Acceptance Model

A Phomu feature is not “done” because the happy path worked once.

Every substantial feature is accepted across **eight dimensions**. The model is
modelled on the Vocument house style, but adapted to the reality of a web app:
there is no native bridge, but there is browser autoplay, client state and a
local admin tool. The server-side admin API is a separate matter: it is
hardened, but it is **not reachable** in the delivered build
([`SECURITY.md`](SECURITY.md) §5 item 1).

---

## 1. Functional acceptance

Questions:

- Does the feature do what the requirement says?
- Are preset, optional and later behaviour correct?
- Are the edge cases defined? (empty catalogue, empty player list, aborted
  round, timeout, a single device as the player driver)
- Is the scoring correct? Is the win condition correct?
- Does the anti-spoiler protection hold in **every** phase?

Evidence:

- acceptance scenarios
- automated tests (Vitest, Playwright)
- manual test notes where automation is unsuitable

Evidence that does **not** count:

- “The button is there”
- a screenshot without a described flow
- a test that imitates the feature instead of executing it

---

## 2. Technical acceptance

Questions:

- Are the module boundaries from [`ARCHITECTURE.md`](ARCHITECTURE.md) respected?
- Does every constant live in exactly one place (`src/config/`)?
- Is TypeScript strict respected — without `any`, without `@ts-ignore`?
- Is every new file shorter than 400 lines (hard: 550)?
- Is the feature really implemented and not simulated (`QA-003`)?
- Do the generated bindings stay generated (here: the bindings are Next.js — the
  rule applies: no hand-maintained copies of library code)?
- Does the state stay correct after a reload — and does it stay **not** correct
  where it must not be (anti-spoiler state)?

Evidence:

- architecture review
- tests that execute the real flows
- static analysis (`npm run typecheck`, `npm run lint`)
- output of the gates (`npm run check:i18n`, `npm run check:doc-links`, `npm run check:file-size`)

---

## 3. Performance acceptance

Questions:

- Is the start of the app within the budget?
- Is the transition between the round phases noticeably fast?
- Does the interface stay responsive with 24 players and a large catalogue?
- Does the memory footprint stay bounded (images, audio, catalogue in the bundle)?
- Are large data sets (catalogue, covers) not loaded into the client unchecked?

Evidence:

- a reproducible measurement
- reference device and reference data set
- the result is filed with the milestone

**Never write “fast” without a measurement.** Without a measurement it says
“not measured”.

---

## 4. Usability acceptance

Questions:

- Does a new player find the common path without a tutorial?
- Is the default calm and not overloaded?
- Is the role of the device driver (pilot) clear?
- Is the way out of every dead end visible (cancel, back, end of the game)?
- Are the game modes distinguishable without reading the instructions?
- Do the controls work on a phone, not only on a desktop?

Evidence:

- a task run-through with the number of steps
- visual check in all four themes
- check at 360 / 768 / 1920 px width
- accessibility check (contrast, focus, motion, screen reader names)

---

## 5. Security and privacy acceptance

Questions:

- Does the feature create new network access?
- Does the feature create new user data — and where does it stay?
- Are the admin endpoints protected, with **hard** limits and without
  “fail open”?
- Are inputs and external URLs checked?
- Are secrets never written into the client, into a log or into a commit?
- Is the data trail described, including how to delete it?

Evidence:

- **negative tests** that execute the attack (missing/wrong token,
  manipulated URL, file too large, rate limit exceeded)
- the threat model in [`SECURITY.md`](SECURITY.md)
- the privacy page [`PRIVACY.md`](PRIVACY.md)

---

## 6. Internationalization acceptance

Questions:

- Is every visible text taken from the translation?
- Are `de.json` and `en.json` completely parallel?
- Are the English values **real** English texts?
- Are numbers and data formatted in the active language?
- Are plural forms present in both languages?

Evidence:

- `npm run check:i18n` (green)
- the negative test of the gate: an intentionally deleted key turns it red

---

## 7. Interoperability acceptance

Questions:

- Does the page work without cookies, without an account, without the cloud?
- Do the external media sources (YouTube, Spotify, Amazon, Apple) work with
  broken or blocked links — with a fallback to the next source?
- Does the print layout work with the reference printer and at the reference
  resolution?
- Does the QR card work outside the app itself (as a printed medium)?

Evidence:

- test with the third party disabled
- documented fallback path per mode
- test print sheet

---

## 8. Documentation acceptance

Questions:

- Is the requirement captured in [`REQUIREMENTS.md`](REQUIREMENTS.md) with ID,
  rationale, acceptance and verification?
- Was the documentation updated in the same commit?
- Do the numbers in the documentation match the code?
- Does every relative link resolve?

Evidence:

- `npm run check:doc-links` (green)
- the diff of the documentation in the same commit

---

## 9. The acceptance decision

At the end there is exactly one decision, with a rationale:

| Decision | Meaning |
|---|---|
| `ACCEPTED` | All gates of dimensions 1–8 are met and evidenced |
| `ACCEPTED WITH LIMITS` | met, but with named, accepted boundaries |
| `NOT ACCEPTED` | at least one gate not met — with a rationale and an open gap |

A decision without evidence is not a decision.

---

## 10. The hard limits

These rules are not negotiable:

1. **No acceptance on the basis of stubs, mock simulations or dummy return
   values.** (`QA-003`, Vocument CR-0002.) A feature that only pretends to
   exist is not accepted — it is not implemented.
2. **No weakened acceptance criteria.** What cannot be met is documented as
   “not met” with a rationale, not cut short.
3. **No `skip`, no `@Ignore`, no commented-out test** to make a gate green.
4. **No invented numbers.** A test count without a test run, a measurement
   without a command, a contrast value without a calculation — all invalid.
5. **An incomplete report is an error**, not a partial success. If part of the
   review could not take place, the result is “not accepted”.
6. **A green gate proves only what it checks.** Every gate has its negative
   test.
