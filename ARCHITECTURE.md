# Phomu — Architektur

**Dokumentversion:** 1.0
**Status:** Accepted — verbindliche Grundlage für Code-Reviews
**Stand der Messung:** 2026-10-25, Branch `feature/vocument-style-docs-and-i18n`
**Änderungsregel:** Jede Abweichung von den hier beschriebenen Grenzen braucht ein
ADR in `docs/adr/`. Jede Grenze, die sich ändert, braucht zusätzlich eine
Anpassung an `docs/adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md`.

> **Sprachregel:** Dieses Dokument ist deutsch. Codebezeichner (`PHOMU_CONFIG`,
> `useGameStore`, `RoundPhase`, `assertAdminAccess`) bleiben englisch.
> Zahlen in diesem Dokument sind gemessen, nicht geschätzt — die Kommandos stehen
> jeweils im zugehörigen Abschnitt.

---

## 1. Überblick

Phomu ist ein hybrides Musik-Partyspiel: **physische QR-Karten** und eine
**digitale Web-App** beschreiben denselben Spielablauf. Ein Smartphone wird in
der Runde weitergegeben (Modus `pass-the-phone`), der Beamer zeigt parallel die
zustandsgleiche, spoilerfreie Projektion (`/projector`), und die Partysitzung
selbst lebt vollständig im Browser des Spielers.

Das Produkt hat sechs Spielmodi (`timeline`, `hint-master`, `lyrics`,
`vibe-check`, `survivor`, `cover-confusion`), einen statisch exportierten
Next.js-16-App-Router-Stack, einen Zustand-Store mit `persist`-Middleware und
einen lokalen Songkatalog aus JSON-Dateien.

### Technische Basis (gemessen am 2026-10-25)

| Aspekt | Wert | Quelle |
|---|---|---|
| Framework | Next.js `^16.2.1` (App Router, `output: 'export'`) | `package.json`, `next.config.ts:4` |
| UI | React `^19.2.4`, Tailwind 4, Framer Motion | `package.json` |
| Zustandshaltung | Zustand `^5.0.12` + `persist` (localStorage) | `src/stores/game-store.ts:195-640` |
| Typen | TypeScript strict, Pfad-Alias `@/*` → `./src/*` | `tsconfig.json` |
| i18n | i18next `^26.0.2` + react-i18next `^17.0.1` | `src/i18n/config.ts` |
| Tests | Vitest (`src/**/*.test.ts`), Playwright (E2E) | `vitest.config.ts` |
| Quellcode | 77 Dateien (`*.ts`/`*.tsx`) unter `src/` | `find src -type f \( -name "*.ts" -o -name "*.tsx" \) \| wc -l` |

### Bereiche

| Bereich | Pfad | Aufgabe in einem Satz |
|---|---|---|
| **App** | `src/app/**` | Routen, Seiten-Orchestrierung, Guards, Server-/Client-Grenze |
| **Components** | `src/components/**` | Darstellung und Interaktion; keine Spiellogik |
| **Store** | `src/stores/game-store.ts` | Einziger schreibender Zustandshalter der Partysitzung |
| **Hooks** | `src/hooks/useGameAudioCues.ts` | Seiteneffekte, die den Store nur lesen |
| **Contexts** | `src/contexts/ThemeContext.tsx` | UI-Thema, orthogonal zum Spielzustand |
| **Config** | `src/config/**` | **Einzige** Quelle für Konstanten, Defaults und Enums |
| **Types** | `src/types/**` | Datenverträge ohne Verhalten |
| **Utils** | `src/utils/**` | Reine Logik: Auswahl, Zensur, Feedback, Validierung |
| **Data** | `src/data/**` | Songkatalog (JSON), Pack-Metadaten — unterste Schicht |
| **Admin-API** | `src/admin-api/**` | Server-seitige Admin-Endpunkte mit Token-Gate |
| **i18n** | `src/i18n/**` | Sprachressourcen und i18next-Bootstrap |

---

## 2. Schichten und Abhängigkeitsrichtung

### 2.1 Gewünschte Richtung (verbindlich)

Pfeile zeigen **nach unten**. Ein Modul darf nur Schichten importieren, die
**unter** ihm liegen. Gleichstufige Abhängigkeiten (z. B. `components` →
`components`) sind erlaubt, wenn sie keine Zyklen bilden.

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ L1  app/          Routen, Seiten-Orchestrierung, Guards, Layout                │
│     src/app/{lobby,game,game-over,browse,settings,admin,projector,guide,…}     │
└────────────────────────────────────────────────────────────────────────────────┘
                 │  gemessen: 21×components · 11×stores · 7×types · 3×data
                 │             3×config · 2×utils · 1×hooks · 1×app
                 ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ L2  components/   Darstellung, Interaktion, Modus-Widgets, Overlays              │
│     src/components/{game,game/modes,lobby,browse,admin,ui}, Providers.tsx       │
└────────────────────────────────────────────────────────────────────────────────┘
                 │  gemessen: 14×types · 13×utils · 10×config · 7×stores
                 │             3×contexts · 13×components · 1×i18n
                 ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ L3  stores/ + hooks/ + contexts/                                             │
│     Zustand, Seiteneffekte, UI-Kontext — schreibt bzw. liest den Spielzustand  │
│     src/stores/game-store.ts · src/hooks/useGameAudioCues.ts ·                  │
│     src/contexts/ThemeContext.tsx                                             │
└────────────────────────────────────────────────────────────────────────────────┘
                 │  gemessen: stores→3×types, 1×config · hooks→1×config, 1×utils
                 │             contexts→1×config
                 ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ L4  config/ + types/ + utils/                                                 │
│     Konstanten · Datenverträge · reine Logik (ohne React, ohne Store)          │
│     src/config/{game-config,spoiler-config,song-year-range}.ts                 │
│     src/types/{game-state,player,song,session,music-provider}.ts               │
│     src/utils/{song-picker,censor-utils,feedback-messages,last-round-messages} │
└────────────────────────────────────────────────────────────────────────────────┘
                 │  gemessen: utils→5×config, 3×types, 1×data, 1×utils
                 ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ L5  data/         Katalog: Pack-JSON + Pack-Metadaten — unterste Schicht       │
│     src/data/songs/*.json + src/data/songs/index.ts + src/data/packs/index.ts  │
└────────────────────────────────────────────────────────────────────────────────┘

  ══════════════════════════ Querschnitts-Achsen ══════════════════════════

  admin-api/   Server-only. Konsument: ausschließlich L1 (app) — oder niemand.
                Enthält: _lib/security.ts (Auth-Gate, Eingabevalidierung),
                admin/covers/search/route.ts, admin/covers/save/route.ts.
                Darf NICHT: den Store, React-Komponenten oder den Katalog
                clientseitig mutieren.

  i18n/        Sprachressourcen + i18next-Bootstrap.
                config.ts initialisiert, locales/{de,en}.json tragen die Werte.
                Darf von L1–L4 konsumiert werden, niemals von L5 (data).
```

**Faustregel:** Ein Modul in L4 oder tiefer darf **niemals** `app/`,
`components/`, `stores/`, `hooks/`, `contexts/` oder `admin-api/` importieren.
Ein Modul in L5 (`data/`) darf ausschließlich `data/` importieren.

### 2.2 Bereichs-Tabelle mit Ist-Status (gemessen)

„Ist-Status (gemessen)" nennt die tatsächlich gemessenen Kanten und ob sie zur
gewünschten Richtung passen. Grundlage: Skript über alle `import`/`export … from`-
und `import()`-Statements in `src/**/*.ts{,x}` (ohne Testdateien), Auflösung
über `@/*` → `src/*` und relative Pfade.

| Bereich | Verantwortung | darf dependieren von | darf NICHT dependieren von | Ist-Status (gemessen) |
|---|---|---|---|---|
| **app** | Seiten-Orchestrierung, Guards, Routing, Layout-Metadaten | components, stores, hooks, contexts, config, types, utils, data | admin-api intern, i18n-Rohdaten | **regelkonform.** 21×components, 11×stores, 7×types, 3×data, 3×config, 2×utils, 1×hooks, 1×app. Keine Abwärts-/Querverletzung. ⚠ `src/app/browse/page.tsx:8` mountet `@/components/admin/SongEditor` — Grenzverletzung, siehe §5.3 |
| **components** | Darstellung, Interaktion, Modus-Widgets | stores, hooks, contexts, config, types, utils, i18n, components | app, admin-api, data-Katalog-Interna | **regelkonform.** 14×types, 13×utils, 10×config, 7×stores, 3×contexts, 13×components, 1×i18n. Kein Import von `app/` oder `admin-api/` |
| **stores** | Einziger schreibender Zustandshalter (`persist` → localStorage) | config, types | app, components, hooks, contexts, utils, data, admin-api | **regelkonform.** 3×types (`game-state`, `player`, `song`), 1×config. Keine UI- oder Katalogabhängigkeit |
| **hooks** | Lesende Seiteneffekte (Audio-Cues) | config, types, utils | app, components, stores, data, admin-api | **regelkonform.** 1×config (`game-config`), 1×utils (`game-audio-cues`) |
| **contexts** | UI-Thema (orthogonal zum Spiel) | config | app, components, stores, utils, data | **regelkonform.** 1×config (`game-config`) |
| **config** | Konstanten, Defaults, Enums — einzige Wahrheit | types | app, components, stores, hooks, contexts, utils, data | **regelkonform.** **0 Importe** — `src/config/game-config.ts` importiert nichts (`grep -n "^import" src/config/game-config.ts` → 0 Treffer). ⚠ 10 deklarierte Werte werden nirgends konsumiert, siehe §8 |
| **types** | Datenverträge ohne Verhalten | — (Blatt) | alles außerhalb von `types/` | **1 Abweichung.** `src/types/game-state.ts:10` importiert `@/config/game-config` — horizontal statt nach unten. `types/` ist damit kein Blatt mehr |
| **utils** | Reine Logik ohne React/Store | config, types, data | app, components, stores, hooks, contexts, admin-api | **regelkonform.** 5×config, 3×types, 1×data (`song-picker.ts:4` → `@/data/songs`), 1×utils. ⚠ Bindung an den Volldatenimport, siehe §5.3 |
| **data** | Songkatalog + Pack-Metadaten | data | config, types, utils, stores, components, app | **1 Abweichung.** `src/data/songs/index.ts:8` importiert `@/types/song` — **Abhängigkeit nach oben**. `data/` ist damit nicht die unterste Schicht |
| **admin-api** | Server-Endpunkte, Auth-Gate, Eingabevalidierung | admin-api | stores, components, app, data, config | **regelkonform in der Struktur** (2×admin-api), ⚠ aber **0 Konsumenten** — siehe §6.1 |
| **i18n** | i18next-Bootstrap + Sprachressourcen | i18n | app, components, stores, config, data | **regelkonform.** 2×i18n (config → `locales/de.json`, `locales/en.json`), 1 Konsument (`src/components/Providers.tsx:20`). ⚠ Nur 4 Komponenten konsumieren `useTranslation`, siehe §6.2 |

---

## 3. Gemessener Import-Graph

### 3.1 Messkommando

```bash
# Kanten zwischen Dateien ermitteln (Alias @/* → src/*, relative Pfade, auch import()).
# WICHTIG: Kommentare müssen vorher entfernt werden — sonst zählt der
# Beispiel-Import im Kopfkommentar von src/stores/game-store.ts:8 als Kante.
find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.test.ts" ! -name "*.test.tsx" \
  | xargs grep -hoE "(import|export)[^;]*from '[^']+'|import\('[^']+'\)" \
  | grep -oE "'[^']+'" | tr -d "'" | sort -u
```

Ausgeführtes Skript (Node, `readFileSync` + Regex über `import`/`export … from`
und `import()`), Auflösung relativ und über den Alias `@/*` → `src/*`.
**Vor der Auswertung werden Block- und Zeilenkommentare entfernt.**

> **Messhinweis:** Im naiven Lauf (ohne Kommentar-Entfernung) entstehen zwei
> Scheinkanten, die in der Realität nicht existieren:
> `config → config` (aus dem Beispiel-Import im Kopfkommentar
> `src/config/game-config.ts:6`) und `stores → stores` (aus
> `src/stores/game-store.ts:8`). Die Zahlen in §3.2 sind die **bereinigten**.

### 3.2 Bereichs-Kanten (aggregiert, Anzahl Datei→Datei-Importe)

```text
admin-api    -> admin-api(2)
app          -> app(1), components(21), stores(11), types(7), data(3), config(3), utils(2), hooks(1)
components   -> components(13), types(14), utils(13), config(10), stores(7), contexts(3), i18n(1)
config       -> (keine Importe)
contexts     -> config(1)
data         -> data(137), types(1)
hooks        -> config(1), utils(1)
i18n         -> i18n(2)
stores       -> types(3), config(1)
types        -> types(4), config(1)
utils        -> config(5), types(3), data(1), utils(1)
```

Einzelne Kanten, die zur Einordnung wichtig sind:

```text
src/utils/validate-song-catalog.ts:16   ->  src/utils/validate-song-data.ts   (die einzige utils→utils-Kante)
src/app/layout.tsx:4                    ->  src/app/globals.css                (die einzige app→app-Kante)
src/data/songs/index.ts:11-145          ->  136 Pack-JSON-Dateien               (data→data)
src/i18n/config.ts:11-12                ->  src/i18n/locales/{de,en}.json       (i18n→i18n)
```

### 3.3 Abweichungen von der gewünschten Richtung

**A1 — `data/` importiert `types/` (Richtungsbruch, nach oben)**

```text
src/data/songs/index.ts:8   import type { PhomuSong } from '@/types/song';
```

`src/data/` ist in §2.1 die unterste Schicht (L5) und darf ausschließlich
`data/` importieren. Durch den Typ-Import hängt der Katalog an L4 und die
Schichtgrenze ist gebrochen.

*Kanonische Lösung:* `PhomuSong` bleibt in `src/types/song.ts` (die Typ-Definition
ist korrekt dort), aber der Katalog-Loader darf den Typ nicht importieren.
Optionen: (a) `PhomuSong` per `import type` **inhaltlich** in L5 belassen und
nach L4 re-exportieren, (b) den Loader als generische Funktion ohne
`PhomuSong`-Bezug schreiben (`getSongsForPacks` liefert `unknown[]`, die Typisierung
erfolgt in `src/utils/song-picker.ts`). Entscheidung offen, siehe
`/workspace/workers/architecture-deliverable.md` → *Offene Architekturentscheidungen*.

**A2 — `types/` importiert `config/` (horizontal statt nach unten)**

```text
src/types/game-state.ts:10   import type { GameMode, MusicProvider, Difficulty } from '@/config/game-config';
```

`src/types/` sollte ein Blatt ohne Abhängigkeiten sein. Durch den Import ist
eine Zyklengefahr strukturell möglich (`config` ↔ `types`) und die
Schichtregel „L4 besteht aus drei Geschwistern, die sich nicht kennen"
gilt nicht mehr.

*Kanonische Lösung:* Die drei Typen (`GameMode`, `MusicProvider`, `Difficulty`)
gehören nach `src/types/` (sie sind Verträge, keine Werte); `src/config/game-config.ts`
importiert sie dann aus `src/types/` — eine Richtung, die existiert und die
Kette acyclisch hält. `src/config/game-config.ts` importiert heute **überhaupt
nichts** (`grep -n "^import" src/config/game-config.ts` → 0 Treffer) und ist
damit der einzige Ort, an dem die Richtung ohne Konflikt gedreht werden kann.

**A3 — öffentliche Seite mountet eine Admin-Komponente (funktionale Grenze)**

```text
src/app/browse/page.tsx:8   import { SongEditor } from '@/components/admin/SongEditor';
```

Richtungstechnisch erlaubt (`app` → `components`), aber die **öffentliche**
Browse-Seite benutzt damit die **Admin**-Komponente und teilt sich mit dem
Admin-Bereich denselben localStorage-Key (`'phomu-admin-songs'`, siehe
`src/app/browse/page.tsx:14` und `src/app/admin/songs/page.tsx:33`). Damit kann
ein normaler Browse-Besuch den Admin-Zustand überschreiben.

*Kanonische Lösung:* `SongEditor` in einen neutralen Ort verschieben
(`src/components/browse/SongEditor.tsx`) und den Admin-Bereich referenzieren
lassen, oder einen gemeinsamen Store-Key in `src/config/` definieren.

**A4 — `admin-api/` hat keinen Konsumenten**

```text
src/admin-api/admin/covers/search/route.ts:3   import { assertAdminAccess, … } from '@/admin-api/_lib/security';
src/admin-api/admin/covers/save/route.ts:5     import { assertAdminAccess, … } from '@/admin-api/_lib/security';
```

Der Import-Graph enthält **keine** Kante von `app/`, `components/` oder einem
anderen Bereich auf `admin-api/`. Zusätzlich existiert **keine** Datei
`src/app/**/route.ts` (`find src/app -name "route.ts" \| wc -l` → `0`), und
`next.config.ts:4` setzt `output: 'export'`. Die beiden Route-Handler sind damit
aktuell **nicht erreichbar**; es gibt auch keinen Client-Aufruf
(`grep -rn "x-admin-token" src` trifft ausschließlich `security.ts` und die
beiden `route.ts`). Siehe §6.1.

### 3.4 Auffällige, aber regelkonforme Kopplungen

| Kopplung | Datei | Bewertung |
|---|---|---|
| `utils` → `data` (Vollkatalog) | `src/utils/song-picker.ts:4` | Erlaubt (abwärts). Bindet aber jede Nutzung von `song-picker` an den kompletten Katalog-Import (`src/data/songs/index.ts` importiert 136 JSON-Dateien) |
| `data` → `data` (136 JSON-Importe) | `src/data/songs/index.ts:11-145` | Technisch nötig; der Loader ist laut Kopfzeile `src/data/songs/index.ts:1-6` **generiert** von `scripts/migrate_and_deduplicate.py` und darf nicht handgepflegt werden |
| Legacy-Proxy ohne eigene Grenze | `src/data/packs/index.ts:7` → `export * from '@/data/songs'` | Re-exportiert den Katalog vollständig; jeder Import von `@/data/packs` bekommt den Volldatensatz |
| `data` → `types` | `src/data/songs/index.ts:8` | Siehe A1 |

---

## 4. Datenfluss des Spielablaufs

### 4.1 Zustandshalter

| Zustand | Halter | Lebensdauer | Persistenz |
|---|---|---|---|
| Partysitzung (Spieler, Teams, Config, Runde, Phase, Punkte, XP) | `useGameStore` (Zustand + `persist`) | Sitzung des Browsers | **localStorage**, Key `phomu-game-state` (`src/stores/game-store.ts:619`) |
| Aktueller Song, Antworten, Reveal-Phase | `useGameStore` (flüchtig) | Runde | **nicht** persistiert — `partialize` (`:621-637`) listet `currentSong`, `currentAnswers`, `roundPhase`, `roundHistory` **nicht** |
| Punkte-Stand des Beamers | `useGameStore` → localStorage → `/projector` | Gerät | localStorage; der Beamer-Tab pollt alle 2 s (`src/app/projector/page.tsx:41-44`) |
| Thema | `ThemeContext` | Sitzung | localStorage, Key `phomu-theme` (`src/contexts/ThemeContext.tsx:27`) |
| Admin-Song-Änderungen | **kein Store** — direkt in localStorage | Sitzung | localStorage, Key `phomu-admin-songs` (`src/app/admin/songs/page.tsx:33`, `src/app/browse/page.tsx:14`) |
| Review-Änderungen | **kein Store** — direkt in localStorage | Sitzung | localStorage, Key `phomu-review-edits` (`src/app/admin/review/page.tsx:28`) |
| Sprache | i18next `LanguageDetector` | Sitzung | localStorage (`src/i18n/config.ts:26-29`) |

> **Persistenzgrenze:** `persist.partialize` (`src/stores/game-store.ts:621-637`)
> ist die einzige Stelle, die bestimmt, was einen Reload überlebt. Der Song und
> die Antworten der laufenden Runde überleben **nicht** — nach einem Reload
> beginnt die Partysitzung in `drawing` ohne Song. Das ist gewollt (kein
> Spoiler-Durchbruch beim Neuladen) und in ADR-0002 festgehalten.

### 4.2 Phasenablauf

```text
  /lobby  (Wizard, 5 Schritte)
     │  Spieler+Teams, Modi, Packs, Ende-Bedingung
     │  → useGameStore.startGame()  [game-store.ts:255]
     ▼
  ┌──────────────────────── drawing ────────────────────────┐
  │ DrawingPhase [components/game/DrawingPhase.tsx]         │
  │  pickRandomSong({playedIds, selectedPacks, difficulty,   │
  │                  onlyQRCompatible, currentMode})         │
  │  [utils/song-picker.ts:28]                               │
  │  → onCardDrawn(song) → drawSong(song)                    │
  │    [game-store.ts:394] set currentSong, roundPhase=      │
  │    'question', playedSongIds += song.id                  │
  └───────────────────────┬─────────────────────────────────┘
                          ▼
  ┌─────────────────────── question ────────────────────────┐
  │ QuestionPhase [components/game/QuestionPhase.tsx]        │
  │  → Modus-Widget (Survivor/Vibe/Hint/Timeline/Lyrics/     │
  │    CoverConfusion) → MusicPlayer (blurred)                │
  │  Anti-Spoiler: Musik läuft, Bild unscharf. Titel/Artist   │
  │  werden in 5 von 6 Modi NICHT gerendert; Ausnahme:        │
  │  vibe-check (VibeCheckMode.tsx:99/:116-118).               │
  │  onAnswer(isCorrect, points, seconds) → submitAnswer +  │
  │  awardPoints [game-store.ts:444/451]                     │
  │  onReveal() → advancePhase('reveal')                     │
  └───────────────────────┬─────────────────────────────────┘
                          ▼
  ┌──────────────────────── reveal ─────────────────────────┐
  │ RevealPhase [components/game/RevealPhase.tsx]            │
  │  6 modusspezifische Auflösungskarten (je eine eigene     │
  │  Funktion), Punkteübersicht, Power-User-Menü              │
  │  QuestionPhase bleibt gemountet (display:none), damit der │
  │  YouTube-Iframe nicht neu startet [app/game/page.tsx:     │
  │  404-431]                                                 │
  │  onNextRound() → nextRound() [game-store.ts:278]          │
  └───────────────────────┬─────────────────────────────────┘
                          ▼
  ┌─────────────────────── scoring ─────────────────────────┐
  │ endGame() [game-store.ts:379] setzt isGameOver=true,      │
  │ roundPhase='scoring', addiert sessionXP auf totalXP       │
  └───────────────────────┬─────────────────────────────────┘
                          ▼
  /game-over  [app/game-over/page.tsx] → Podium, Rangliste, XP
```

### 4.3 Scoring

| Schritt | Ort | Regel |
|---|---|---|
| Basispunkte | Modus-Widget | `HINT_MASTER_POINTS` (`src/config/game-config.ts:310`) bzw. modus-eigene Werte |
| Zeitabzug | `src/app/game/page.tsx:131-136` | `timeDecayEnabled` → `max(minPointsPerCorrect, base − steps × stepPoints)`; `steps = floor((overrun − grace) / stepSeconds)` |
| Vergabe | `awardPoints` (`src/stores/game-store.ts:451-476`) | addiert auf Spieler **und** Team, clamp bei `Math.max(0, …)` |
| Override | `handleOverrideCorrect` (`src/app/game/page.tsx:197-210`) | Punkte ≥ `minPointsPerCorrect`; Governance-Zustand `overrideGovernance` wird **nicht** erzwungen (siehe §7) |

### 4.4 Anti-Spoiler-Grenze

Die Anti-Spoiler-Grenze liegt **an der Phase**, nicht in den Komponenten:

1. **Kein Metadaten-Leak im Client:** Der Store hält `currentSong` (inkl.
   `song.title`, `song.artist`) im Client-Speicher. Die Absicherung ist
   **darstellungsseitig**: `MusicPlayer` rendert bei `blurred=true` kein
   brauchbares Bild (`src/components/game/MusicPlayer.tsx:424`, `blur-[60px]`)
   und legt ein Swipe-Overlay darüber (`:434-479`).
2. **Kein Text-Leak:** `QuestionPhase` rendert im Frage-Modus **keinen** Titel
   und **keinen** Künstler. Die Auflösungstexte existieren ausschließlich in
   `RevealPhase` (`:240`, `:248`, `:297`, `:434`). Die Modus-Widgets folgen dem
   für fünf von sechs Modi ebenfalls — die **gemessene Ausnahme** ist
   `vibe-check`: dort stehen `song.artist` und `song.title` dauerhaft im
   Frage-Bildschirm (`src/components/game/modes/VibeCheckMode.tsx:99`, `:116-118`).
   Die Blur-Entscheidung je Modus:

   | Modus | `blurred`-Prop | Fundstelle |
   |---|---|---|
   | `survivor` | `!answered && !cheatUsed` | `SurvivorMode.tsx:69` |
   | `timeline` | `!isRevealed` | `TimelineMode.tsx:281` |
   | `lyrics` | `!isRevealing` | `LyricsMode.tsx:121` |
   | `cover-confusion` | `phase !== 'done'` | `CoverConfusionMode.tsx:114` |
   | `hint-master` | `!isRevealed` | `HintMasterMode.tsx:133` |
   | `vibe-check` | `false` (Ausnahme) | `VibeCheckMode.tsx:99` |
3. **Hint-Zensur:** `censorHint(hint, artist, title)`
   (`src/utils/censor-utils.ts:11`) ersetzt Titel-/Artist-Token in Hinweisen
   durch `[XXX]`; aufgerufen in `src/components/game/modes/HintMasterMode.tsx:156`.
   Die Regeln stehen in `src/config/spoiler-config.ts`.
4. **Projektor:** `src/app/projector/page.tsx:1-9` hält fest, dass dort
   „kein Artist, kein Titel, kein Album-Art" erscheint.

**Gemessene Lücke:** `advancePhase(phase)` (`src/stores/game-store.ts:439-441`)
setzt `roundPhase` **ohne jede Prüfung**. Es existiert kein `answersLocked`
-Flag im Code (`grep -rn "answersLocked" src` → 0 Treffer), und die Phase
`'locked-in'` wird zwar im Typ
(`src/types/game-state.ts:31`) und im Audio-Hook
(`src/hooks/useGameAudioCues.ts:9`) geführt, aber **nirgends gesetzt**. Der
Reveal ist damit nicht an „alle Antworten sind abgegeben" gekoppelt, sondern an
den Klick des Piloten. Details in ADR-0003.

---

## 5. Grenzen

### 5.1 Admin-API-Grenze

**Was in die Admin-API darf rein:** ausschließlich administrative Operationen auf
dem Katalog (Cover suchen, Cover speichern) — Operationen, die nicht in der
Spielsitzion stattfinden und Dateisystem-Schreibzugriff brauchen.

**Was nicht hinein darf:**

| Verboten | Begründung |
|---|---|
| Spielzustand (Store, `currentSong`, Punkte, Runden) | Der Store ist der einzige schreibende Zustandshalter (§4.1). Eine API, die Spielzustand verändert, erzeugt eine zweite Wahrheit. |
| Katalog-Mutation ohne Token | `assertAdminAccess` (`src/admin-api/_lib/security.ts:13-28`) erzwingt `x-admin-token` gegen `process.env.ADMIN_API_TOKEN` mit `timingSafeEqual` und Mindestlänge 32. |
| Unbegrenzte oder ungeprüfte Eingaben | `parseSongId` (`:37`), `parseHttpUrl` (`:44`, nur HTTPS, nur Allowlist-Hosts), `boundedText` (`:30`) |
| Fremde Hosts / beliebige URLs | `ALLOWED_IMAGE_HOSTS` (`src/admin-api/admin/covers/save/route.ts:11`) |
| Unbegrenzte Dateigrößen | `MAX_IMAGE_BYTES = 5 * 1024 * 1024` mit Header- **und** Inhaltsprüfung (`route.ts:10`, `:56-63`) |
| Datenbank-/Cloud-Zugriff | Die App ist ein statischer Export; es gibt keine Server-Datenbank. |
| Clientseitiges Ausliefern des Tokens | `ADMIN_API_TOKEN` ist eine Server-Env-Variable (`security.ts:14`), kein `NEXT_PUBLIC_*`. Ein Client, der den Admin-API braucht, braucht einen serverseitigen Proxy. |

**Ist-Status (gemessen):** `src/admin-api/` enthält 3 Dateien, hat **0 Konsumenten**
und ist **nicht erreichbar** — es gibt keine `route.ts` unter `src/app/` und
`next.config.ts:4` setzt `output: 'export'`. Siehe §3.3 A4.

### 5.2 i18n-Grenze

**Wo übersetzt wird:** ausschließlich an der Oberflächen-Grenze, in den
Client-Komponenten, über `useTranslation()` aus `react-i18next`.

```text
src/i18n/config.ts          Bootstrap: i18n.use(LanguageDetector).use(initReactI18next).init(…)
src/i18n/locales/de.json    25 Schlüssel (flach verschachtelt: app, landing, settings,
src/i18n/locales/en.json    themes, modes, common)
src/components/Providers.tsx:20   import('@/i18n/config')  ← einziger Bootstrap
```

**Warum nicht in den Komponenten übersetzt wird — und warum das falsch wäre:**
Eine Komponente, die selbst übersetzt, entscheidet über Text, Platzierung und
Ton. Das erzeugt drei Fehlerquellen: (1) derselbe Text erscheint in mehreren
Sprachständen unterschiedlich, (2) Markup und Text werden untrennbar, (3) die
Schlüsselzahl wächst ohne Aussage über den sichtbaren Textraum. Die
Übersetzung gehört deshalb in **Ressourcen-Dateien**, nicht in Komponenten —
das ist genau die Struktur von `src/i18n/locales/`.

**Ist-Status (gemessen):**

| Kennzahl | Wert | Kommando |
|---|---|---|
| Schlüssel in `de.json` / `en.json` | 25 / 25, schlüsselparallel | JSON-Flat-Count, 0 Unterschiede |
| Dateien mit `useTranslation` | **4** | `grep -rl "useTranslation" src` → `app/page.tsx`, `components/ui/LanguageSwitcher.tsx`, `components/ui/NavBar.tsx`, `components/ui/ThemeSwitcher.tsx` |
| Dateien mit deutschen UI-Literalen | **56 von 73** (ohne Testdateien) | Vokabular-Scan über 60 deutsche UI-Begriffe → 746 Treffer |
| Sprachumfang der Übersetzung | nur `app`, `landing`, `settings`, `themes`, `modes`, `common` | `de.json` |
| Bootstrap-Gate | `Providers` rendert `null`, bis i18n geladen ist | `src/components/Providers.tsx:25-27` |

> **Kernbefund:** Die i18n-Infrastruktur ist vorhanden und korrekt verdrahtet, aber
> sie deckt derzeit nur die Navigationsleiste, den Theme-Switcher, den
> Language-Switcher und die Landing-Page ab. Der gesamte Spielbereich
> (`lobby`, `game`, `game-over`, `projector`, `browse`, `admin`, `settings/*`)
> ist **hartkodiertes Deutsch**. Details in ADR-0004.

### 5.3 Daten- und Kataloggrenze

```text
src/data/songs/*.json      136 Pack-Dateien (A1…Z, Ñ, NUMBERS, OTHERS, Q, U, X …)
src/data/songs/packs.json  Pack-Metadaten
src/data/songs/index.ts    GENERIERTER Loader — Kopfzeile: „generated by
                           scripts/migrate_and_deduplicate.py. Do not edit it manually."
                           exportiert ALL_SONGS, PACKS_METADATA, AVAILABLE_PACKS,
                           getSongsForPacks
src/data/packs/index.ts    Legacy-Proxy: export * from '@/data/songs'
```

**Regeln:**

1. Der Katalog ist **Daten, keine Logik**. `src/data/` enthält keine
   Spielregel, keinen React-Code und keine Seiteneffekte.
2. `src/data/songs/index.ts` ist generiert. Änderungen laufen über
   `scripts/migrate_and_deduplicate.py` bzw. `npm run update-pack` /
   `npm run upsert-song`, nicht über Hand-Edit.
3. Auswahl- und Filterlogik gehört nach `src/utils/song-picker.ts`. Die
   Katalog-Datei liefert nur Daten.
4. Validierung ist ein **Werkzeug**, kein Laufzeit-Code:
   `src/utils/validate-song-data.ts` (493 Zeilen) und
   `src/utils/validate-song-catalog.ts` (271 Zeilen) laufen über
   `npm run validate-songs` / `npm run validate-catalog`. Sie sind **nicht**
   in den Client-Bundle eingebunden — der Import-Graph bestätigt: `utils → data`
   existiert genau **1×**, und zwar in `src/utils/song-picker.ts:4`.
5. Jahresgrenzen kommen aus `src/config/song-year-range.ts`
   (`MIN_SONG_YEAR = 1500`, `MAX_SONG_YEAR_OFFSET = 1`), nicht aus Validator-Code.

**Schwellenprüfung des Katalogs:** `npm run validate-catalog:report` schreibt
den Report; `scripts/check-phase1-acceptance.js` wertet ihn aus.

### 5.4 Audio-Grenze

```text
src/utils/game-audio-cues.ts   GAME_SFX (correct/incorrect/reveal/win/lose),
                                MODE_CUES (ein Cue je GameMode)
src/hooks/useGameAudioCues.ts  Spiel-Logik des Abspielens: Phasenwechsel,
                                Antwortzähler, Game-Over. Nutzt einen
                                Map-Cache je Asset, `audio.currentTime = 0` vor
                                jedem Play, `volume = clamp(volume × sfxVolume)`.
src/components/game/MusicPlayer.tsx  Musik-Playback (YouTube IFrame API,
                                Spotify Free/Premium, Amazon Prime/Premium).
```

**Regeln:**

1. **Musik und SFX sind getrennte Kanäle.** SFX (`useGameAudioCues`) sind
   One-Shots von ≤ 0,34 s und unterbrechen den Musikfluss nie
   (`src/hooks/useGameAudioCues.ts:39-61`).
2. **Fehlende Assets sind kein Fehler.** Der Hook fängt jeden Fehler ab
   (`:55-60`) — der Spielablauf darf nie an einer Datei in `public/audio/` hängen.
3. **Der Store steuert die Lautstärke**, nicht der Hook:
   `musicEnabled`/`musicVolume`/`sfxEnabled`/`sfxVolume` liegen im Store
   (`src/types/game-state.ts:199-208`) und sind persistiert
   (`src/stores/game-store.ts:630-633`).
4. **Die Provider-Auswahl gehört dem Store**, nicht der Komponente:
   `preferredMusicProvider` (`src/stores/game-store.ts:423-426`) entscheidet, ob
   YouTube, Spotify Free/Premium oder Amazon Prime/Premium verwendet wird
   (`src/components/game/MusicPlayer.tsx:167-170`).
5. **Autoplay-Sperren sind ein erwarteter Zustand.** `PHOMU_CONFIG.COUNTDOWN_SECONDS`
   ist als Autoplay-Workaround vorgesehen (`src/config/game-config.ts:81`), wird
   aber **nirgends verwendet** (siehe §8).
6. **Kein Provider-Code in der Spiellogik.** Der `MusicPlayer` kapselt alle
   provider-spezifischen Details (`extractAmazonTrackId`, `extractSpotifyTrackId`).

---

## 6. Dateigrößen-Regel

**Regel:** Ziel **≤ 400 Zeilen** je Quelldatei. **Maximum 550 Zeilen** — darüber
ist eine Datei nicht mehr reviewbar und muss vor dem Merge geteilt werden.
Maßgeblich ist die **physische Zeilenzahl** (`wc -l`).

**Messkommando:**

```bash
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 \
  | xargs -0 wc -l | sort -rn | awk '$2 != "total" { printf "%6d  %s\n", $1, $2 }'
```

**Umfang:** 77 Dateien (`*.ts`/`*.tsx`) unter `src/`.

### 6.1 Verstöße gegen das harte Maximum (> 550 Zeilen) — 7 Dateien

| # | Datei | Zeilen | über Maximum um |
|---|---|---|---|
| 1 | `src/app/admin/review/page.tsx` | **755** | +205 |
| 2 | `src/app/lobby/page.tsx` | **744** | +194 |
| 3 | `src/components/game/RevealPhase.tsx` | **671** | +121 |
| 4 | `src/stores/game-store.ts` | **640** | +90 |
| 5 | `src/components/game/MusicPlayer.tsx` | **630** | +80 |
| 6 | `src/components/game/modes/TimelineMode.tsx` | **579** | +29 |
| 7 | `src/app/browse/page.tsx` | **572** | +22 |

### 6.2 Verstöße gegen das Ziel (401–550 Zeilen) — 3 weitere Dateien

| # | Datei | Zeilen | über Ziel um |
|---|---|---|---|
| 8 | `src/utils/validate-song-data.ts` | **493** | +93 |
| 9 | `src/app/game/page.tsx` | **466** | +66 |
| 10 | `src/app/admin/songs/page.tsx` | **445** | +45 |

**Gesamt:** 7 harte Verstöße (> 550), 10 Verstöße gegen das Ziel (> 400).

**Zusätzlich:** `src/config/game-config.ts` (326 Zeilen) enthält 28
`SONG_PACKS`-Einträge mit Marketingtext und ist damit eher ein **Datenkatalog**
als Konfiguration — die Frage, ob die Pack-Metadaten in die Konfiguration oder
nach `src/data/` gehören, ist offen.

**Gate:** `scripts/check-file-size.mjs` (im `CONTRACT.md` §6 vorgesehen) existiert
**noch nicht** — `ls scripts/ | grep check` liefert nur
`check-phase1-acceptance.js`. Der Zustand ist damit **nicht** automatisch
abgesichert.

### 6.3 Vorschlag zur Zerlegung (noch nicht umgesetzt)

| Datei | Natürlicher Schnitt |
|---|---|
| `src/app/admin/review/page.tsx` (755) | `ReviewTable`, `ReviewFilters`, `DeltaExport`, `isStub/isComplete` (`:32-50`) |
| `src/app/lobby/page.tsx` (744) | 5 Wizard-Schritte + Konstanten (`:25-55`) + `ModeSelector`/`PackSelector` (bereits extrahiert) |
| `src/components/game/RevealPhase.tsx` (671) | 6 Reveal-Karten (`:185-444`) → `src/components/game/reveal/*`; Texte (`:37-58`, `:76-183`) → `src/utils/reveal-messages.ts` |
| `src/stores/game-store.ts` (640) | Team-Actions (`:529-592`), Timeline-Actions (`:594-615`), `FUNNY_TEAM_NAMES`/`TEAM_COLORS` (`:20-29`) → `src/config/team-names.ts` |
| `src/components/game/MusicPlayer.tsx` (630) | Provider-Adapter (`:96-120`, `:547-619`) → `src/utils/music-providers.ts`; Report-Flow (`:172-237`) → eigene Komponente |
| `src/components/game/modes/TimelineMode.tsx` (579) | Slot-Rendering (`:429-540`) → eigene Komponente |
| `src/app/browse/page.tsx` (572) | Filter/Pagination (`:64-140`), Admin-Modus (`:8`) |

---

## 7. Regeln für den Umgang mit Konfiguration

> **`src/config/` ist die einzige Quelle für Konstanten.**
> Wer eine Konstante braucht, legt sie in `src/config/` ab und importiert sie.
> Wer eine Konstante im Code findet, die in `src/config/` fehlt, ergänzt sie
> dort — und nur dort.

### 7.1 Verbindliche Regeln

1. **Keine Magic Numbers in Komponenten, Stores oder Utils.** Zeitlimits,
   Punktwerte, Spielergrenzen, Pack-IDs, Jahresbereiche, Zensur-Schwellen,
   Request-Limits und Asset-Pfade gehören nach `src/config/`.
2. **`PHOMU_CONFIG` ist der einzige Aggregat-Einstiegspunkt** für
   Spielkonstanten (`src/config/game-config.ts:52-326`). Neben ihm existieren
   genau zwei weitere, thematisch getrennte Konfigurationsmodule:
   `SPOILER_CONFIG` (`src/config/spoiler-config.ts`) und die Jahresbereich-Werte
   (`src/config/song-year-range.ts`).
3. **Kein Import von `config` nach `types`.** Die Richtung ist `types` → nichts,
   `config` → `types` (siehe A2).
4. **Admin-API-Limits** liegen in `src/admin-api/_lib/security.ts` bzw. der
   Route, weil sie serverseitig sind und nicht in den Client-Bundle dürfen.
5. **Konfiguration ist schreibgeschützt.** `PHOMU_CONFIG` ist `as const`; die
   Laufzeitvariation läuft über `GameConfig` im Store, nicht über die
   Konstanten.

### 7.2 Belegte Verstöße (Ist-Stand)

**Werte in `src/config/game-config.ts`, die nirgends konsumiert werden**
(`grep -rn "<KEY>" src --include=*.ts --include=*.tsx` ohne Treffer außer in
`game-config.ts`):

| Schlüssel | Zeile | Wert |
|---|---|---|
| `COUNTDOWN_SECONDS` | 81 | `3` |
| `SPOTIFY_PREVIEW_DURATION` | 82 | `30` |
| `MIN_ROUNDS_TO_PLAY` | 61 | `10` |
| `MAX_ROUNDS_TO_PLAY` | 62 | `30` |
| `FORCE_REMOVE_DUPLICATE_YEARS` | 316 | `true` |
| `DEFAULT_UNLOCK_METHOD` | 313 | `'swipe'` |
| `CARD_WIDTH_MM` | 322 | `59` |
| `CARD_HEIGHT_MM` | 323 | `91` |
| `CARD_BLEED_MM` | 324 | `3` |
| `MAX_CARDS_PER_SET` | 325 | `110` |

**Werte im Store, die in der Konfiguration fehlen** (hartkodiert in
`src/stores/game-store.ts:41-66`):

| Feld | Zeile | Wert | Anmerkung |
|---|---|---|---|
| `targetPoints` | 47 | `100` | widerspricht `DEFAULT_WIN_SCORE: 10` |
| `targetRounds` | 48 | `10` | dupliziert `DEFAULT_ROUNDS_TO_PLAY: 10` |
| `targetTimeMinutes` | 49 | `60` | **kein** Config-Schlüssel vorhanden |

**Konfigurationswerte, die der Code umgeht** (im Code nachgebaut statt aus der
Config gelesen): Spoiler-Mindestlänge, Vorschau-Dauer, Paket-Alias-Anwendung,
Textnormalisierung, Hash-Seed, Hinweis-Anzahl, Admin-Timeouts, Farbpaletten,
Modus-Bezeichnungen. Die vollständige Fundliste steht in
`/workspace/workers/architecture-deliverable.md`.

---

## 8. Bekannte Lücken (gemessen, mit Fundstelle)

| # | Lücke | Fundstelle | Auswirkung | Stand |
|---|---|---|---|---|
| 1 | Kein `answersLocked`; Phase `'locked-in'` wird nie gesetzt | `src/stores/game-store.ts:439`, `src/types/game-state.ts:31` | Der Reveal ist nicht an „alle Antworten abgegeben" gekoppelt (ADR-0003) | **offen** |
| 2 | `advancePhase` prüft nichts | `src/stores/game-store.ts:439-441` | Jede Komponente kann in jede Phase wechseln | **offen** |
| 3 | `overrideGovernance` wird nicht erzwungen | `src/types/game-state.ts:93`, `src/app/game/page.tsx:197-210` | Das Power-User-Menü (`src/components/game/RevealPhase.tsx:604-634`) ist für jeden erreichbar | **offen** |
| 4 | `admin-api/` hat 0 Konsumenten und ist nicht erreichbar | §3.3 A4 | Cover-Suche/-Speicherung funktioniert nicht | **offen** |
| 5 | 56 von 73 Quelldateien enthalten deutsche UI-Literale | §5.2 | Englische Oberfläche ist unvollständig | **behoben** am 2026-10-25: 0 Literaltexte in 48 geprüften TSX-Dateien (`npm run check:i18n`) |
| 6 | `scripts/check-file-size.mjs` fehlt | `ls scripts/` | Das Dateigrößen-Gate existiert nicht; 7 harte Verstöße sind ungesichert | **behoben** am 2026-10-25: Gate existiert, 7 Altlasten sind als dokumentierte Ausnahmen hinterlegt |
| 7 | `scripts/check-i18n-completeness.mjs` fehlt | `ls scripts/` | Die Vollständigkeit der Übersetzung wird nicht geprüft | **behoben** am 2026-10-25: Gate existiert, 1231 Schlüssel parallel in DE und EN |
| 8 | `scripts/check-doc-links.mjs` fehlt | `ls scripts/` | Relative Markdown-Links werden nicht geprüft | **behoben** am 2026-10-25: Gate existiert, 0 tote Links in 57 Markdown-Dateien |
| 9 | 10 Config-Schlüssel ohne Konsument | §7.2 | `src/config/` ist nicht die einzige Wahrheit — sie ist eine von mehreren | **teilweise behoben**: die doppelten Theme-Werte liegen jetzt in `src/config/themes.ts`; die übrigen Schlüssel sind **offen** |
| 10 | `src/app/layout.tsx:32` setzt `lang="de"` fest | `src/app/layout.tsx:32` | Bei `en` bleibt `lang` auf Deutsch | **behoben** am 2026-10-25: `src/components/LanguageHtmlAttribute.tsx` setzt `document.documentElement.lang` auf die aktive Sprache |
| 11 | `src/types/session.ts` wird von niemandem importiert | Import-Graph | Toter Typ-Entwurf | **offen** |

**Neu (2026-10-25):** Der Schlüsselraum der Übersetzung ist typisiert
(`src/i18n/types.ts`, `src/i18n/variant-keys.ts`). Ein Tippfehler in einem
Schlüsselnamen ist ein Compile-Fehler; die Liste der variierten Texte wird aus
`de.json` erzeugt (`npm run generate:variant-keys`), damit Schlüssel und Liste
nicht auseinanderlaufen können.

---

## 9. Weiterführende Dokumente

| Dokument | Inhalt |
|---|---|
| `docs/adr/ADR-0001-schichten-und-abhaengigkeitsrichtung.md` | Schichten, Richtung, Umgang mit Abweichungen |
| `docs/adr/ADR-0002-zustand-store-server-und-url.md` | Zustandshaltung, Persistenz, Server, URL |
| `docs/adr/ADR-0003-anti-spoiler-und-reveal-orchestrierung.md` | Anti-Spoiler-Grenze, Reveal-Orchestrierung |
| `docs/adr/ADR-0004-internationalisierungsgrenze.md` | i18n-Grenze, Schlüsselraum, Migrationspfad |
| `docs/adr/ADR_TEMPLATE.md` | Vorlage für weitere ADRs |
