# Remediation

This directory tracks the **execution** of the independent QA assessment that
lives in [`../qa/`](../qa/).

| File | Content |
|---|---|
| [`STATUS.md`](STATUS.md) | The state of every one of the 28 backlog items: done, in flight, open or owner decision — with the evidence |

The **plan** itself is not duplicated here. It lives in
[`../qa/QA-09-REMEDIATION-BACKLOG.md`](../qa/QA-09-REMEDIATION-BACKLOG.md) and
belongs to the QA assessment. This directory only records what was done with it.

## The short version

The assessment raised 48 findings and produced a 28-item plan. The plan is
worked in its stages: recover, close the blockers, build the core, then polish.
The current state is in [`STATUS.md`](STATUS.md).

Two items are **owner decisions**, because they change what the product is and
not only how it is built:

- **2.6 — the hosting model.** The web shell is a static export on GitHub
  Pages today. That is why the security headers never reach a response, why
  the admin API cannot run, and why the round payload has to carry the
  solution to the client. A host that serves headers and runs API routes fixes
  all three at once.
- **1.6 — the fate of the admin API.** Wired up or removed — half-wired is
  not an option.

The native shells are not affected by the hosting decision: the game rules live
in the shared Rust core and run on the device.
