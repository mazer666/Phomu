# Documentation rules

Documentation is part of the product. This file says **how** it is written,
when a change obliges you to change it, and what is deliberately not documented.

The rules are not negotiable, but they are also not complicated: **Every
statement in the documentation must be verifiable in the code, and every change
in the code must carry the documentation along.**

---

## 1. The same-change rule

A code or configuration change is **incomplete** if it leaves any documentation
stale. The update happens in the **same commit** — not as a follow-up commit,
not as a ticket.

| You change | Then you update |
|---|---|
| The behaviour of the game | [`../REQUIREMENTS.md`](../REQUIREMENTS.md) (for a material change additionally `docs/cr/`) and both user guides |
| Structure, boundaries, dependency direction | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (for a material change additionally `docs/adr/`) and [`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md) |
| Constants, defaults, limits | `src/config/` **and** the source locations that name this number |
| a game mode | `REQUIREMENTS.md` (domain `GAME`), `docs/user-guide/USER-GUIDE.en.md`, `docs/BEST_IN_CLASS.md` |
| Texts of the interface | `src/i18n/locales/de.json` **and** `en.json` |
| the catalogue | the catalogue report (`npm run validate-catalog:report`), not the numbers in the README |
| the architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md), for a moved boundary an ADR |
| a milestone or its status | [`../ROADMAP.md`](../ROADMAP.md) and `project/project.yaml` |
| a check or a gate | [`../QUALITY.md`](../QUALITY.md), [`BEST_IN_CLASS.md`](BEST_IN_CLASS.md) and `docs/acceptance/` |

**The test:** If someone reads only the diff, they must be able to recognise
that the documentation was changed as well. A diff that touches only `src/` is
almost always incomplete.

---

## 2. Single Source of Truth

Every number, every name, every rule has **exactly one** source. All other
documents refer to it instead of repeating it.

| What | The one source | All others write |
|---|---|---|
| Points, time limits, capacities, limits | `src/config/game-config.ts` | "according to `PHOMU_CONFIG`" — not the number |
| Game modes and their mechanics | `src/components/game/modes/<Mode>Mode.tsx` and `REQUIREMENTS.md` | Reference to the requirement ID |
| Phases of the flow | `src/types/game-state.ts` (`RoundPhase`) | Reference to `GAME-001` |
| Meanings of the domain terms | [`../GLOSSARY.md`](../GLOSSARY.md) | Reference to the term |
| Requirements and their IDs | [`../REQUIREMENTS.md`](../REQUIREMENTS.md) | Reference to the ID |
| Machine-readable project state | `project/project.yaml` | Reference to the field |
| Measured quality values | [`BEST_IN_CLASS.md`](BEST_IN_CLASS.md) | Reference to the target |
| Historical snapshots | `specifications/archive/` | "see the archived state of …" |

**What that means in practice:** If you change `DEFAULT_TIMELINE_MAX_POINTS`,
you change **one** number in **one** file. The user guide then describes the
principle ("the points are capped"), but not the value 5. Two documents that
name the same number are two truths — and exactly at that seam the errors
arise.

**Exception:** The two user guides (DE and EN) carry the same numbers. That is
deliberate and not duplication: they are the **same** source in two languages
and must stay in sync.

---

## 3. The language rule

| Level | Language |
|---|---|
| Project documentation (root and `docs/`) | **English** |
| User guides (`docs/user-guide/`) | **English**, one file per language |
| Code, identifiers, comments, commit messages | **English** |
| Interface (`src/i18n/locales/`) | **German first, English complete** |
| ADR and CR | **English** |

**The language rules in short form:** code in English, project documentation in
English, user guides in English, the user interface German-first with a
complete English translation.

**No document mixes the languages at sentence level.** A German sentence, an
English sentence, a German sentence — that is an error, not a style.

Identifiers stay English, also in the German user guide and in the German
interface texts: `PHOMU_CONFIG`, `useGameStore`, `RoundPhase`, `answersLocked`.
German words in identifiers only when they are established domain terms
(`useGameStore` is called that because `GameStore` is).

**English editions are real translations.** `en.json` gets no copy of the
German values, and the English edition of the user guide is not a German
edition with English headings. Proper nouns — Spotify, YouTube, Jackbox,
Phomu, the mode names — stay identical in both languages.

---

## 4. Requirement IDs

The scheme is `<DOMAIN>-<NNN>`: three digits, consecutive per domain, **never
reused**.

| Domain | Content |
|---|---|
| `CORE` | Product principles, ground rules |
| `GAME` | Game modes, round logic, points, rules |
| `LOBBY` | Lobby, players, teams, session, QR/cards |
| `MEDIA` | Music provider, anti-spoiler, playback |
| `UI` | Interface, themes, projector, accessibility |
| `I18N` | Internationalization |
| `CAT` | Song catalogue, packs, data quality |
| `SEC` | Security, privacy, admin API |
| `NFR` | Non-functional requirements |

Every requirement has **exactly** this form:

```markdown
### GAME-014 — The reveal releases the solution only after the answers are locked

**Requirement:** After all answers are locked, the round phase switches to `reveal`.

**Rationale:** The anti-spoiler protection is a product promise, not a comfort feature.

**Acceptance:** `src/components/game/QuestionPhase.tsx` → phase `reveal` only when
`answersLocked === true`; unit test `src/components/game/QuestionPhase.test.tsx`.

**Verification:** `npm run test -- QuestionPhase`
```

The mandatory fields are **Requirement**, **Rationale**, **Acceptance** and
**Verification**. If one is missing, the requirement is incomplete and does not
count.

Additionally the following applies:

- Legend **Preset** (default) / **Optional** (present, not enabled) /
  **Later** (deliberately postponed).
- Every ID is referenced **in the code, in tests and in the documentation** — as
  the comment `// GAME-014` at the implementation, as a name in the test, as a
  reference in the document.
- An ID is **never** reissued. If a requirement is deleted, the ID stays
  orphaned and is not reassigned.

**Wording in the requirements:** no words like "adequate", "intuitive",
"performant" without a number or a path. Every statement names the file, the
test or the value on which it depends.

---

## 5. Naming the dossiers

| Type | Pattern | Example |
|---|---|---|
| Architecture decision | `ADR-<NNNN>-<kebab-case-topic>.md` | `docs/adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md` |
| Change request | `CR-<NNNN>-<kebab-case-topic>.md` | `docs/cr/CR-0001-source-file-size-limits.md` |
| Acceptance | `M<n>-ACCEPTANCE.md` | `docs/acceptance/M1-ACCEPTANCE.md` |
| Guide | `<TOPIC-UPPERCASE>.md` | `docs/guides/PRINTING-GUIDE.md` |
| User guide | `USER-GUIDE.<language>.md` | `docs/user-guide/USER-GUIDE.en.md` |

Rules:

- Numbering from `ADR-0001` resp. `CR-0001`, **consecutive**, never overwritten.
  A number that was once issued belongs to this document forever.
- File names in **kebab-case** (`kebab-case-topic`), language documents in
  **SCREAMING-CASE** (`PRINTING-GUIDE.md`).
- A dossier carries **one** subject. Anyone who puts two topics into one file
  can no longer version either of them.
- The number stands in the file name **and** in the heading of the file.
- Historical states are **not** overwritten, but moved to
  `specifications/archive/` and marked there with the date in the file name.

---

## 6. What is not documented — and why

| Not documented | Why |
|---|---|
| **The source code itself** | The code is the truth. A second description of the code will go stale. `ARCHITECTURE.md` describes boundaries, not lines. |
| **Every single song** | 1,615 records are not a document. The catalogue lies in `src/data/songs/` and is checked by `npm run validate-catalog`. |
| **Every cover file** | 1,649 images lie in `public/covers/`. Their origin is a matter of the metadata, not of the prose. |
| **The dependencies of libraries** | `package.json` and `package-lock.json` are machine-readable and current. A prosaic list would be a second, worse truth. |
| **Historical snapshots in the prose** | They lie in `specifications/archive/`. An archive file that grows along is not an archive. |
| **Task lists, roadmaps without acceptance criteria** | A task without an acceptance criterion is a statement of intent. The progress lies in `ROADMAP.md` with acceptance. |
| **Explanations for every single commit** | `CHANGELOG.md` summarises the changes. The full log lies in the version control. |
| **Values that are measured but never claimed anywhere** | What was not measured is "not measured" — see [`BEST_IN_CLASS.md`](BEST_IN_CLASS.md). |
| **Personal data of players** | Names, avatars and scores stay in the browser of the device. They belong into no file and into no log. |
| **Third-party content** | Music tracks, cover images and video links belong to third parties. The project provides software under AGPL-3.0-or-later, not the contents. |

---

## 7. What a good documentation page looks like

1. **One statement per paragraph.** No paragraph that claims five things.
2. **Every number has a path.** Either it stands in `src/config/`, or it has a
   command that produces it.
3. **Every command is copyable.** No `npm run …` without the rest, no `…` in a
   command that cannot be executed.
4. **No placeholders.** "TODO", "will be added", "coming soon" are forbidden in
   a finished page. Either a page is complete in substance, or it does not
   exist.
5. **Check the links.** Every relative Markdown link must resolve. A dead link
   is an error, not a trifle.
6. **The tone is calm.** No marketing, no "revolutionary", no "almost
   unsurpassed". A quality page names measurement method and target value.
7. **English when it is project documentation.** No Denglish.

---

## 8. Checks that secure the documentation

| Check | Command | Checks |
|---|---|---|
| Documentation link check | `npm run check:doc-links` | every relative Markdown link in the repo resolves |
| i18n completeness | `npm run check:i18n` | `de.json` and `en.json` parallel, no empty values, no literal text left in the JSX |
| File size | `npm run check:file-size` | no source file above 550 lines (soft: 400) |
| Catalogue gate | `npm run validate-catalog` | catalogue without regression against the baseline |
| Pipeline | `npm run local-ci` | everything in the order in which the CI runs it |

The gates are registered in `package.json` and run locally via
`npm run check:all` as well as individually via `npm run check:i18n`,
`npm run check:doc-links` and `npm run check:file-size`. They belong into the
CI and into `npm run local-ci`.

---

## 9. Binding nature

These rules apply to **every** change to documentation in the repo — for
contributors as well as for agents. Violations of the same-change rule and the
single-source-of-truth rule are the most common reason why a change is not
accepted despite green tests.
