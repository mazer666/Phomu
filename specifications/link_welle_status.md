# Link wave: Spotify and Amazon Music links for the catalogue

**Status:** 25 October 2026 · **Catalogue:** 1,615 songs · **Path:** `src/data/songs/**`

---

## Result

| Provider | Before | After | Coverage |
|---|---|---|---|
| Spotify (`links.spotify`) | 734 | 1,591 | 98.5 % |
| Amazon Music (`links.amazonMusic`) | 381 | 1,575 | 97.5 % |
| Both | — | 1,568 | 97.1 % |

**24 Spotify links and 40 Amazon Music links remain open**: for these songs no
**provably matching track** could be found (the service does not carry the
track, or the assignment stays ambiguous). These fields stay empty on
purpose — a guessed link is worse than none.

---

## Method

Every link that was set is evidenced, not guessed:

1. **iTunes reference** — `itunes.apple.com/search` delivers title, artist,
   album, runtime and year of the original release (per catalogue country, plus
   US/DE/GB).
2. **Candidates** — Spotify through the web player's field syntax
   (`track:"Title" artist:"Artist"`), Amazon through the artist page
   (`searchArtists` → `artist.tracks` → `artist.albums` → `album.tracks`).
3. **Match gate** — core title ≥ 0.95, artist ≥ 0.9 (≥ 0.85 for ensemble
   credits), runtime within ≤ 3 s of the reference **or** a unique hit (no
   competitor with the same title/artist and a runtime differing by more than
   12 %). Live/remix/acoustic versions only when the catalogue song *is* that
   version.
4. **Direct lookup** — the link that was set is read back (title, artists,
   album, runtime, year) and checked against the reference.
5. **Independent review** — a second agent checks every link that was set again
   and removes false assignments. This was not a formality: of 339 links that
   were set, **6 were removed** (wrong recording, live title instead of the
   studio version, children's cover instead of the original, non-canonical
   ASIN).

---

## Tools

The research tools deliberately live **outside** the repository, because they are
not application code:

```
/workspace/.mavis/plans/phomu-data-enrichment/links/
  common.py          catalogue loader, title/artist matching, cache, HTTP with retry
  itunes_api.py      reference source (runtime, album, year)
  spotify_api.py     field-syntax search + embed lookup
  amazon_api.py      web player GraphQL (artist → tracks → albums → tracks)
  resolve.py         orchestration, status per song (matched/verified/uncertain/missing)
  apply.py           writes the links into the catalogue (only the link field)
  check_links.py     gate: format, duplicate links, unchanged YouTube link
  review_queue.py    review queue for the open cases
```

Gate invocation per batch:

```
python3 check_links.py --ids-from <batch>.json --baseline youtube_baseline.json
```

---

## Link forms

- `links.spotify` → `https://open.spotify.com/track/<22 characters base62>`
- `links.amazonMusic` → `https://music.amazon.com/tracks/<ASIN>`
  (the older form `albums/<ALBUM>?trackAsin=<TRACK>` was normalised)

---

## The arrangement between the parallel sessions

Both sessions work on this repository, but on **different path ranges**:

- **This wave**: exclusively `src/data/songs/**` (catalogue data, link fields)
- **Platform/documentation wave**: `core/`, `platform/`, `tools/`, `docs/`,
  `src/app/**`, `src/components/**`, `src/i18n/**`, `specifications/`

So that nothing is lost silently:

1. **Before every push**, `git fetch origin` and check whether the remote state
   contains files the local state does not have. **Take those files over, do
   not overwrite them.**
2. **Push as a chain, not as a root commit**: the new commit gets the current
   remote commit as its parent. The history stays traceable and nothing
   disappears unnoticed.
3. `merge_remote.sh <foreign-commit> <shared-base-commit>` builds exactly that:
   the base is the foreign commit, and only what one side actually changed
   since the shared base is taken over.

The same split is recorded for the repository as a whole in
[`docs/COORDINATION.md`](../docs/COORDINATION.md).
