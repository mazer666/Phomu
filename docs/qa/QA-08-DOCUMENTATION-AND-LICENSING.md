# QA-08 — Documentation, Traceability & Licensing Compliance

**Severity of the findings in this report:** P1, P2, P2, P3
**Area:** Whether the documentation still describes the code, and whether the licence is stated in a way that holds up.

---

## 1. Summary judgement

Phomu's documentation is **the best part of this project** and it deserves to be said plainly: 174 numbered requirements with a fixed ID scheme, a machine-readable project state, an acceptance template, a contradiction list, a "what is not secured" section, a "what a gate does not prove" section, and a documented policy for every exception. Most projects of this size have a README and a wish. This one has a specification.

The problems are therefore narrow and specific — and they are all consequences of the force-push in QA-REL-001, plus one genuine legal defect that predates it.

---

## 2. What is outstanding

| Asset | Scale | Assessment |
|---|---|---|
| `REQUIREMENTS.md` | **174** requirement blocks, gapless per domain, 0 duplicate IDs | Exemplary. Each block carries Requirement / Rationale / Acceptance / Verification, and each names the code path and the command that proves it. |
| `project/project.yaml` | The machine-readable single source of truth | The right pattern — "a value is here because it was measured or derived; where it is unknown, `null` stands with a comment — not a plausible number." |
| `QUALITY.md` | Eight acceptance dimensions with evidence rules | Good, including "never write 'fast' without a measurement". |
| `SECURITY.md` | 5 trust boundaries, findings table, 10 numbered sections | Excellent; see QA-03. |
| `PRIVACY.md` | 9 sections incl. "verified, not claimed" and "what could not be proven" | Excellent. |
| `docs/` | `adr/` (4 + template), `cr/` (1 + template), `acceptance/` (template + M0 evidence), `design/`, `guides/`, `user-guide/` | Well structured. |
| `docs/DOCUMENTATION_POLICY.md` | The policy the other documents follow | The reason the set is coherent. |
| Language gate | `check-doc-language.mjs` — 53 markdown files, 0 findings | Enforced, not aspirational. |
| Link gate | `check-doc-links.mjs` — green | Enforced. |
| `GLOSSARY.md`, `WHERE_TO_CHANGE.md`, `LLM.md` | Onboarding and orientation aids | Valuable, and rare. |
| `specifications/archive/` | 20 files, deliberately excluded from the language gate | The right call — translating an archive would falsify it. |

---

## QA-DOC-001 — P1 — The `LICENSE` file does not contain the GPL-3.0 text, and the licence is stated four different ways

### What I measured

`LICENSE` is **21 lines long**:

```
                    GNU GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007
...
  The licenses for most software and other practical works are designed
to take away your freedom to share and change the works.  By contrast,
the GNU General Public License is intended to guarantee your freedom to
share and change all versions of a program--so that each version is
free software for everyone.

For the full license text, see: https://www.gnu.org/licenses/gpl-3.0.en.html

This project (Phomu) is licensed under GPL-3.0.
```

This is the **preamble**, not the licence. The GPL-3.0 is a ~35,000-word document containing 17 sections, the complete terms and conditions. What is shipped here is the header, the first two paragraphs of the preamble, a link, and one sentence.

**Why this matters — it is a compliance defect, not a cosmetic one.** GPL-3.0 §1 states:

> *"The Program ... must also be accompanied by this License."*

Pointing at a URL is not accompanying the licence. The canonical, complete, unmodified text must be distributed with the program. For a project distributed publicly, via a website, and (per the platform roadmap) via App Store channels, this is the kind of detail that is cheap to fix now and expensive to fix after third parties have built on an incomplete grant.

The second half of the finding is the **inconsistency**:

| Location | Statement |
|---|---|
| `LICENSE:21` | "licensed under GPL-3.0" |
| `package.json:5` | `"license": "GPL-3.0"` |
| `project/project.yaml:38` | `"GPL-3.0-or-later"` |
| `README.md:10` | "**License:** GPL-3.0" |
| `README.md:158` | "GPL-3.0-or-later" |
| GitHub (API) | `license: { spdx_id: "NOASSERTION", name: "Other" }` |

`GPL-3.0` and `GPL-3.0-or-later` are **not the same licence**. "Only" means the code may only be distributed under GPL-3.0; "or-later" additionally permits GPL-4.0 and any later version. The difference decides whether a downstream user may relicense under v4.

This is **not academic for this project**: the multi-platform specification's Apple strategy is explicitly built on *"GPL-3.0-or-later plus exactly one narrowly scoped GPL-3.0 §7 additional permission"* — the *"Phomu App Store Exception"*. That construction depends on the "or-later" grant being unambiguous. Right now, the machine-readable manifest (`package.json`) says "only" while the strategy document assumes "or-later".

GitHub already reports `NOASSERTION` / "Other" — it could not classify the licence because the file is not a recognised licence text.

### Concrete recommendation

**1. Ship the complete licence text.** Replace `LICENSE` with the canonical GPL-3.0 text, unmodified, including the "How to Apply These Terms to Your New Programs" appendix at the end. The standard practice for an "or-later" project is to include the appendix boilerplate with the "or (at your option) any later version" wording filled in, so the grant is self-documenting.

```
$ curl -o LICENSE https://www.gnu.org/licenses/gpl-3.0.txt
$ wc -l LICENSE      # expect ~674 lines
```

**2. Make the "or-later" grant unambiguous and uniform.** Choose one — the platform strategy says "or-later", so use that everywhere:

| File | Change |
|---|---|
| `package.json` | `"license": "GPL-3.0-or-later"` (the valid SPDX form) |
| `LICENSE` | Complete GPL-3.0 text, with the appendix filled in as "…or (at your option) any later version." |
| `README.md:10` | "**License:** GPL-3.0-or-later" |
| `README.md:158` | Already "GPL-3.0-or-later" — keep |
| `project/project.yaml` | Already "GPL-3.0-or-later" — keep |

After this, GitHub should report the licence as **GPL-3.0** rather than "Other".

**3. Add a licence-consistency gate.** The drift between four files is exactly what a check prevents:

```bash
# scripts/check-license.mjs
// Fails when package.json, README.md, LICENSE and project/project.yaml
// disagree about the licence.
```

A minimal version: extract the SPDX id from `package.json`, assert that the string appears in `README.md` and in `project/project.yaml`, and assert that `LICENSE` contains the phrase *"GNU GENERAL PUBLIC LICENSE"* *and* has more than 500 lines (i.e. it is the full text, not the preamble).

**4. Consider the third-party content note.** `README.md` correctly disclaims the music, covers and links as third-party content, which is the right framing and belongs next to the licence statement. Consider adding a `NOTICE` file naming the artwork and music sources, consistent with the licence's attribution requirements.

**Accept when**

- `wc -l LICENSE` shows the complete GPL-3.0 text (≈674 lines), not 21.
- `package.json`, `README.md` and `project/project.yaml` all state `GPL-3.0-or-later`.
- The GitHub API reports `license.spdx_id` as `GPL-3.0` instead of `NOASSERTION`.
- The licence-consistency check runs in CI and fails on a deliberate divergence.

---

## QA-DOC-002 — P2 — Every document still points at the deleted branch

### What I measured

After the force-push (QA-REL-001), the branch `feature/vocument-style-docs-and-i18n` no longer exists and `d5b6422` is no longer `main`. **13 references to the deleted branch or the orphaned commit remain across the documentation:**

| File | Reference |
|---|---|
| `ARCHITECTURE.md:5` | "branch `feature/vocument-style-docs-and-i18n`" |
| `REQUIREMENTS.md:4` | "derived from the code state `feature/vocument-style-docs-and-i18n`, commit `d5b6422`" |
| `REQUIREMENTS.md:1582` | Changelog entry — "Commit `d5b6422`" |
| `ROADMAP.md:4, 113, 115, 288, 418, 652` | Six references to the branch and to `d5b6422` |
| `SECURITY.md:6` | "Applies to: the state on branch `feature/vocument-style-docs-and-i18n`" |
| `docs/BEST_IN_CLASS.md:8` | "State of the measurements: 2026-04 (branch `feature/vocument-style-docs-and-i18n`)" |
| `docs/acceptance/M0-ACCEPTANCE.md:6` | "Build/commit: `d5b6422`" |
| `project/project.yaml:17` | "As of: 2026-10-25, branch feature/vocument-style-docs-and-i18n, commit d5b6422" |

`SECURITY.md` is the most consequential of these: it defines the **scope of the entire security policy**. A reader who cannot resolve "the state on branch X" cannot know which code the threat model describes.

### Concrete recommendation

**Fix this automatically, not by hand.** A hard-coded commit SHA in prose will rot again on the next merge — the same way it rotted here.

1. **Restore `main` to the intended state** (QA-REL-001) and then update the references to the actual current `main` SHA.
2. **Introduce a single source of truth for the baseline.** `project/project.yaml` already declares itself the machine-readable truth — so let it hold the baseline SHA, and have the documents reference *that* rather than repeating the SHA:

   ```yaml
   project:
     baseline_commit: "9639c762b544b58d187b9b80e409357a685a34c7"
     baseline_date: "2026-10-25"
   ```

   In the prose, replace the literal SHA with a pointer: *"Baseline: see `project/project.yaml` → `project.baseline_commit`."*
3. **Add a CI check** that fails when a document mentions a branch or commit that does not exist in the repository:

   ```bash
   # scripts/check-doc-refs.mjs
   // Extracts branch names and 7–40 char SHAs from the markdown files and
   // verifies that each resolves against the remote.
   ```

   That closes the class of defect, not just the instance.

**Accept when**

- No document references a branch that does not exist.
- The CI check fails on an introduced bogus reference.
- `SECURITY.md`'s scope statement resolves to a real, reachable state.

---

## QA-DOC-003 — P2 — The acceptance table in `REQUIREMENTS.md` contradicts the measured state

### What I measured

`REQUIREMENTS.md` contains a table titled *"Verifiability of the gates (measured in this work round, 2026-10-25)"*. I re-ran every command in it:

| Command | The document claims | I measured | Verdict |
|---|---|---|---|
| `npm run typecheck` | green (exit 0) | exit 0, 29 s | ✅ matches |
| `npm run lint` | 0 errors, 1 warning (`playwright.config.ts:1`) | 0 errors, 1 warning (`playwright.config.ts:1`) | ✅ matches exactly |
| `npx vitest run` | **4 test files / 21 tests passed** | **10 test files / 97 tests passed** | ❌ **stale** |
| `npm run validate-catalog` | 135 packs, 1,615 songs, 0 schema errors, 126 warnings, 0 duplicate groups, 4 permitted duplicates, 0 missing years | identical, to the number | ✅ matches exactly |
| `node scripts/check-i18n-completeness.mjs --count` | **935 literal texts in 47 files** | **Total literal texts: 0; Files checked: 48** | ❌ **stale** |
| `npm run build` | **not measured in this round** | exit 0, 21 static routes, ≈62 s | ⚠️ **gap now filled** |

The `validate-catalog` row matches to the digit, which tells you the discipline is real — the two stale rows are simply from before the English/i18n round landed. But they are exactly the rows a reviewer would rely on.

The i18n row is the more serious one: it reports **935 literal texts** as a fact about the codebase, when the gate now reports **0**. A reader comparing the table against the live gate sees a contradiction and cannot tell which is current.

### Concrete recommendation

1. **Regenerate the table** with the values above. The build row should now read: *"`npm run build` | green (exit 0), 21 static routes, ≈62 s | `next build`"*.
2. **Make the table machine-generated.** The table's purpose is to be verifiable, so let a script produce it:

   ```bash
   # scripts/generate-gate-evidence.mjs
   // Runs every gate, captures the real summary line and the timing, and
   // writes the table into REQUIREMENTS.md between two markers.
   ```

   ```markdown
   <!-- BEGIN:GATE-EVIDENCE -->
   ... generated ...
   <!-- END:GATE-EVIDENCE -->
   ```

   Run it in CI on `main` and open a PR when the values change. The table then **cannot** drift from the code, because it is written by the same commands it describes.

3. **Label each row with its commit SHA** so a reader can reproduce the exact state.

**Accept when**

- Every row in the table matches a fresh run of the command it names.
- The table is generated by a script, and CI fails if the committed table differs from the generated one.

---

## QA-DOC-004 — P3 — The language gate does not cover the catalogue content or the script output

`check-doc-language.mjs` reports **0 findings across 53 markdown files** — and it correctly excludes `specifications/archive/`, because translating an archive would falsify it. That is the right call and worth preserving.

Two areas are outside the gate's reach, though:

1. **The catalogue content is German** (see QA-UX-004). The gate checks prose in markdown, not data in JSON. The German hints and lyrics are correct German — the gate is not wrong — but a reader of the German-language gate output might reasonably conclude "everything in the repo is English", which is not true for the catalogue.
2. **Script output is German.** `validate-songs` prints *"Lese Datei: …"*, *"Gültig: 12 / 12"*, *"✓ Alle Songs sind gültig!"*; `validate-catalog` prints *"🎛️ Phomu Katalog-Qualitätsgate"*, *"Schema-Fehler: 0"*, *"✅ Katalog-Gate bestanden"*. After the Round-2 English conversion, the CLI output is the remaining German surface — and it is the output a CI log shows.

**Recommendation:**

- Extend the language gate with an explicit, documented exclusion list that *names* `src/data/` and `scripts/` output strings, and states in `DOCUMENTATION_POLICY.md` that catalogue content is localised separately (QA-UX-004). An explicit exclusion is honest; a silent one is not.
- Translate the CLI output of the two validation scripts into English, or make it bilingual. The scripts are the project's primary operational interface for whoever maintains the catalogue.

**Accept when:** `DOCUMENTATION_POLICY.md` names every German-language area and its plan, and the validation scripts print English.

---

## QA-DOC-005 — P3 — The requirement count is consistent, but the platform requirements live in a second file

`REQUIREMENTS.md` holds 174 blocks with **0 duplicate IDs** (verified: `grep -o '^### [A-Z]*-[0-9]*' REQUIREMENTS.md | sort | uniq -d` is empty), and the count in the changelog entry matches.

The platform requirements live separately in `docs/spec/REQUIREMENTS-PLATFORM.md`, referenced from `project/project.yaml`. Two requirement sets in two files is a reasonable structure, but it means the traceability matrix has to span both, and the machine-readable file has to carry the count for each.

**Recommendation:** ensure `project/project.yaml` carries **both** counts explicitly (`requirements.version` exists; the per-file counts do not appear to), and that `docs/spec/TRACEABILITY.md` maps every requirement in both files to its implementation and test. A traceability matrix that covers only one of two requirement files is worse than one file.

**Accept when:** `project/project.yaml` carries the count for each requirements file, and the traceability matrix covers all requirements in both.

---

## Acceptance summary for this report

| Item | Severity | Accept when |
|---|---|---|
| QA-DOC-001 Ship the full GPL-3.0 text; unify the licence statement | **P1** | `LICENSE` contains the complete text; all manifests say `GPL-3.0-or-later`; GitHub reports `GPL-3.0`; a consistency gate exists |
| QA-DOC-002 Remove references to the deleted branch | P2 | No document references a non-existent branch; a CI check fails on a bogus reference |
| QA-DOC-003 Regenerate the gate-evidence table | P2 | Every row matches a fresh run; the table is script-generated and CI-enforced |
| QA-DOC-004 Document and close the German-language areas | P3 | `DOCUMENTATION_POLICY.md` names them; the validation scripts print English |
| QA-DOC-005 Complete the traceability matrix | P3 | The matrix covers both requirement files; `project.yaml` carries both counts |
