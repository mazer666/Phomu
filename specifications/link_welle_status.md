# Link-Welle: Spotify- und Amazon-Music-Links für den Katalog

Stand: 25.10.2025 · Katalog: 1.615 Songs · Bezugspfad `src/data/songs/**`

## Ergebnis

| Anbieter | vorher | nachher | Abdeckung |
|---|---|---|---|
| Spotify (`links.spotify`) | 734 | 1.591 | 98,5 % |
| Amazon Music (`links.amazonMusic`) | 381 | 1.575 | 97,5 % |
| beide | — | 1.568 | 97,1 % |

Offen bleiben 24 Spotify- und 40 Amazon-Links: bei diesen Songs ließ sich **kein
belegbar passender Track** finden (Dienst führt den Track nicht, oder die
Zuordnung bleibt mehrdeutig). Diese Felder bleiben bewusst leer – ein geratener
Link wäre schlechter als keiner.

## Methodik

Jeder gesetzte Link ist belegt, nicht geraten:

1. **iTunes-Referenz** – `itunes.apple.com/search` liefert Titel, Artist, Album,
   Laufzeit und Jahr des Original-Releases (je nach Katalog-Land, plus US/DE/GB).
2. **Kandidaten** – Spotify über die Feldsyntax des Webplayers
   (`track:"Titel" artist:"Artist"`), Amazon über die Künstlerseite
   (`searchArtists` → `artist.tracks` → `artist.albums` → `album.tracks`).
3. **Match-Gate** – Kerntitel ≥ 0,95, Artist ≥ 0,9 (≥ 0,85 bei Ensemble-Credits),
   Laufzeit zur Referenz ≤ 3 s **oder** eindeutiger Treffer (kein Konkurrent mit
   gleichem Titel/Artist und > 12 % abweichender Laufzeit). Live-/Remix-/Acoustic-
   Fassungen nur, wenn der Katalogsong selbst diese Version ist.
4. **Direkt-Lookup** – der gesetzte Link wird zurückgelesen (Titel, Artists, Album,
   Laufzeit, Jahr) und gegen die Referenz geprüft.
5. **Unabhängige Prüfung** – ein zweiter Agent prüft jeden gesetzten Link erneut
   und entfernt Falschzuordnungen. Das war keine Formsache: von 339 gesetzten
   Links wurden 6 entfernt (falsche Aufnahme, Live-Titel als Studio-Fassung,
   Kinder-Cover statt Original, nicht-kanonische ASIN).

## Werkzeuge

Die Recherche-Werkzeuge liegen bewusst **außerhalb** des Repos, weil sie keine
App-Code sind:

```
/workspace/.mavis/plans/phomu-data-enrichment/links/
  common.py          Katalog-Loader, Titel-/Artist-Matching, Cache, HTTP mit Retry
  itunes_api.py      Referenzquelle (Laufzeit, Album, Jahr)
  spotify_api.py     Feldsyntax-Suche + Embed-Lookup
  amazon_api.py      GraphQL des Webplayers (Künstler → Tracks → Alben → Tracks)
  resolve.py         Orchestrierung, Status je Song (matched/verified/uncertain/missing)
  apply.py           schreibt Links in den Katalog (nur das Link-Feld)
  check_links.py     Gate: Format, Link-Duplikate, unveränderter YouTube-Link
  review_queue.py    Review-Queue für die offenen Fälle
```

Gate-Aufruf je Batch:

```
python3 check_links.py --ids-from <batch>.json --baseline youtube_baseline.json
```

## Linkformen

- `links.spotify` → `https://open.spotify.com/track/<22 Zeichen base62>`
- `links.amazonMusic` → `https://music.amazon.com/tracks/<ASIN>`
  (die ältere Form `albums/<ALBUM>?trackAsin=<TRACK>` wurde normalisiert)

## Abmachung zwischen parallelen Sessions

Beide Sessions arbeiten an diesem Repository, aber an **verschiedenen
Pfadbereichen**:

- **Diese Welle**: ausschließlich `src/data/songs/**` (Katalogdaten, Link-Felder)
- **Plattform-/Doku-Welle**: `core/`, `platform/`, `tools/`, `docs/`, `src/app/**`,
  `src/components/**`, `src/i18n/**`, `specifications/`

Damit es nicht zu stillen Verlusten kommt:

1. **Vor jedem Push** `git fetch origin` und prüfen, ob der Remote-Stand Dateien
   enthält, die der eigene Stand nicht hat. Diese Dateien übernehmen, nicht
   überschreiben.
2. **Als Kette pushen**, nicht als Root-Commit: der neue Commit bekommt den
   aktuellen Remote-Commit als Eltern. Dann bleibt die Historie nachvollziehbar
   und nichts verschwindet unbemerkt.
3. `merge_remote.sh <fremder-commit> <gemeinsamer-basis-commit>` baut genau das:
   Basis ist der fremde Commit, übernommen wird nur, was die eine Seite seit dem
   gemeinsamen Basis-Commit wirklich geändert hat.
