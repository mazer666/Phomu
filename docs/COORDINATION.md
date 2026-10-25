# Coordination — two working streams in this repository

> **Why this file exists.** Two independent agent sessions work on
> `mazer666/Phomu` from separate sandboxes against the same remote branch.
> They once overwrote each other's history with force pushes, which lost
> work twice. This file is the **durable** coordination channel: it lives in
> the repository, so every session sees it after a fetch — regardless of
> which sandbox it runs in.
>
> **Rule for everyone:** before every push, `git fetch origin && git pull
> --rebase origin main`. **Never `--force`, never `--force-with-lease`.**
> The file ranges below do not overlap, so a rebase resolves without
> conflicts. If a conflict does appear: do not resolve it unilaterally —
> leave it and report it.

---

## 1. The split

### Stream A — documentation, specification, shared base, shells

| Area | Paths |
|---|---|
| Documentation | `README.md`, `AGENTS.md`, `REQUIREMENTS.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `QUALITY.md`, `WHERE_TO_CHANGE.md`, `GLOSSARY.md`, `PROJECT_MANAGEMENT.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `PRIVACY.md`, `LLM.md` |
| Specification | `docs/**`, `project/project.yaml` |
| Internationalisation | `src/i18n/**`, `src/components/ui/{LanguageSwitcher,NavBar,ThemeSwitcher}.tsx` |
| Shared Rust base | `Cargo.toml`, `Cargo.lock`, `core/**`, `platform/**`, `tools/**` |
| Quality gates | `scripts/check-*.mjs`, `scripts/verify-conformance.mjs`, `scripts/merge-i18n-parts.mjs`, `scripts/seed-shared-keys.mjs`, `scripts/generate-variant-keys.mjs` |
| Native shells | `apps/**` |
| CI | `.github/workflows/ci.yml` |
| Build metadata | `package.json` (the `scripts` section only), `.gitignore` |

### Stream B — catalogue data, links and hints

| Area | Paths |
|---|---|
| Song and pack data | `src/data/songs/**`, `src/data/packs/**` |
| Validation | `src/utils/validate-song-*.ts`, `src/utils/check-covers.ts` |
| Catalogue tooling | `scripts/audit-*.js`, `scripts/fix-*.js`, `scripts/enrich_*.py`, `scripts/update_pack.py`, `scripts/upsert_song.py`, `scripts/import_checkpoint.json` |
| Catalogue baselines | `specifications/quality-baseline.json`, `specifications/duplicate-allowlist.json`, `specifications/catalog_issues_report.json` |

---

## 2. The intersection, and how it is handled

`src/data/songs/**` is Stream B's territory. Stream A must not edit those files.

The one place where both streams touch the same ground is the **catalogue
gate**: `npm run validate-catalog` compares the catalogue against
`specifications/quality-baseline.json`. If Stream B changes the data and the
baseline moves, Stream A's CI job *Catalogue Validation* reacts to it. That is
intended — a failing catalogue gate means the data regressed, not that the
documentation changed.

---

## 3. What is already in the history

The link wave (`amazonMusic` links in 134 song files) is **already merged**
into `main`. It exists once, in the commit that Stream B pushed. Nobody has to
redo it.

If Stream B adds further links, it commits them on top of the current `main`.
If Stream A needs a catalogue change, it asks Stream B instead of editing the
files itself.

---

## 4. How to ask for something from the other stream

Do not edit the other stream's files. State the need precisely — path,
desired state, reason — and let the owning stream implement it. A change that
crosses the boundary is a change request, not an edit.

---

## 5. Push discipline

```bash
git fetch origin
git pull --rebase origin main    # never --force
npm run local-ci                 # the pre-push hook runs this anyway
git push origin main
```

If the push is rejected because the remote moved, rebase and push again.
**If the rebase produces a conflict, stop and report it** — do not resolve it
by force pushing and do not discard the other side's work.
