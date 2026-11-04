# Release record — Android track

The record of the released versions of the Android track. It is filled in
with every release and is the artefact of the quality claim of the stage
([`RELEASE-PLAN.md`](RELEASE-PLAN.md) § 2.2): the gates that are met, the
known defects that are open, the testers that play, and the way back.

---

## 1. The versions

| Version | Tag                      | Commit | Date | Stage | Notes                                         |
| ------- | ------------------------ | ------ | ---- | ----- | --------------------------------------------- |
| —       | `android-v0.1.0-alpha.1` | —      | —    | Alpha | the shell of the track at the first milestone |

---

## 2. The gates of the Beta stage

Every gate of the stage is listed with the artefact that shows it. A gate
without an artefact is a gate that is not met.

| Gate                                                           | Met    | The artefact that shows it                                                                                  |
| -------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| A-01 … A-14 (the Alpha gates)                                  | partly | the shell runs a round from the lobby to the result; the gates that need a device are open                  |
| B-01 Coverage of the core and of the shell                     | no     | the coverage of the core is measured by the CI, the coverage of the shell is not measured yet               |
| B-02 The performance budgets measured                          | no     | the sandbox has no reference device — the budgets of `docs/BEST_IN_CLASS.md` § 1–§ 3 are open               |
| B-03 The hardening with a negative test each                   | partly | the core has the negative tests of its gates; the surface of the bridge is new and has no negative test yet |
| B-04 The migration path tested                                 | no     | a session does not survive a restart (defect 5) — the path cannot exist yet                                 |
| B-05 The accessibility review executed                         | no     | the review of `docs/BEST_IN_CLASS.md` § 5 and § 6 has not run on a device                                   |
| B-06 The device matrix executed                                | no     | the matrix protocol does not exist yet (gap `GAP-08`)                                                       |
| B-07 No open defect of the severity blocker, critical or major | no     | defect 3 (the scan of a card) is still open and has the severity major                                      |
| B-08 The artefact accepted by the channel                      | no     | the internal testing track of Google Play is not set up yet                                                 |

**What this means:** the artefact of the track is a **beta build** — it is
signed, it is installable, and it is published. The _quality claim_ of the
Beta stage is **not** met yet: seven of the eight gates are open. The gates
that need a device, a store or a measurement are the work between the
artefact and the claim — they are listed here so that nobody has to guess
what is still missing.

---

## 3. The known defects of the track

Every defect that a tester may run into. The severity follows the scheme
of the plan: a **blocker** is a crash, a spoiler leak, a state loss, a
mode that cannot be finished or an installation that fails.

| #   | What happens                                                                                                                                                                                                       | Severity | Since               | Workaround                                    | Status                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | The Timeline mode and the Lyrics mode could not be answered: the question view model of the bridge carried the options as plain strings, the slots of the timeline and the flag of the invented line were missing. | major    | the first milestone | —                                             | **closed** — the base carries the context of the round with the question, and the Lyrics mode names the line the player picked |
| 2   | The catalogue screen shows the identifier of a song instead of its title: the summary of the bridge carries no title, no artist and no year.                                                                       | minor    | the first milestone | the reveal shows the title                    | open — the bridge is the limit                                                                                                 |
| 3   | The scan of a card is off: the bridge exports no entry point for the intent of a card, and the format of the card is a rule of the base.                                                                           | major    | the first milestone | the lobby offers the random draw              | open — the bridge is the limit                                                                                                 |
| 4   | The fallback chain of the media does not run: the bridge exports the plan of the base but no way to report the outcome of a source.                                                                                | minor    | the first milestone | the player is offered the next source by hand | open — the bridge is the limit                                                                                                 |
| 5   | A session does not survive a restart: the bridge exports no serialisation of a session.                                                                                                                            | major    | the first milestone | the game starts again                         | open — the bridge is the limit                                                                                                 |
| 6   | The performance budgets are not measured: the sandbox has no reference device.                                                                                                                                     | minor    | the first milestone | —                                             | open — a device is needed                                                                                                      |

---

## 4. The testers

| Who | Device | Since | What they play | What they report |
| --- | ------ | ----- | -------------- | ---------------- |
| —   | —      | —     | —              | —                |

---

## 5. The way back

A tester who cannot install a beta over the old one uninstalls it and
installs the new artefact. The **data** of the game is not lost by that:
the settings live in the storage of the app, the progress of a game does
not survive a restart in any case (defect 5).

---

## 6. The related documents

| Document                                                       | Relation                                         |
| -------------------------------------------------------------- | ------------------------------------------------ |
| [`RELEASE-ANDROID.md`](RELEASE-ANDROID.md)                     | the runbook: the build, the key, the publication |
| [`RELEASE-PLAN.md`](RELEASE-PLAN.md)                           | the stages and their gates                       |
| [`../../apps/android/README.md`](../../apps/android/README.md) | the shell of the Android track                   |
