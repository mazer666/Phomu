# ADR-0001 — Schichten und Abhängigkeitsrichtung

**Status:** Accepted
**Datum:** 2026-10-25
**Owner-Rolle:** Chief Architect
**Bezugene Anforderungs-IDs:** NFR-001 (Wartbarkeit), GAME-001 (Spielablauf), UI-001 (Oberfläche)

---

## Kontext

Phomu ist aus einem einzigen Next.js-App-Router-Projekt entstanden. Das Repo
enthält heute 77 Quelldateien (`*.ts`/`*.tsx`) unter `src/`, verteilt auf elf
Verzeichnisse: `app`, `components`, `stores`, `hooks`, `contexts`, `config`,
`types`, `utils`, `data`, `admin-api`, `i18n`.

Diese Verzeichnisse sind **historisch** gewachsen, nicht **geplant**. Die Folge
ist messbar:

- `src/data/songs/index.ts:8` importiert `@/types/song` — der Katalog (unterste
  Schicht) hängt an einer Schicht darüber.
- `src/types/game-state.ts:10` importiert `@/config/game-config` — die
  Typverträge sind kein Blatt mehr.
- `src/app/browse/page.tsx:8` mountet `@/components/admin/SongEditor` — eine
  Admin-Komponente in einer öffentlichen Seite, die zusätzlich denselben
  localStorage-Key `'phomu-admin-songs'` schreibt wie der Admin-Bereich
  (`src/app/browse/page.tsx:14` und `src/app/admin/songs/page.tsx:33`).
- `src/stores/game-store.ts` ist mit **640 Zeilen** das größte Zustandsmodul und
  bündelt Team-, Timeline-, Audio- und Spiellogik in einer Datei.

Ohne eine verbindliche Richtung ist jede Änderung eine Ratesache: es gibt keine
Aussage darüber, ob `utils` den Store kennen darf, ob `data` Typen importieren
darf oder ob eine Komponente den Store direkt lesen soll. Die Ablage von
Konstanten leidet darunter am stärksten: **zehn** Schlüssel in
`src/config/game-config.ts` (`COUNTDOWN_SECONDS`, `SPOTIFY_PREVIEW_DURATION`,
`MIN_ROUNDS_TO_PLAY`, `MAX_ROUNDS_TO_PLAY`, `FORCE_REMOVE_DUPLICATE_YEARS`,
`DEFAULT_UNLOCK_METHOD`, `CARD_WIDTH_MM`, `CARD_HEIGHT_MM`, `CARD_BLEED_MM`,
`MAX_CARDS_PER_SET`) werden **nirgands** konsumiert, während dieselben Werte
an anderer Stelle im Code nachgebaut sind (z. B. Vorschau-Dauer 30 s in
`src/components/game/modes/HintMasterMode.tsx:132`).

---

## Entscheidung

### 1. Fünf Schichten, Pfeile zeigen nach unten

Phomu erhält fünf Schichten. Eine Datei darf nur Schichten importieren, die
**unter** ihr liegen. Gleichstufige Importe sind erlaubt, sofern sie keine
Zyklen bilden.

| Schicht | Verzeichnisse | Rolle |
|---|---|---|
| **L1** | `src/app/**` | Routen, Seiten-Orchestrierung, Guards |
| **L2** | `src/components/**` | Darstellung und Interaktion, keine Spiellogik |
| **L3** | `src/stores/**`, `src/hooks/**`, `src/contexts/**` | Zustand, Seiteneffekte, Kontext |
| **L4** | `src/config/**`, `src/types/**`, `src/utils/**` | Konstanten, Verträge, reine Logik |
| **L5** | `src/data/**` | Katalog — unterste Schicht |

```text
app  →  components  →  stores/hooks/contexts  →  config/types/utils  →  data
```

### 2. Zwei Querschnitts-Achsen

- **`src/admin-api/**`** ist eine eigene Achse. Sie wird ausschließlich von L1
  konsumiert (oder von niemandem). Sie darf weder Store noch Komponenten noch
  den Katalog kennen.
- **`src/i18n/**`** ist eine eigene Achse. Sie darf von L1 bis L4 konsumiert
  werden, niemals von L5.

### 3. `types/` ist ein Blatt

`src/types/**` importiert nichts außerhalb von `src/types/`. Die in
`src/config/game-config.ts` definierten Verträge (`GameMode`, `MusicProvider`,
`Difficulty`, `ThemeName`, `TeamMode`, `UnlockMethod`, `Language`) wandern nach
`src/types/`; die Konfiguration importiert sie von dort. Damit ist die Kette
`config → types` und die Richtung `types → config` entfällt.

### 4. `data/` ist das Blatt

`src/data/**` importiert nichts außerhalb von `src/data/`. Der generierte
Loader `src/data/songs/index.ts` darf den Typ `PhomuSong` nicht importieren;
die Typisierung des Katalogs erfolgt an der Aufrufstelle
(`src/utils/song-picker.ts`). `src/data/packs/index.ts` (Legacy-Proxy) wird
entfernt.

### 5. `src/config/` ist die einzige Quelle für Konstanten

Konstanten, die mehr als eine Datei braucht, liegen in `src/config/`. Der
Store liest seine Defaults aus `PHOMU_CONFIG`; keine Komponente enthält
Magic Numbers für Punkte, Zeitlimits, Grenzwerte, IDs oder Pfade. Der Legacy-Proxy
`src/data/packs/index.ts` und die doppelten lokalen Paletten
(`TEAM_COLORS` in `src/stores/game-store.ts:29`, `CURATED_TEAM_COLORS` in
`src/app/lobby/page.tsx:48-55`, `PLAYER_COLORS` in `src/app/lobby/page.tsx:26`)
werden zusammengeführt.

### 6. Abweichungen werden gemessen, nicht geschätzt

Der Import-Graph wird per Skript über alle `import`/`export … from`- und
`import()`-Statements ermittelt (Auflösung über `@/*` → `src/*` und relative
Pfade). Jede Abweichung von der gewünschten Richtung wird in
`ARCHITECTURE.md` §3.3 mit **Datei und Zeile** geführt.

### 7. Dateigrößen

Ziel **≤ 400 Zeilen** je Quelldatei, **Maximum 550 Zeilen**. Die Grenze gilt
für `*.ts` und `*.tsx` unter `src/`. Das Gate `scripts/check-file-size.mjs`
wird umgesetzt und in CI ausgeführt.

---

## Konsequenzen

### Positiv

- Der Import-Graph wird prüfbar: ein Skript kann Kanten gegen die Schichtregel
  prüfen, ohne dass ein Mensch die Struktur verstehen muss.
- `src/config/` wird zur echten Einzelquelle: die zehn ungenutzten Schlüssel
  werden entweder konsumiert oder entfernt, und Werte wie die Vorschau-Dauer
  existieren nur noch einmal.
- `types/` und `data/` werden testbar ohne Mocking: sie brauchen weder React
  noch den Store noch den Katalog.
- Die Dateigrößen-Grenze wird vom Zufall zur Eigenschaft: `RevealPhase.tsx`
  (671 Zeilen) wird in sechs Reveal-Karten plus einen Textkatalog zerlegt,
  `game-store.ts` (640 Zeilen) in Team-, Timeline- und Session-Actions.
- Die Kopplung zwischen öffentlicher Browse-Seite und Admin-Bereich verschwindet;
  `SongEditor` bekommt einen neutralen Ort.

### Negative / Trade-offs

- **Kurzfristiger Aufwand:** Das Zerlegen der sieben Dateien über 550 Zeilen
  (`src/app/admin/review/page.tsx` 755, `src/app/lobby/page.tsx` 744,
  `src/components/game/RevealPhase.tsx` 671, `src/stores/game-store.ts` 640,
  `src/components/game/MusicPlayer.tsx` 630,
  `src/components/game/modes/TimelineMode.tsx` 579, `src/app/browse/page.tsx` 572)
  ist reine Umbauarbeit ohne sichtbaren Produktgewinn.
- **Ein Import mehr pro Schritt:** Die Verschiebung der Typen aus
  `src/config/game-config.ts` nach `src/types/` berührt **19 Verbraucher**
  (`grep -rl "config/game-config" src` → 20 Treffer, davon ist
  `src/config/game-config.ts` selbst).
- **Der generierte Loader wird unhandlicher:** Ohne Typ-Import braucht
  `src/data/songs/index.ts` einen Typ, der entweder lokal deklariert oder per
  `import type` aus L4 geholt wird — Letzteres widerspricht der Regel.
- **Ein Gate mehr in der CI:** `check-file-size.mjs` muss laufen, sonst ist die
  Grenze nicht verbindlich.

### Was die Entscheidung unmöglich macht

- `src/data/**` kann keine Typen aus `src/types/**` mehr verwenden — die
  Typisierung wandert an die Aufrufstelle.
- `src/types/**` kann keine Werte aus `src/config/**` mehr referenzieren —
  Verträge und Werte werden getrennt.
- `src/components/**` kann den Serverzustand nicht direkt lesen; der einzige
  Weg führt über L3.
- `src/config/**` kann keine Seiten, Komponenten oder Stores importieren.

---

## Alternativen (verworfen)

- **Freie Schichten ohne Richtungsregel** (Status quo). *Verworfen:* Der
  gemessene Graph zeigt, dass die Freiheit bereits zu drei konkreten
  Grenzverletzungen geführt hat (`data → types`, `types → config`,
  `app → components/admin`).
- **Nur `app` und `components` als Schichten, der Rest eine Ebene.** *Verworfen:*
  `stores`, `hooks` und `contexts` haben unterschiedliche Zugriffsrechte
  (schreibend vs. nur lesend) — eine gemeinsame Ebene erlaubt dem Hook, den
  Store zu schreiben.
- **Datenbank- bzw. Supabase-Realtime-Sync statt reinem Client-Store.**
  *Verworfen für jetzt:* `src/types/game-state.ts:5-7` nennt Supabase Realtime
  bereits als Plan, aber `next.config.ts:4` setzt `output: 'export'` — ein
  statischer Export hat keine Server-Route. Der Sync ist eine eigene
  Entscheidung (siehe ADR-0002) und wird nicht vorweggenommen.
- **Komponenten dürfen den Store direkt importieren** (Status quo in
  `src/components/game/DrawingPhase.tsx:12`). *Verworfen:* Lesezugriff auf den
  Store ist über L3-Hooks besser prüfbar; die bisherige direkte Nutzung ist
  einmalig und umstellbar.

---

## Verifikation

| Prüfung | Kommando / Ort |
|---|---|
| Import-Graph messen | Skript über `src/**/*.ts{,x}` (Auflösung `@/*` → `src/*`), Ergebnis in `ARCHITECTURE.md` §3.2 |
| Richtungsabweichungen prüfen | `ARCHITECTURE.md` §3.3 — Liste muss leer sein, wenn alle Abweichungen behoben sind |
| Dateigrößen-Gate | `npm run check:file-size` (neu: `scripts/check-file-size.mjs`) — Ziel ≤ 400, Maximum 550 |
| Konfigurations-Einzelquelle | `grep -rn "PHOMU_CONFIG\." src` — kein Schlüssel darf ohne Konsument bleiben |
| Typ-Blatt | `grep -rn "from '@/config" src/types` → 0 Treffer |
| Daten-Blatt | `grep -rn "from '@/" src/data` → 0 Treffer |
