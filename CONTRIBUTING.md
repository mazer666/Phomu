# Contributing to Phomu

Thanks for building this with us. 🎵

Phomu is an open-source party game under **AGPL-3.0-or-later**. Contributions are
welcome — on condition that they meet the quality bar of the project.

**Before your first commit, please read:**

1. [`REQUIREMENTS.md`](REQUIREMENTS.md) — what the product must do
2. [`ARCHITECTURE.md`](ARCHITECTURE.md) — how it is built
3. [`AGENTS.md`](AGENTS.md) — the working rules (they apply to AI assistants as well)
4. [`WHERE_TO_CHANGE.md`](WHERE_TO_CHANGE.md) — where your change belongs

---

## 1. The quality bar

Before the merge, these checks must be green:

```bash
npm run typecheck          # TypeScript strict, without emit
npm run lint               # ESLint
npm run test               # Vitest with coverage
npm run check:i18n         # DE/EN complete and in parity
npm run check:doc-links    # every relative link resolves
npm run build              # production build
```

Additionally, when your change touches the catalogue:

```bash
npm run validate-songs     # schema and required fields of every song
npm run validate-catalog   # catalogue gate: packs, songs, duplicates, missing years
```

`npm run local-ci` runs everything in the order the CI runs it. A green local run
is the precondition for a claim like "it is done".

---

## 2. The test philosophy

Quality is secured on several layers:

| Layer | What it covers | Tool |
|---|---|---|
| **Unit** | utilities, parsers, queue logic, store logic, components | Vitest |
| **Static** | types, lint rules, formatting | `tsc`, ESLint, Prettier |
| **Data** | schema and completeness of the catalogue | `validate-song-*.ts` |
| **Structure** | module boundaries, file sizes, doc links, translation parity | `scripts/check-*.mjs` |
| **E2E** | the complete flow in a real browser | Playwright |
| **Build** | the production build must pass | `next build` |

### What a test must prove

- **Every behaviour change needs a test.** The test executes the behaviour, it
  does not imitate it.
- **Every hardening needs a negative test.** The test actually executes the
  attack: missing token, manipulated URL, oversized file, denied permission. A
  positive test suite alone proves nothing.
- **No omitted tests.** No `skip`, no `@Ignore`, no commented-out test to make
  the CI green. That is not negotiable.

---

## 3. The boundaries of a contribution

### No merge without a requirement

Behaviour is not changed "just like that". If your PR changes the product
behaviour, it needs:

- a requirement ID in `REQUIREMENTS.md` (create a new one or extend an existing one), and
- for material changes a change request under `docs/cr/`

### No merge without documentation

Documentation that your change makes obsolete is carried along **in the same
commit**. The mapping is in
[`docs/DOCUMENTATION_POLICY.md`](docs/DOCUMENTATION_POLICY.md). Concretely:

| You change | Then you update |
|---|---|
| behaviour | `REQUIREMENTS.md`, `docs/user-guide/USER-GUIDE.en.md` |
| structure or a boundary | `ARCHITECTURE.md`, and if needed an ADR in `docs/adr/` |
| constants, defaults, limits | `src/config/`, `REQUIREMENTS.md` |
| a milestone or its status | `ROADMAP.md`, `project/project.yaml` |
| interface texts | `src/i18n/locales/de.json` **and** `en.json` |

### One truth per number

Points, time limits, capacities and limits live in `src/config/`. Whoever
duplicates them in the code creates two truths — and a bug that surfaces
eventually and belongs to nobody.

---

## 4. The style

**Language.** Code, identifiers and commit messages are in English. The project
documentation is in English, the user guides exist twice.

**Names.** Descriptive, no abbreviations:

```text
bad:       x, tmp, data2, mgr, handleStuff()
good:      roundPhase, answersLocked, hintLevel, applyScoreDecay()
```

**Comments.** They explain the **why**, not the what. The code is written for
someone who does not know the project.

**Size.** Target `≤ 400` lines per hand-written file, hard limit `550`. Each file
has exactly one responsibility.

**Types.** TypeScript strict. No `any`, no `@ts-ignore`, no `as unknown as` as a
way around a model.

**Formatting.** `npm run format:check` must be green; Prettier decides, not
habit.

---

## 5. Privacy and security

Not negotiable:

- **Data minimisation first.** Store only what the game needs to be playable.
- **No secrets in the repo.** No API keys, no admin token, no `.env.local`. The
  admin token belongs in the environment:
  `npm run security:rotate-admin-token` writes it to `.env.local`.
- **No tracking or profiling data** without a documented purpose and opt-in.
  Phomu is a zero-telemetry project; see
  [`PRIVACY.md`](PRIVACY.md).
- **For AI-assisted content**: small requests, retry/queue instead of bursts,
  traceable evidence for hints, **no spoilers in the hints**.

If your PR breaks into one of the attack surfaces described in
[`SECURITY.md`](SECURITY.md), please say so beforehand — and send **no** exploit
details to open channels. The disclosure channel is there.

---

## 6. The content rules for the catalogue

- **No duplicates** (global strict) for new or updated songs.
- **Hints must be verifiable** (`hintEvidence`) and must contain neither artist
  nor title spoilers.
- **When in doubt**: `manual-review` instead of blind auto-publish.
- The catalogue gate `npm run validate-catalog` checks against a baseline and
  turns **red** on a regression. That is intentional.

---

## 7. Commit and pull request

**Commit messages** are in English, in Conventional Commits format:

```text
feat(game): add survivor mode scoring decay
fix(i18n): correct English plural form for player count
docs(requirements): add MEDIA-012 for provider fallback order
chore(catalog): clean up duplicate year coverage
```

**One PR** does **one** thing. It may change several files, but only one
purpose.

**The description** contains:

- **What** changed (file and line, not "the logic has been improved")
- **Why** (the requirement ID or the concrete reason)
- **The evidence** (command and real output, test name or file:line)
- **What did not work** (open points, deliberately not implemented)
- **What the owner has to decide** (one question, with options and a recommendation)

---

## 8. The PR checklist

- [ ] `npm run local-ci` passes green locally
- [ ] The new gates run green (`check:i18n`, `check:doc-links`, `check:file-size`)
- [ ] Every behaviour change has a test, every hardening a negative one
- [ ] `de.json` **and** `en.json` are maintained when texts are affected
- [ ] No secrets committed
- [ ] The documentation is updated in the same commit
- [ ] No invented numbers — every number has its command
- [ ] The game stays party-ready: no unnecessary dialog, no unnecessary
      frustration, no blocking of the flow

---

## 9. Questions

- **Behaviour question:** `REQUIREMENTS.md` first, then an issue.
- **Bug:** issue with reproduction steps, expected and actual behaviour, and the
  environment (Node version, browser).
- **Security vulnerability:** not as a public issue. The disclosure channel is in
  [`SECURITY.md`](SECURITY.md).
