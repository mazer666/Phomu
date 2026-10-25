# CR-XXXX — Title of the change

**Status:** proposed | approved | rejected | implemented
**Date:** YYYY-MM-DD
**Trigger:** Who triggered the change, and what triggered it? (finding, request, audit, error pattern)
**Proposed by:** Role(s) according to `AGENTS.md` (e.g. ROLE-01)
**Reviewed by:** Role(s) according to `AGENTS.md`
**Decision:** open | accepted | rejected — with date and decision maker

---

## 1. Problem

What is wrong or missing? Describe the **observed state**, not the intention.
Back up every statement with a test name, command output or file:line.
Without evidence this section is a wish, not a change request.

## 2. Proposed change

What exactly is changed? Name files, directories and steps. A change that
cannot be expressed in a diff is not a change.

## 3. Rationale

Why is this change the right one? Which requirement, which risk or which
principle speaks for it? Refer to requirement IDs.

## 4. Affected requirements

| ID | Impact |
|---|---|
| `DOMAIN-NNN` | new / changed / unchanged, in one sentence |

If no requirement is affected, state that explicitly. A change request
without a requirement reference is inadmissible in this project.

## 5. Affected architecture

Which layers, modules or dependency directions are touched? Name the changed
paths in `src/`.

## 6. Affected platforms

Web, mobile, deployment, CI — what is affected and what is not?

## 7. Impact on the milestones

Which milestones from `ROADMAP.md` are extended, moved, split or re-evaluated?
A silent postponement is forbidden.

## 8. Impact on acceptance and tests

Which acceptance criteria change, which are added? Which gates are added?
Which tests have to be written anew or as negative tests?

## 9. Risks

| Risk | Probability of occurrence | Impact | Countermeasure | Owner |
|---|---|---|---|---|

## 10. Rollback

How is the change rolled back? Concrete steps, no principles.

## 11. Decision

Decided on YYYY-MM-DD by <role/person>: **accepted | rejected |
accepted with conditions**. Rationale, conditions, and what happens as a
consequence (ticket, milestone, requirement IDs).
