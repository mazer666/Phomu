# LLM.md — Phomu in brief

This file is the **entry map** for an AI assistant. It contains no specification,
but says where the specification stands and which rules are non-negotiable.

The binding truth lies in three files:

| Question | File |
|---|---|
| What must the product do? | [`REQUIREMENTS.md`](REQUIREMENTS.md) |
| How is it built? | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| When is something considered done? | [`QUALITY.md`](QUALITY.md) |

The working rules for agents are in [`AGENTS.md`](AGENTS.md). **Read them before
you change code.**

---

## What Phomu is

Hybrid music party game. Physical QR cards (59 × 91 mm + 3 mm bleed) plus web
app. One round on one device, led by one person (the "pilot"). 1–24 players,
solo play or fixed or shifting teams. Six game modes: Timeline, Hint-Master,
Lyrics Labyrinth, Vibe-Check, Survivor, Cover Confusion.

**Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 ·
Zustand (persist in localStorage) · i18next · Vitest + Playwright · GPL-3.0.**

---

## The six rules that come up most often

1. **Constants come from `src/config/`.** Points, time limits, capacities,
   limits. Never duplicate them in the code. `src/config/game-config.ts` is the
   truth.
2. **The anti-spoiler protection is sacred.** Before the answers are locked, no
   title, no artist and no album cover may be in the DOM or in the state. That
   applies to the task metadata as well, not only to the visible text.
3. **Every visible text comes from the translation.** `de.json` and `en.json`
   are always maintained together. No hardcoded UI strings. Proper nouns
   (Spotify, YouTube, Jackbox) are the exception.
4. **No acceptance on the basis of stubs.** A function that only pretends to
   exist is not implemented. No `skip`, no `@Ignore`, no commented-out test to
   make a gate green.
5. **No invented numbers.** Every number needs the command that produced it.
   What was not measured is "not measured".
6. **The documentation is created in the same commit.** See
   [`docs/DOCUMENTATION_POLICY.md`](docs/DOCUMENTATION_POLICY.md).

---

## The style of the project

The code is **English**, the documentation is **English**. Identifiers are
descriptive, abbreviations are not allowed unless they are established technical
terms:

```text
bad:       x, tmp, data2, mgr, handleStuff()
good:      roundPhase, answersLocked, hintLevel, applyScoreDecay()
```

Comments explain the **why**, not the what. The code is written for someone who
does not know the project — one explanatory line is better than a cryptic one.

Rules for size: target `≤ 400` lines per hand-written file, hard limit `550`.
Each file has exactly one responsibility.

---

## Before the first commit

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run check:i18n
npm run check:doc-links
npm run build
```

The order is the order of the CI. Whoever only runs part of it cannot claim the
project is green.

---

## What you **do not** do

- You do not change the product behaviour without an approved requirement
  (see `docs/cr/`).
- You do not push, you do not tag, you do not publish. That is the owner's
  decision.
- You invent no numbers, no test results, no acceptance status.
- You do not delete documentation to tidy up. Old states move to
  `specifications/archive/`.

---

## The index

| Topic | File |
|---|---|
| Requirements | [`REQUIREMENTS.md`](REQUIREMENTS.md) |
| Architecture | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Milestones | [`ROADMAP.md`](ROADMAP.md) |
| Quality | [`QUALITY.md`](QUALITY.md) |
| Where to change what | [`WHERE_TO_CHANGE.md`](WHERE_TO_CHANGE.md) |
| Technical terms | [`GLOSSARY.md`](GLOSSARY.md) |
| Agent roles | [`AGENTS.md`](AGENTS.md) |
| Project state | [`project/project.yaml`](project/project.yaml) |
| Documentation index | [`docs/README.md`](docs/README.md) |
| Guide for players | [`docs/user-guide/USER-GUIDE.en.md`](docs/user-guide/USER-GUIDE.en.md) |
| Security | [`SECURITY.md`](SECURITY.md) |
| Privacy | [`PRIVACY.md`](PRIVACY.md) |

The detailed AI context of the earlier version ("LLM.md — The Master
Specification") is still preserved as an archive state under
[`specifications/archive/LLM_archivstand_2026-10-25.md`](specifications/archive/LLM_archivstand_2026-10-25.md).
It is **historical** — it contains statements that are no longer true.
