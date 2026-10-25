# Licensing — index

**Project:** Phomu — hybrid music party game
**Repository:** <https://github.com/mazer666/Phomu>
**Date:** 2026-10-25

This folder holds the licence decisions of the project. It is the place to look
before changing a licence, adding a third-party dependency with a
restrictive licence, or distributing Phomu on a platform whose terms add
restrictions of their own.

---

## 1. What is in this folder

| Document | Purpose | Read it when |
|---|---|---|
| [`APPLE-LICENSING.md`](APPLE-LICENSING.md) | The decision basis for the iOS/iPadOS track: the legal framework, the channel map, the recommended strategy, the operational plan, the Rust constraints and the proposed licence file layout | Before starting any work on the Apple platform, or before changing the licence |
| [`../adr/ADR-0007-apple-distribution-and-licensing-strategy.md`](../adr/ADR-0007-apple-distribution-and-licensing-strategy.md) | The recorded decision (status: **proposed**) with context, consequences and rejected alternatives | To understand *why* the strategy was chosen, or to reopen the decision |

Every legal statement in `APPLE-LICENSING.md` carries a source URL and a
retrieval date, and is labelled as **fact**, **interpretation** or
**recommendation**. Facts that could not be verified are marked *to be
verified* rather than estimated.

---

## 2. The licence of the project

**Phomu is free software under the GNU General Public License, version 3 or
later.**

The binding text is [`LICENSE`](../../LICENSE) in the repository root. The
project's own statement of its licence is spread across four files, and they
are **not currently consistent**:

| File | What it says |
|---|---|
| [`LICENSE`](../../LICENSE) | "This project (Phomu) is licensed under GPL-3.0." — the file points to the full GPL-3.0 text rather than embedding it |
| [`README.md`](../../README.md) (licence section) | "GPL-3.0-or-later" |
| [`CONTRIBUTING.md`](../../CONTRIBUTING.md) | "GPL-3.0-or-later" |
| [`package.json`](../../package.json) | `"license": "GPL-3.0"` |

**Open point.** The version statement must be settled on **"GPL-3.0-or-later"**
before any additional permission is published, so that the permission applies
to a defined licence range. This is recorded in ADR-0007 §7 and is an owner
decision.

### 2.1 The planned additional permission

The decision in ADR-0007 is to grant exactly **one** additional permission
under **GPL-3.0 §7** — the *Phomu App Store Exception* — which permits
conveying the covered work through app-store distribution services
notwithstanding their DRM and usage rules. It is **not** a licence change: the
work stays GPL-3.0-or-later, and every copyleft obligation remains in force.

The exception is **not yet written**. The proposed file layout, the mandatory
contents of the exception text and the consequences for contributors are
specified in `APPLE-LICENSING.md` §7.

**The exception may only be published once every copyright holder has
consented.** GPL-3.0 §7 lets the copyright holders grant additional
permissions, and it lets a recipient remove an additional permission from a
copy. A contributor who has not consented can therefore object to App Store
distribution of the combined work. `CONTRIBUTING.md` currently contains no
CLA, no DCO and no sign-off clause — this is tracked as an open decision
(ADR-0007, D2).

### 2.2 What the project does **not** do

- It does not relicense the core permissively.
- It does not dual-license.
- It does not place the core under LGPL.
- It does not use the Apple Developer Enterprise Program for public
  distribution.

---

## 3. Where the binding rules stand

"Binding" means: a rule that constrains what may be done, and that a
contributor or a maintainer can be held to.

| Rule | Where it lives | Binding on |
|---|---|---|
| The licence grant and its conditions | [`LICENSE`](../../LICENSE) → [GPL-3.0 text](https://www.gnu.org/licenses/gpl-3.0.en.html) | Everyone who conveys or modifies the work |
| The recorded platform/licensing decision | [`../adr/ADR-0007-apple-distribution-and-licensing-strategy.md`](../adr/ADR-0007-apple-distribution-and-licensing-strategy.md) | The Apple track and any future licence change |
| Product requirements that depend on the licence | [`../../REQUIREMENTS.md`](../../REQUIREMENTS.md) — **CORE-002** (free open source without a forced account), **CORE-003** (local-first, data-minimising), **CORE-011** (no telemetry) | The product |
| How contributions are licensed | [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) | Contributors — currently states the inbound licence only, **no CLA/DCO** |
| Documentation and naming rules | [`../DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md) | Documentation authors |
| The rules for ADRs and CRs | [`../adr/ADR_TEMPLATE.md`](../adr/ADR_TEMPLATE.md), [`../cr/CR_TEMPLATE.md`](../cr/CR_TEMPLATE.md) | Decision authors |
| Machine-readable project state | [`../../project/project.yaml`](../../project/project.yaml) | The build and the gates |

---

## 4. How to ask a licence question

1. **Check whether it is already answered.** `APPLE-LICENSING.md` covers the
   platform/distribution questions. `LICENSE` and the GPL text cover the
   licence itself.
2. **Write the question as a scenario, not as a licence name.** "Can we ship
   Phomu on platform X?" is answerable. "Is MIT compatible with GPL?" is
   usually the wrong question — the right one is "does the platform's terms
   impose restrictions that go beyond the GPL's permissions, and who holds the
   copyright we would need to act on?"
3. **Separate the three layers** before answering:
   - **Fact** — what does a primary source actually say? Cite it with a URL
     and a retrieval date.
   - **Interpretation** — what does it mean for Phomu? Say where the reading is
     contested.
   - **Recommendation** — what should we do? Name the alternative rejected and
     why.
4. **Never invent a number.** Costs, limits, deadlines and quotas are quoted
   from a source or marked *to be verified*.
5. **Record the answer where it belongs.** A one-off answer goes in this
   folder or in a comment on the relevant file. A decision that constrains
   future work becomes an **ADR** (template:
   [`../adr/ADR_TEMPLATE.md`](../adr/ADR_TEMPLATE.md)); a change to product
   behaviour becomes a **CR**; a change to product scope becomes a requirement
   in `REQUIREMENTS.md`.
6. **Do not change the licence without the owner.** A licence change, a CLA or
   DCO, and any additional permission under §7 all require the project owner,
   because all three depend on who holds the copyright.

---

## 5. Contributing under this licence

Contributions are accepted under GPL-3.0-or-later. **Before the first App
Store upload, the project needs every copyright holder to consent to the
§7 additional permission** (ADR-0007, decision and §7 of
`APPLE-LICENSING.md`). The proposed instrument is a CLA; the DCO is the
accepted fallback.

Until the contributor agreement is in place, a contributor can choose to
license their contribution under GPL-3.0-or-later **and** additionally consent
to the Phomu App Store Exception — a single sentence in the pull request is
sufficient, provided it names the exception. The maintainers should record
that consent.

---

## 6. Language note

`../DOCUMENTATION_POLICY.md` §3 and **CORE-012** require German for `docs/`.
The documents in this folder are in **English** because the assignment that
produced them required English, and because they quote English-language legal
sources verbatim. The conflict is recorded in ADR-0007 §7 and needs an owner
decision: translate, or amend the policy to permit English for licensing
documents.

---

## 7. Related

- [`../../SECURITY.md`](../../SECURITY.md) — threat model and reporting path
- [`../../PRIVACY.md`](../../PRIVACY.md) — data minimisation; the native app
  will need its own privacy manifest and privacy statements
- [`../BEST_IN_CLASS.md`](../BEST_IN_CLASS.md) — measured quality targets, with
  the current export size that constrains the native app's bundle layout
