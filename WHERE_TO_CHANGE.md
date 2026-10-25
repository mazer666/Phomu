# Wo ändere ich was

Diese Datei ist für jemanden geschrieben, der den Code **nicht** kennt. Jeder
Abschnitt beantwortet vier Fragen: **Was** will ich ändern, **wo** steht das,
**wie** gehe ich vor, **welches Kommando** beweist die Änderung.

Wenn du das Verhalten des Produkts ändern willst, lies zuerst
[`REQUIREMENTS.md`](REQUIREMENTS.md) — dort steht jede Verhaltensregel mit
Anforderungs-ID, Akzeptanz und Verifikation.

---

## Ich will einen neuen Spielmodus hinzufügen

Ein Modus ist **keine Datei**, sondern ein Netz aus sieben Stellen. Wer nur die
Komponente anlegt, bekommt einen Modus, den die Lobby nicht anbietet und der
Projektor nicht kennt.

| # | Datei | Was dort hinein muss |
|---|---|---|
| 1 | `src/config/game-config.ts` | Der Modus-Name in die Typ-Liste `GameMode` (z. B. `'quiz-battle'`) und in `ALL_GAME_MODES` |
| 2 | `src/components/game/modes/<Modus>Mode.tsx` | Die Modus-Komponente. Sie bekommt `song`, `onAnswer(isCorrect, pointsAwarded, answeredInSeconds?)` und optional `onReveal` |
| 3 | `src/components/game/QuestionPhase.tsx` | Der Aufruf der neuen Komponente; zusätzlich prüfen, ob der Modus in `MODES_WITH_REVEAL_BUTTON` steht ( Modi mit eigenem Reveal-Button wie `lyrics` und `cover-confusion` stehen dort **nicht**) |
| 4 | `src/components/game/RevealPhase.tsx` | Eine eigene Auflösungskomponente, z. B. `<MeinModus>Reveal song={song} />` |
| 5 | `src/components/lobby/ModeSelector.tsx` | Der Eintrag in der Liste `MODES` (Emoji, Titel, Tagline, Text, Farbverlauf) |
| 6 | `src/components/game/DrawingPhase.tsx` | Der Eintrag in `MODE_META` (Icon, Titel, Anweisung) — sonst bricht die Typprüfung |
| 7 | `src/components/game/GameHeader.tsx` und `src/app/projector/page.tsx` | `MODE_ICONS` / `MODE_LABELS` bzw. `MODE_LABELS` — Icon und Anzeigename |

Datenseitig muss der Song den Modus tragen: das Feld `supportedModes` in
`src/types/song.ts` und in jeder Datei unter `src/data/songs/`. Ohne diesen Eintrag
filtert der Zieher den Modus weg (`src/utils/song-picker.ts`, Filter
`supportedModes`).

**Kommandos:**

```bash
npm run typecheck            # bricht, wenn eine der sieben Stellen fehlt
npm run test
npm run validate-catalog     # Katalog-Gate nach neuen Songs
npm run build
```

---

## Ich will Punkte, Deckelung oder Zeitlimits ändern

**Erst prüfen, ob die Zahl schon zentral steht.** Die Vorgaben liegen in
`src/config/game-config.ts`:

| Wert | Konstante | Vorgabe |
|---|---|---|
| Zielpunktzahl (Gewinnbedingung `points`) | `DEFAULT_WIN_SCORE` | 10 |
| Punkte je Hinweis-Stufe (Hint-Master) | `HINT_MASTER_POINTS` | `[5, 4, 3, 2, 1]` |
| Punkte-Deckelung (Timeline) | `DEFAULT_TIMELINE_MAX_POINTS` | 5 |
| Punkteabzug (Time-Decay) an/aus | `DEFAULT_TIME_DECAY_ENABLED` | `false` |
| Schonfrist vor dem Abzug | `DEFAULT_TIME_DECAY_GRACE_SECONDS` | 5 s |
| Länge eines Abzugschritts | `DEFAULT_TIME_DECAY_STEP_SECONDS` | 5 s |
| Punkte je Abzugschritt | `DEFAULT_TIME_DECAY_STEP_POINTS` | 1 |
| Mindestpunkte bei richtiger Antwort | `DEFAULT_MIN_POINTS_PER_CORRECT` | 1 |
| Zeitlimit je Frage | `config.timeLimitSeconds` | `null` (kein Limit) |

**Achtung:** Vier Modi haben ihre Punkte **nicht** in der Config, sondern fest in der
Komponente:

| Modus | Datei | Punkte |
|---|---|---|
| Lyrics Labyrinth | `src/components/game/modes/LyricsMode.tsx` | `LYRICS_POINTS = 4` |
| Lyrics-Bonusrunde (ohne Songtext) | `src/components/game/modes/LyricsMode.tsx` | 2 |
| Survivor | `src/components/game/modes/SurvivorMode.tsx` | 3 |
| Vibe-Check | `src/components/game/modes/VibeCheckMode.tsx` | 2 (mit Cheat 1) |
| Cover Confusion | `src/components/game/modes/CoverConfusionMode.tsx` | `POINTS_BY_HINTS = [5, 4, 3, 2]`, Variante 3 |
| Cheat-Abzüge | `HintMasterMode.tsx` (−2), `TimelineMode.tsx` (−2 bzw. −1), `SurvivorMode.tsx` (−1) | sofort abgezogen |

Willst du eine dieser Zahlen ändern, ändere **die Konstante an der Stelle, an der
sie steht**, und trage sie anschließend in `REQUIREMENTS.md` nach. Willst du sie
dauerhaft zentralisieren, ziehst du sie zuerst nach `src/config/game-config.ts` —
das ist die Projektregel „Konstanten kommen aus `src/config/`".

Die **auswählbaren Optionen in der Lobby** stehen an anderer Stelle:
`src/app/lobby/page.tsx`, Arrays `TIME_LIMIT_OPTIONS` (kein Limit / 30 s / 60 s /
120 s), `DIFFICULTY_OPTIONS` und die Zahlenlisten für die Gewinnbedingung
(Punkte 50/100/200/500, Runden 5/10/15/20, Zeit 30–240 Minuten).

Die **Time-Decay-Rechnung** selbst steht in `src/app/game/page.tsx` in
`handleAnswered()`:

```ts
const overtime = Math.max(0, answeredInSeconds - config.timeDecayGraceSeconds);
const decaySteps = Math.floor(overtime / Math.max(1, config.timeDecayStepSeconds));
const decayPoints = decaySteps * config.timeDecayStepPoints;
pointsAwarded = Math.max(config.minPointsPerCorrect, basePointsAwarded - decayPoints);
```

**Kommandos:**

```bash
npm run typecheck
npm run test
npm run build
```

---

## Ich will einen Song aufnehmen

Der Katalog liegt in `src/data/songs/`, eine Datei je Buchstaben-Bucket
(`A1.json` … `Z.json`, `Ñ.json`), jede Datei mit dem Feld `songs`.

**Schritte:**

1. **Datensatz anlegen.** Das Objekt muss das Schema aus `src/types/song.ts` erfüllen:
   `id`, `title`, `artist`, `year`, `country`, `genre`, `difficulty`, `mood[]`,
   `hints[5]`, `hintEvidence[5]`, `lyrics` (`null` oder `{ real[3], fake }`),
   `isOneHitWonder`, `packs[]`, `supportedModes[]`, `isQRCompatible`,
   `links.youtube` (Pflicht).
2. **Datei wählen.** Der Bucket wird nach dem ersten Buchstaben des Interpreten
   gebildet; der Generator `scripts/migrate_and_deduplicate.py` legt bis zu 100 Songs
   pro Datei an.
3. **Index neu erzeugen.** `src/data/songs/index.ts` ist automatisch erzeugt
   („Do not edit it manually"). Nach einer neuen Datei muss der Generator laufen:

   ```bash
   python3 scripts/migrate_and_deduplicate.py
   ```

4. **Validieren.** Das Schema-Gate läuft über eine einzelne Datei:

   ```bash
   npm run validate-songs                                    # prüft src/data/songs/A1.json
   npx tsx src/utils/validate-song-data.ts src/data/songs/B1.json
   npm run validate-catalog                                  # Katalog-Gate über alle Dateien
   ```

5. **Cover beschaffen.** Der Abruf läuft über die Admin-API (siehe unten):
   `scripts/fetch-covers.js` sucht Cover über iTunes und Deezer — das Skript
   zielt allerdings noch auf das alte Verzeichnis `src/data/packs/` und muss auf
   `src/data/songs/` umgestellt werden, bevor es wieder Daten findet.
6. **Commit.** Nach `docs/DOCUMENTATION_POLICY.md` gehört die Doku in denselben
   Commit; für einen neuen Song ist das in der Regel der Katalog-Report.

**Regeln, die das Gate prüft:** keine Dubletten (Artist + Titel + Jahr), keine
Titel- oder Interpreten-Spoiler in den Hinweisen, `hintEvidence` mitprüfbarer
Quelle, `mood` nur aus den bekannten Stimmungen, `links.youtube` gesetzt.

---

## Ich will ein Pack hinzufügen

Ein Pack ist eine **Schlüssel-Zuordnung**, kein Ordner.

1. `src/config/game-config.ts`, Array `SONG_PACKS`: ein Eintrag mit `id` (der Key,
   der in `song.packs` steht), `name`, `tagline`, `emoji`, `gradient`.
2. `src/data/songs/packs.json`: ein Eintrag mit demselben Key, optional `pack`,
   `version`, `updatedAt`, `songCount`.
3. In den betroffenen Song-Dateien `packs[]` um den neuen Key ergänzen.
4. Alte Key-Formate (z. B. `global-hits`) über `PACK_ALIASES` in
   `src/config/game-config.ts` auf den neuen Key abbilden — sonst liefern
   gespeicherte Spielstände aus älteren Versionen leere Auswahlen
   (`src/utils/song-picker.ts`, `normalizePackIds()`).

**Kommandos:**

```bash
npm run validate-catalog
npm run build
```

---

## Ich will ein Theme ergänzen

Themes sind CSS-Variablen-Sätze, die über das Attribut `data-theme` am
`<html>`-Element aktiviert werden.

1. `src/styles/themes/<name>.css` anlegen. Der Block muss `[data-theme='<name>']`
   heißen und dieselben Variablen setzen wie die bestehenden Themes
   (`src/styles/themes/jackbox.css` als Vorlage):
   `--color-bg`, `--color-bg-secondary`, `--color-bg-card`, `--color-text`,
   `--color-text-secondary`, `--color-primary`, `--color-primary-hover`,
   `--color-secondary`, `--color-accent`, `--color-success`, `--color-error`,
   `--color-border`, `--font-heading`, `--font-body`, `--radius`.
2. `src/app/globals.css`: den Block in die Liste der Theme-Selektoren aufnehmen
   (dort stehen alle vier `[data-theme='…']`-Regeln nebeneinander).
3. `src/config/game-config.ts`: `ThemeName` erweitern und den Namen in
   `AVAILABLE_THEMES` aufnehmen. `DEFAULT_THEME` bleibt, was es ist.
4. `src/components/ui/ThemeSwitcher.tsx`: Button für das neue Theme.
5. `src/i18n/locales/de.json` **und** `en.json`: Schlüssel unter `themes.<name>`.
6. `src/components/ui/NavBar.tsx`: `THEME_COLORS` um den Akzentton ergänzen.

Das Theme wird in `localStorage` unter `phomu-theme` gespeichert und beim Start
über `src/contexts/ThemeContext.tsx` gesetzt.

**Kommandos:**

```bash
npm run typecheck
npm run build
```

---

## Ich will einen neuen Text übersetzen

Grundregel: **jeder sichtbare Text kommt aus der Übersetzung**, in beiden
Sprachen. Die Schlüssel sind flach mit Punktpfad (`namespace.unterpunkt.bezeichnung`),
in `camelCase`, ohne Interpolation im Schlüssel — Platzhalter stehen im **Wert**
(`{{count}}`).

1. Textstelle finden. Aktuell sind noch Literaltexte im JSX vorhanden; ein
   Beispiel ist der Button in `src/components/game/QuestionPhase.tsx`
   („Alle fertig → Reveal").
2. In `src/i18n/locales/de.json` **und** `src/i18n/locales/en.json` denselben
   Schlüssel anlegen. `en.json` bekommt eine **echte englische** Übersetzung,
   keine Kopie der deutschen Werte.
3. In der Komponente ersetzen. Client-Komponenten:

   ```tsx
   'use client';
   import { useTranslation } from 'react-i18next';
   const { t } = useTranslation();
   return <button>{t('game.allDoneToReveal')}</button>;
   ```

   Server-Komponenten: `getTranslations` aus `next/server`.
4. Eigennamen (Spotify, YouTube, Jackbox, Phomu, Modusnamen) bleiben in beiden
   Sprachen identisch.
5. Pluralformen über `key_one` / `key_other` in beiden Sprachen parallel anlegen.

**Kommandos:**

```bash
npm run check:i18n          # DE/EN vollständig und parallel, kein Literaltext im JSX
npm run typecheck
npm run build
```

Der Gate-Befehl prüft beides: gleiche Schlüssel in `de.json` und `en.json`, keine
leeren Werte, **kein Literaltext mehr im JSX**. Er zählt die verbleibenden
Festtexte — bei der letzten Messung 465 in 47 `.tsx`-Dateien. Jeder ersetzte
Literaltext verschwindet aus dieser Zahl, der Wert ist also eine Momentaufnahme
des Migrationsfortschritts.

---

## Ich will die Admin-API ändern

Die Admin-API liegt unter `src/admin-api/` und ist **nicht** Teil des
statischen Exports: `next.config.ts` setzt `output: 'export'`. Die Routen
funktionieren deshalb nur, solange die App über `next dev` oder `next start`
läuft, nicht im exportierten Static-Build.

| Route | Datei | Zweck |
|---|---|---|
| `GET /admin/covers/search` | `src/admin-api/admin/covers/search/route.ts` | Cover-Suche über iTunes und Deezer |
| `POST /admin/covers/save` | `src/admin-api/admin/covers/save/route.ts` | Cover herunterladen, in `public/covers/` ablegen, `coverUrl` im Pack setzen |
| Guard und Validatoren | `src/admin-api/_lib/security.ts` | Tokenprüfung, Eingabe- und URL-Prüfung |

**Regeln für jede Änderung dort:**

1. Jede Route beginnt mit `assertAdminAccess(request)` und gibt deren Antwort bei
   Fehlern direkt zurück.
2. Eingaben gehen durch `boundedText()`, `parseSongId()` oder `parseHttpUrl()`.
3. Externe Abrufe gehen durch `fetchWithTimeout()`.
4. Bilder nur von HTTPS und nur von Hosts aus `ALLOWED_IMAGE_HOSTS`, maximal 5 MB.
5. **Jede Härtung braucht einen negativen Test:** fehlender Token, zu kurzer Token,
   manipulierte URL, nicht erlaubter Host, zu große Datei.

**Kommandos:**

```bash
npm run typecheck
npm run test
npm run build
```

---

## Ich will den Admin-Token erzeugen oder wechseln

Der Token schützt die Admin-API. Er ist eine Umgebungsvariable und gehört **nicht**
ins Repository.

```bash
# 1. Vorlage anlegen
cp .env.example .env.local

# 2. Token erzeugen — das Skript schreibt den Wert nicht in die Datei,
#    es gibt ihn auf der Konsole aus:
npm run security:rotate-admin-token

# 3. Ausgabe in .env.local eintragen:
#    ADMIN_API_TOKEN=<der ausgegebene Hex-String>
```

Alternativ von Hand: `openssl rand -hex 32`. Das Skript
`scripts/generate-admin-token.js` erzeugt 32 Byte als Hex (64 Zeichen), wenn
`ADMIN_TOKEN_BYTES` nicht gesetzt ist; ein kleinerer Wert wird abgelehnt.

Die Mindestlänge beträgt **32 Zeichen** (`MIN_ADMIN_TOKEN_LENGTH` in
`src/admin-api/_lib/security.ts`). Ist `ADMIN_API_TOKEN` nicht gesetzt, antwortet die
API mit **503** („Admin API not configured"), mit einem zu kurzen Token ebenfalls
**503**, mit einem falschen Token mit **401**.

**Kommandos:**

```bash
npm run typecheck
npm run test
```

---

## Ich will das Drucklayout ändern

Die Kartenmaße stehen in `src/config/game-config.ts`:

| Konstante | Wert | Bedeutung |
|---|---|---|
| `CARD_WIDTH_MM` | 59 | Kartenbreite |
| `CARD_HEIGHT_MM` | 91 | Kartenhöhe |
| `CARD_BLEED_MM` | 3 | Beschnitt rundum |
| `MAX_CARDS_PER_SET` | 110 | Karten je Set |

Das sind die einzigen vier Stellen — es gibt **keine** Zeichenfunktion, die sie
verwendet. Ein Druck- oder Export-Werkzeug ist **nicht implementiert**.

Was der QR-Scanner versteht, steht in `src/utils/qr-intent.ts`:

| Inhalt | Bedeutung | vom Spiel verarbeitet? |
|---|---|---|
| `@Name` | Spieler zur Lobby hinzufügen | ja |
| `…?pack=<packId>` | Pack in der Lobby auswählen | ja |
| `…?session=<code>` | Sitzung beitreten | Parser ja, Spiel nein |
| `…?id=<songId>` | Song öffnen | ausdrücklich **nicht** (`unsupported-song-link`) |

Wenn du das Layout änderst, ändere die vier Konstanten in
`src/config/game-config.ts`, passe das Format im Druck-Guide an
([`docs/guides/PRINTING-GUIDE.md`](docs/guides/PRINTING-GUIDE.md)) und prüfe, ob
ein neues Payload-Format in `src/utils/qr-intent.ts` aufgenommen werden muss.

**Kommandos:**

```bash
npm run typecheck
npm run test -- qr-intent
```

---

## Ich will einen Test schreiben

| Ebene | Ort | Werkzeug |
|---|---|---|
| Unit (Utilities) | `src/utils/*.test.ts` | Vitest |
| Unit (Komponente) | `src/components/**/*.test.ts(x)` | Vitest |
| E2E | `e2e/*.spec.ts` | Playwright |

Vorhandene Beispiele: `src/utils/qr-intent.test.ts` (4 Tests),
`src/utils/validate-song-data.test.ts` (8 Tests),
`src/components/game/MusicPlayer.test.ts` (7 Tests),
`src/utils/ai-task-queue.test.ts` (2 Tests).

**Unit-Test:**

```bash
npm run test -- qr-intent          # eine Datei
npm run test                        # alles mit Coverage
```

**E2E-Test:** Die Browser müssen einmalig installiert sein.

```bash
npm run test:e2e:install            # Chromium
npm run test:e2e:install:linux      # nur Linux: fehlende Systembibliotheken
npm run test:e2e:smoke              # der Smoke-Test
```

Der Playwright-Runner startet selbst einen Dev-Server auf Port 3000
(`playwright.config.ts`, `webServer.command = 'npm run dev'`). Läuft dort schon
etwas, setze `E2E_BASE_URL` auf die vorhandene Instanz.

**Regeln:** Jede Verhaltensänderung braucht einen Test, der das Verhalten **ausführt**,
nicht nachahmt. Kein `skip`, kein `@Ignore`, kein auskommentierter Test, damit ein
Gate grün wird. Jede Härtung braucht zusätzlich einen **negativen** Test.

---

## Ich will die CI erweitern

Aktuell existiert **eine** Workflow-Datei:
`.github/workflows/deploy.yml`. Sie baut die Seite und veröffentlicht sie nach
GitHub Pages. Sie läuft nur bei Pushed auf `main` und manuelle Starts; sie führt
**weder** Typecheck noch Lint noch Tests aus.

**Neuen Job hinzufügen** (Datei `.github/workflows/quality.yml`):

```yaml
name: Quality

on:
  push:
    branches: ["main", "feature/**"]
  pull_request:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run validate-catalog
      - run: npm run build
```

**Node-Version:** `package.json` enthält **kein** `engines`-Feld. Die Version 20 ist
aus `.github/workflows/deploy.yml` abgeleitet (`node-version: "20"`). Wenn du eine
andere Version brauchst, ändere beide Stellen gleichzeitig — oder füge zuerst
`engines` in `package.json` hinzu.

**Lokal dasselbe fahren:**

```bash
npm run local-ci
```

`scripts/local-ci.sh` führt Typecheck, Lint, Unit-Tests, Format-Check (nicht blockierend),
`validate-songs`, `validate-catalog`, Build und `npm audit` in dieser Reihenfolge aus.

---

## Ich will ein Verhalten ändern (Spielregel, Punkte, Ablauf)

1. In [`REQUIREMENTS.md`](REQUIREMENTS.md) die Anforderung suchen, die das Verhalten
   beschreibt, oder eine neue mit der nächsten freien ID der Domäne anlegen
   (`GAME`, `LOBBY`, `MEDIA`, `UI`, `I18N`, `CAT`, `SEC`, `CORE`, `NFR`).
2. Materielle Änderungen brauchen einen Change Request unter `docs/cr/`.
3. Umsetzen, Test schreiben, Doku im selben Commit aktualisieren — die Zuordnung
   steht in [`docs/DOCUMENTATION_POLICY.md`](docs/DOCUMENTATION_POLICY.md).
4. Nachweisen:

   ```bash
   npm run local-ci
   ```

---

## Ich will die Doku ändern

| Ich ändere | Dann aktualisiere ich |
|---|---|
| einen Begriff | [`GLOSSARY.md`](GLOSSARY.md) |
| eine Zahl in `src/config/` | die Fundstelle in der Doku, die sie nennt — die Konstante selbst bleibt die einzige Wahrheit |
| einen Spielmodus | `REQUIREMENTS.md`, `docs/user-guide/USER-GUIDE.de.md` **und** `docs/user-guide/USER-GUIDE.en.md`, `docs/BEST_IN_CLASS.md` |
| die Oberfläche | `docs/user-guide/USER-GUIDE.de.md` **und** `docs/user-guide/USER-GUIDE.en.md` |
| den Katalog | den Katalog-Report, nicht die Zahlen im README |

Bestehende Doku im Repo-Root (`README.md`, `CONTRIBUTING.md`, `SECURITY.md`,
`LLM.md`, `PRINTING_GUIDE.md`) bleibt an ihrem Platz; `PRINTING_GUIDE.md` verweist auf
[`docs/guides/PRINTING-GUIDE.md`](docs/guides/PRINTING-GUIDE.md).

---

## Ich weiß nicht, wo die Datei liegt

Der Index aller Dokumente steht in [`docs/README.md`](docs/README.md). Die
Schichten des Codes und ihre Abhängigkeitsrichtung stehen in
[`ARCHITECTURE.md`](ARCHITECTURE.md).
