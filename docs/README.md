# Phomu — Documentation Index

This file is the entry point to the documentation. It says **where** an
information lives — not what it says in detail. Two paths lead here: the table
below for everyone who knows what they are looking for; the section
"Finding the right file" for everyone who does not know yet.

---

## The two levels

| Level | Folder | Language | Read by |
|---|---|---|---|
| **Project documentation** | Repository root and `docs/` | English | Team, agents, reviewers |
| **User guides** | `docs/user-guide/` | English, one file per language | Players |

The machine-readable project state lives in `project/project.yaml`. It is the
single source of truth for values that several documents touch.

---

## The language of the documentation

The project documentation is written in English. The user interface is
German-first with a complete English translation.

The binding rules for code, identifiers, comments, commit messages, project
documentation, user guides, ADR and CR are in
[`DOCUMENTATION_POLICY.md`](DOCUMENTATION_POLICY.md) § 3.

---

## The documentation tree

```text
Phomu/
├── README.md              Entry point: what Phomu is, quick start, gates
├── AGENTS.md              Working rules for agents, eight roles
├── REQUIREMENTS.md        Binding requirements with IDs
├── ARCHITECTURE.md        Module boundaries and dependency direction
├── ROADMAP.md             Milestones, gates, status
├── QUALITY.md             Acceptance model
├── WHERE_TO_CHANGE.md     Where do I change what
├── GLOSSARY.md            Domain terms with a meaning of their own
├── PROJECT_MANAGEMENT.md  Process, roles, register
├── CHANGELOG.md           What has changed
├── CONTRIBUTING.md        Contributing
├── SECURITY.md            Threat model, disclosure channel
├── PRIVACY.md             Data minimisation
├── LLM.md                 Short version for AI assistants
├── PRINTING_GUIDE.md      Reference to docs/guides/PRINTING-GUIDE.md
├── project/
│   └── project.yaml       Machine-readable project state
├── docs/
│   ├── README.md          This file
│   ├── DOCUMENTATION_POLICY.md   Rules of the documentation
│   ├── GETTING-STARTED.md        Setup and troubleshooting
│   ├── BEST_IN_CLASS.md          Measurable quality goals
│   ├── adr/                       Architecture decisions
│   ├── cr/                        Change requests
│   ├── acceptance/                Acceptance records
│   ├── design/                    Design contracts
│   ├── spec/                      Specification of the platform extension
│   ├── releases/                  Release rules, plan, checklist, record
│   ├── licensing/                 Licence decisions, distribution strategy
│   ├── qa/                        Independent QA assessment (read-only), with evidence
│   ├── remediation/               Execution record of the QA backlog
│   ├── deployment/                Runbook of the web deployment
│   ├── guides/                    Printing, troubleshooting
│   │   ├── PRINTING-GUIDE.md
│   │   └── TROUBLESHOOTING.md
│   └── user-guide/                User guides
│       └── USER-GUIDE.en.md
└── specifications/         Predecessor documentation (history)
```

---

## What is where

| File | Content | Read by |
|---|---|---|
| [`../README.md`](../README.md) | What Phomu is, quick start, the check commands | everyone who sees the project for the first time |
| [`../REQUIREMENTS.md`](../REQUIREMENTS.md) | Every behaviour rule with ID, acceptance and verification | Product Manager, Game Engineer, QA, reviewer |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | Layers, module boundaries, dependency direction, data flow | Architect, everyone who develops |
| [`../ROADMAP.md`](../ROADMAP.md) | Milestones with scope, non-goals and acceptance criteria | Team, Product Manager, owner |
| [`../QUALITY.md`](../QUALITY.md) | Acceptance model in eight dimensions, with the evidence per statement | QA, reviewer, owner |
| [`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md) | Topic → file → instruction → command | everyone who wants to change something |
| [`../GLOSSARY.md`](../GLOSSARY.md) | Domain terms with a meaning of their own, alphabetically, with a source | everyone who does not know a word |
| [`../AGENTS.md`](../AGENTS.md) | Roles, rules, handover format | AI assistants and agents |
| [`../PROJECT_MANAGEMENT.md`](../PROJECT_MANAGEMENT.md) | Process, register, governance | Team, owner |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Contribution rules, test philosophy, PR checklist | all contributors |
| [`../SECURITY.md`](../SECURITY.md) | Threat model, disclosure channel, implemented hardenings | everyone; security reviewers in particular |
| [`../PRIVACY.md`](../PRIVACY.md) | Which data stays local, what does not leave | everyone; privacy reviewers in particular |
| [`../LLM.md`](../LLM.md) | Short version of the project for AI assistants | AI assistants |
| [`DOCUMENTATION_POLICY.md`](DOCUMENTATION_POLICY.md) | Same-change rule, single source of truth, language rule, naming rules | everyone who writes documentation |
| [`GETTING-STARTED.md`](GETTING-STARTED.md) | From the clone to the playable state, with troubleshooting | new developers, new contributors |
| [`BEST_IN_CLASS.md`](BEST_IN_CLASS.md) | Measurable quality goals with measurement method and current state | QA, architect, owner |
| [`guides/PRINTING-GUIDE.md`](guides/PRINTING-GUIDE.md) | Card format, resolution, test print, QR content | everyone who prints cards |
| [`guides/TROUBLESHOOTING.md`](guides/TROUBLESHOOTING.md) | Error patterns and their solution for end users | Players, support |
| [`user-guide/USER-GUIDE.en.md`](user-guide/USER-GUIDE.en.md) | The same game in English | English-speaking players |
| `adr/` | Architecture decisions with status, context, decision, alternatives | Architect, reviewer |
| `cr/` | Change requests for material behaviour changes | Product Manager, team |
| `acceptance/` | Acceptance records per milestone, with concrete evidence | QA, owner |
| `design/` | Design contracts for individual building blocks | Architect, developers |
| `spec/` | Specification of the multi-platform extension — SRS, platform requirements, traceability | Architect, QA, developers |
| `releases/` | Release rules: release plan, release checklist, the record of a release | Release, QA, owner |
| `qa/` | Independent QA assessment: scorecard, findings across eight dimensions, a prioritised remediation backlog and the raw command output behind every number | owner, QA, everyone who works on a finding |
| `remediation/` | The execution record of the QA backlog: what is done, what is in flight, what the owner has to decide | owner, everyone who works on a finding |
| `deployment/` | The runbook of the web deployment: Cloudflare Pages, the account steps, the check of the delivery | owner, everyone who deploys |
| `COORDINATION.md` | The file-ownership split between the two working streams and the push discipline | everyone who pushes |
| `licensing/` | Licence decisions of the project, distribution strategy, Apple licensing | Legal, owner |
| `specifications/` | Predecessor and status documentation, historical snapshots | only for the history; no longer to be continued |

---

## Finding the right file

**If you have a question about the game:**

| Question | File |
|---|---|
| How does a round run? | [`user-guide/USER-GUIDE.en.md`](user-guide/USER-GUIDE.en.md), section "Rules, points and winning condition" |
| What must the product do? | [`../REQUIREMENTS.md`](../REQUIREMENTS.md) |
| Which points does which mode give? | [`../REQUIREMENTS.md`](../REQUIREMENTS.md), domain `GAME` |
| What does "Pilot" or "Vibe" mean? | [`../GLOSSARY.md`](../GLOSSARY.md) |

**If you have a question about the code:**

| Question | File |
|---|---|
| Where do I change X? | [`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md) |
| Which file may call what? | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Which constant is the truth? | `src/config/game-config.ts` |
| Which numbers are measured? | [`BEST_IN_CLASS.md`](BEST_IN_CLASS.md) |

**If you want to change something:**

1. Find or create the requirement in [`../REQUIREMENTS.md`](../REQUIREMENTS.md).
2. Determine the source location via [`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md).
3. Change, write a test, update the documentation in the same commit — the
   mapping is in [`DOCUMENTATION_POLICY.md`](DOCUMENTATION_POLICY.md).

**If you cannot find something:**

1. Search for the domain term in [`../GLOSSARY.md`](../GLOSSARY.md).
2. Search for the number in `src/config/game-config.ts` — every number of the
   game has exactly one place there.
3. `grep -rn "<term>" src/` — the code is the truth, the documentation follows
   it.

---

## Two rules you have to know

**1. Every number stands in exactly one place.** Points, time limits, capacities
and limits stand in `src/config/game-config.ts`; catalogue numbers are measured,
not estimated. Anyone who repeats a number in two documents creates a
contradiction.

**2. The documentation is created in the same commit.** A code change without a
documentation update is incomplete. This is not a formality: the requirement in
[`../REQUIREMENTS.md`](../REQUIREMENTS.md) names the file and the test, and the
acceptance depends on exactly that.
