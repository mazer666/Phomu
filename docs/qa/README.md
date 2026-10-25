# Phomu — QA Assessment (2026-10-25)

An **independent, read-only QA assessment** of the project.

> **Nothing in this folder is a change to the product.** No production code was
> modified, no test was written, no gate was weakened. This folder contains
> findings and recommendations only.

---

## Read in this order

| # | File | What it answers |
|---|---|---|
| 1 | [`QA-00-EXECUTIVE-SUMMARY.md`](QA-00-EXECUTIVE-SUMMARY.md) | Verdict, weighted scorecard, all 50 findings, release recommendation |
| 2 | [`QA-09-REMEDIATION-BACKLOG.md`](QA-09-REMEDIATION-BACKLOG.md) | **The action plan** — 28 items, 4 phases, effort, dependencies, acceptance criteria |
| 3 | [`QA-10-EVIDENCE-LOG.md`](QA-10-EVIDENCE-LOG.md) | Every command that was run and its real output; a re-verification checklist |

Then the dimension reports:

| File | Dimension |
|---|---|
| [`QA-01-BRANCH-AND-RELEASE-INTEGRITY.md`](QA-01-BRANCH-AND-RELEASE-INTEGRITY.md) | Branch integrity, build reproducibility, release process |
| [`QA-02-SPOILER-FREENESS.md`](QA-02-SPOILER-FREENESS.md) | Spoiler-freeness and game integrity — the named product promise |
| [`QA-03-SECURITY-AND-PRIVACY.md`](QA-03-SECURITY-AND-PRIVACY.md) | Security and privacy — threat surface, hardening, delivered protection |
| [`QA-04-CODE-QUALITY-AND-ARCHITECTURE.md`](QA-04-CODE-QUALITY-AND-ARCHITECTURE.md) | Code quality, architecture, module boundaries |
| [`QA-05-TESTING-AND-CI.md`](QA-05-TESTING-AND-CI.md) | Testing, coverage honesty, CI gates |
| [`QA-06-USABILITY-ACCESSIBILITY-I18N.md`](QA-06-USABILITY-ACCESSIBILITY-I18N.md) | Usability, accessibility, internationalisation |
| [`QA-07-PERFORMANCE-AND-DELIVERY.md`](QA-07-PERFORMANCE-AND-DELIVERY.md) | Payload, build cost, delivery |
| [`QA-08-DOCUMENTATION-AND-LICENSING.md`](QA-08-DOCUMENTATION-AND-LICENSING.md) | Documentation traceability and GPL compliance |

`evidence/gates/` holds the raw captured output of all 13 gate runs, including the
`npm ci` failure that blocks CI.

---

## Headline

> **Not release-ready.** Weighted score **2.70 / 5 (54 %)**. Three P0 findings.

1. **`main` was force-pushed twice** to orphan commits; 572 paths of the project are
   gone from the branch and the good state exists only in unreferenced commits.
2. **The answer key ships to the client** — 1,557 songs and 5,988 lyric lines in a
   JavaScript chunk that `/game` loads before the first question.
3. **`npm ci` fails for everyone** — a devDependency was withdrawn from the npm
   registry, so every CI job and the Pages deploy are red.

The project's *intent* is best-in-class and its documentation is the strongest part
of it. The findings are about the gap between the documented project and the
delivered artifact.

---

## Scope

The **measured baseline is the Next.js / TypeScript web shell at `9639c762`**. The
Rust base (`be984cdc5`, good tip `11371eb94`) landed *during* the assessment and was
**not** audited — the sandbox had no Rust toolchain, so no `cargo build`, `cargo
test`, `cargo clippy` or `cargo fmt` was run against it.

What is known about the Rust base, and what it means for the findings, is in
[`QA-00-EXECUTIVE-SUMMARY.md`](QA-00-EXECUTIVE-SUMMARY.md) § 0b. The short version:

> **The fix for the biggest finding already exists in this repository.**
> `core/phomu-core/tests/anti_spoiler.rs` proves, for every game mode, that the
> question payload carries no title, no year and no artist, and that the question
> view model has **no field for the solution**. `platform/phomu-wasm` publishes the
> bindings. The web shell simply does not consume any of it yet.

A dedicated audit of the Rust base is still outstanding — QA-09, item 2.10.

---

## Method

Every number in these reports comes from a command executed against the code, not
from a document. Where a document and the code disagreed, the code won and the
disagreement is itself a finding.

- Measured baseline: `9639c762`. Publication state: `main` @ `1c597a3`.
- Current good state: `11371eb94`.
- Toolchain: Node v22.19.0, npm 10.9.3, Next.js 16.4.3, Vitest 4.1.2,
  ESLint 9.39.4, TypeScript 5.9.3.
- One disclosed deviation: `youtube-search-without-api-key@2.0.7` is no longer on
  the npm registry, so it was removed from the **measurement copy** in order to
  install the rest of the toolchain. That is the defect reported as QA-REL-002; no
  other dependency was altered.

The assessment went through a verification pass before publication. Three claims in
the first draft were wrong and were corrected; they are listed with the method that
caught them in
[`QA-00-EXECUTIVE-SUMMARY.md`](QA-00-EXECUTIVE-SUMMARY.md) § 0a — the "Revision
note".
