# Qualitätsziele — „Best in Class"

„Best in Class" ist hier **ein Messstandard, kein Marketingversprechen**. Jedes Ziel
nennt einen Zielwert, eine Messmethode und den aktuellen Stand. Was nicht gemessen
wurde, steht als **„nicht gemessen"** — eine geschätzte Zahl wäre schlimmer als
keine.

**Stand der Messungen:** 2026-04 (Branch `feature/vocument-style-docs-and-i18n`).
Alle Werte unten stammen aus Kommandos, die im Repo laufen; das Kommando steht bei
jedem Ziel.

**Die Trennung:** Die *Vorgabe* (was das Projekt anstrebt) steht in
[`../REQUIREMENTS.md`](../REQUIREMENTS.md) und [`../QUALITY.md`](../QUALITY.md). Die
*Messung* (was heute true ist) steht hier. Beides gehört zusammen und wird im
selben Commit gepflegt.

---

## 1. Startzeit

| | |
|---|---|
| **Zielwert** | First Contentful Paint ≤ 1,5 s auf einem Mittelklasse-Smartphone über WLAN; Largest Contentful Paint ≤ 2,5 s |
| **Messmethode** | Lighthouse (Performance) gegen den statischen Export `out/`, mobil simuliert, Mittelwert aus 5 Läufen; zusätzlich manueller Zeitpunkt der ersten sichtbaren Karte |
| **Aktueller Stand** | **nicht gemessen** — es existiert keine Performance-Messung im Repo, weder ein Lighthouse-Lauf noch eine Web-Vital-Erfassung |

**Warum das noch offen ist:** Die App ist ein statischer Export ohne Server. Für
eine belastbare Zahl braucht es einen wiederholbaren Aufbau (feste Dateigröße,
fester Geräte-Emulator, fünf Läufe). Der erste Kandidat für den Flaschenhals ist
der Katalog-Chunk — siehe Abschnitt 3.

---

## 2. Rundenübergang-Latenz

| | |
|---|---|
| **Zielwert** | Der Wechsel von „Karte ziehen" zu „Frage sichtbar" ≤ 500 ms; der Wechsel von „Reveal" zur nächsten Runde ≤ 300 ms |
| **Messmethode** | Zeitstempel in `performance.now()` um `advancePhase()` herum, median über 50 Runden eines Testspiels mit 6 Spielern |
| **Aktueller Stand** | **nicht gemessen** — im Code existiert keine Zeitmessung, und die Phase wird in `src/app/game/page.tsx` über `AnimatePresence` mit 0,3 s Übergang animiert (Konstante `PHASE_VARIANTS`, `transition: { duration: 0.3 }`) |

**Erwartbarer Engpass:** Der Musikplayer bleibt über den Reveal-Übergang montiert
(`src/app/game/page.tsx`, `display: none` statt Unmount), damit das YouTube-Iframe
nicht neu startet. Das ist gewollt, kostet aber Zeit beim ersten Aufbau des
Iframes in jeder Runde.

---

## 3. Bundle-Größe

| | |
|---|---|
| **Zielwert** | JavaScript gesamt ≤ 1,5 MB ungepackt **und** ≤ 600 KB gzip; der größte Einzel-Chunk ≤ 800 KB ungepackt; der statische Export gesamt ≤ 20 MB |
| **Messmethode** | `npm run build`, danach `find .next/static/chunks -name "*.js" -printf "%s\n"` (Summe) und `cat .next/static/chunks/*.js \| gzip -c \| wc -c`; Export-Größe über `du -sh out` |
| **Aktueller Stand** | **4.425.934 Byte (4,22 MiB) ungepackt / 1.304.143 Byte (1,24 MiB) gzip** in 32 Chunks; **größter Einzel-Chunk 2.845.675 Byte (2,71 MiB) / 840.841 Byte gzip**; **statischer Export 147 MB**, davon 142 MB Coverbilder (1.649 Dateien in `out/covers`) und 4,5 MB `out/_next` |

**Erfüllt:** nein. Weder die 1,5 MB ungepackt noch die 600 KB gzip noch die 20 MB
Gesamtexport werden erreicht.

**Bekannte Ursache:** Der Katalog (1.615 Songs) liegt als JSON im Bundle und wird
beim Start in den Client geladen. Der 2,71-MiB-Chunk ist genau dieser
Datenblock. Wer die Größe senken will, muss den Katalog aus dem initialen Bundle
nehmen (Nachladen pro Pack, Web-Worker-Parsing oder ein schlankeres
Startmanifest) — **nicht** die Coverbilder: die sind statische Dateien und
kosten keinen JavaScript-Transfer, nur Download-Zeit.

**Nebenbefund:** 1.649 Coverbilder bei 142 MB ergeben im Mittel rund 86 KB pro
Bild. Für den Export ist das vertretbar, für den Erstdownload eines Packs ist es
die eigentliche Zeitfrage.

---

## 4. i18n-Vollständigkeit

| | |
|---|---|
| **Zielwert** | `de.json` und `en.json` sind vollständig parallel (gleiche Schlüssel, keine leeren Werte), **0** Literaltexte im JSX, `html lang` folgt der gewählten Sprache |
| **Messmethode** | `npm run check:i18n` (`scripts/check-i18n-completeness.mjs`) |
| **Aktueller Stand** | **Schlüssel: 25 in `de.json`, 25 in `en.json`, parallel, 0 leere Werte** — erfüllt. **Literaltexte: 465 Verstöße in 47 geprüften `.tsx`-Dateien** (`GESAMT: 465 Verstöße, 465 Literaltexte`) — nicht erfüllt. Die Migration läuft, der Wert sinkt; er war bei der ersten Messung dieser Doku 624 und ist damit **eine Momentaufnahme**, kein Endstand. **Dateien mit `useTranslation()`: 4** (`src/app/page.tsx`, `src/components/ui/NavBar.tsx`, `LanguageSwitcher.tsx`, `ThemeSwitcher.tsx`). **Sprachkopplung:** Das server-gerenderte HTML backt Deutsch (`<html lang="de">`, Titel aus `de.json`, `src/app/layout.tsx`); die Navigationsleiste setzt `document.title` und `document.documentElement.lang` clientseitig auf die aktive Sprache (`src/components/ui/NavBar.tsx:43-44`) |

**Was das Gate noch nicht abdeckt:** Der Seitentitel und die Beschreibung in
`src/app/layout.tsx` werden **serverseitig aus `de.json` gebacken** — der
statische Export liefert also immer die deutsche Fassung aus. Das ist vertretbar,
solange der Client nachzieht; die Navigationsleiste setzt Titel und `lang`
korrekt. Ein **Metadaten-Snippet** (OG-Bild, Beschreibung) bleibt englisch, weil
es im statischen Export nicht je Sprache erzeugt werden kann.

---

## 5. Kontrast

| | |
|---|---|
| **Zielwert** | Alle sichtbaren Texte und Bedienelemente erreichen mindestens **WCAG 2.1 AA**: 4,5:1 für Fließtext, 3:1 für große Schrift und Bedienelemente; jedes Theme einzeln geprüft |
| **Messmethode** | `axe-core` (Browser-Erweiterung oder Playwright) über die Routen `/Phomu`, `/Phomu/lobby`, `/Phomu/browse`, `/Phomu/game`, `/Phomu/projector` je im hellsten und im dunkelsten Theme (`jackbox`, `musicwall`) |
| **Aktueller Stand** | **nicht gemessen** — es gibt keine Kontrastprüfung im Repo, kein axe-Setup und keine dokumentierten Kontrastverhältnisse |

**Bekannte Risikostellen** (aus dem Code gelesen, nicht gemessen): In den
Modus-Komponenten werden Texte mit niedriger Deckkraft auf farbigem Grund
dargestellt, etwa `opacity-40` und `opacity-30` auf `--color-accent`
(`src/components/game/modes/HintMasterMode.tsx`). Opazität reduziert den
Kontrast rechnerisch — das muss gemessen, nicht geschätzt werden.

---

## 6. Tastaturbedienung

| | |
|---|---|
| **Zielwert** | Jede Spielmechanik ist ohne Maus bedienbar; sichtbarer Fokus auf allen Bedienelementen; Touch-Ziele ≥ 44 px Höhe |
| **Messmethode** | Manuelle Traversierung jeder Route mit `Tab`/`Pfeiltasten`/`Enter`; zusätzlich `grep -rn "addEventListener('keydown'" src` und `grep -rho "min-h-\[44px\]" src --include=*.tsx \| wc -l` |
| **Aktueller Stand** | **Tastatur-Listener: 1** (`src/components/game/modes/TimelineMode.tsx`, Zahlen 1–n wählen, Pfeiltasten bewegen, `Enter`/`Leertaste` bestätigen). **Touch-Ziele mit `min-h-[44px]`: 4 Dateien** (`QuestionPhase.tsx`, `modes/SurvivorMode.tsx`, `lobby/ModeSelector.tsx`, `lobby/PackSelector.tsx`) — die übrigen Bedienelemente setzen die Höhe über Padding. **`focus:ring-2`: 16 Fundstellen**, davon **0** `focus-visible:` — der Fokusring erscheint also auch bei Mausklicks. **Kein `role=`-Attribut** im gesamten `src/` |

**Erfüllt:** nein. Die Timeline ist vollständig tastaturbedienbar, die übrigen fünf
Modi nicht. Das ist die wichtigste erreichbare Lücke, weil sie eine ganze
Spielmechanik betrifft.

---

## 7. Fehlerbehandlung

| | |
|---|---|
| **Zielwert** | Jeder Fehlerfall hat eine sichtbare, benannte Meldung und keinen Absturz; **0** unbehandelte Fehler im Normalbetrieb; jede Härtung hat einen negativen Test |
| **Messmethode** | `grep -rc "catch" src --include=*.ts --include=*.tsx`; manuelle Fehlerfälle (kein Netz, defekter Song, fehlender Token, blockierter Ton) gegen die Checkliste in [`guides/TROUBLESHOOTING.md`](guides/TROUBLESHOOTING.md) |
| **Aktueller Stand** | **12 Dateien mit `catch`-Blöcken.** Die Admin-API antwortet geschützt: **503** bei fehlender oder zu kurzer Konfiguration (`ADMIN_API_TOKEN` < 32 Zeichen), **401** bei falschem Token, zeitkonstanter Vergleich über SHA-256. Im Spiel sind benannt: „Keine Songs verfügbar. Bitte prüfe dein Song-Pack." (`src/components/game/DrawingPhase.tsx`), „Video kaputt? Neu würfeln" (`src/components/game/QuestionPhase.tsx`), „Kamera konnte nicht initialisiert werden." (`src/components/game/QRScannerModal.tsx`), „Der Ton wird von deinem Browser blockiert" (übersetzt in `src/i18n/locales/de.json`) |

**Lücke:** Der Autoplay-Blocker des Browsers wird **stumm** geschluckt:
`void audio.play().catch(() => { … })` in `src/components/game/MusicPlayer.tsx`
(Zeilen 399 und 412) — der Spieler sieht keinen Hinweis, dass er selbst starten
muss. Ein sichtbarer Text dafür ist **noch nicht** angelegt: Der in
`CONTRACT.md` §5.2 vorgesehene Schlüssel `errors.audioBlocked` steht noch nicht in
`src/i18n/locales/de.json`.

---

## 8. Katalogqualität

| | |
|---|---|
| **Zielwert** | **0** Schema-Fehler, **0** unerlaubte Dubletten, **0** fehlende Jahre zwischen 1950 und dem laufenden Jahr, **0** Spoiler in den Hinweisen; Warnungen nur als Hinweis, nicht als Fehler |
| **Messmethode** | `npm run validate-catalog` (Gate gegen die Baseline) und `npm run validate-songs` (Schema je Datei) |
| **Aktueller Stand** | **1.615 Songs** in 135 JSON-Dateien. **0** Schema-Fehler, **126** Schema-Warnungen, **0** Dublettengruppen, **4** erlaubte Dubletten (Allowlist), **0** ignorierte Sekundärdubletten, **0** fehlende Jahre 1950–2026. Zusätzlich: `npm run validate-songs` prüft standardmäßig **nur `src/data/songs/A1.json`** (12 Songs, gültig) — die übrigen 134 Dateien prüft nur das Katalog-Gate |

**Offen:** Die 126 Schema-Warnungen sind nicht aufgeschlüsselt. Welche Feldregel
sie auslöst, geht aus der Gate-Ausgabe nicht hervor; wer sie auflösen will,
braucht den Report (`npm run validate-catalog:report` →
`specifications/catalog_issues_report.json`).

---

## 9. Testabdeckung

| | |
|---|---|
| **Zielwert** | ≥ 80 % Zeilenabdeckung über `src/`, **jede** Kernlogik (`song-picker`, `qr-intent`, `game-store`, `censor-utils`, `ai-task-queue`) mit Unit-Test, ein E2E-Test, der die Kernjourney **inhaltlich** prüft (nicht nur die URL) |
| **Messmethode** | `npm run test` (Vitest mit v8-Coverage); Coverage-Schwelle in `vitest.config.ts` |
| **Aktueller Stand** | **23,29 % Statements, 28,40 % Branches, 21,05 % Functions, 24,94 % Lines** über alle gemessenen Dateien. **4 Testdateien, 21 Tests**, alle grün: `src/utils/validate-song-data.test.ts` (8), `src/components/game/MusicPlayer.test.ts` (7), `src/utils/qr-intent.test.ts` (4), `src/utils/ai-task-queue.test.ts` (2). **0 Tests** für `song-picker.ts`, `censor-utils.ts`, `feedback-messages.ts`, `game-store.ts` und **0** Tests für alle React-Komponenten außer `MusicPlayer` |

**Erfüllt:** nein, deutlich nicht. Zwei konkrete Lücken:

1. **Die Punkterechnung ist ungetestet.** Weder `PHOMU_CONFIG.HINT_MASTER_POINTS`
   noch die Modus-Punktelogik noch die Time-Decay-Rechnung in
   `src/app/game/page.tsx` haben einen Test.
2. **Der E2E-Smoke-Test prüft URLs, nicht die Anwendung.**
   `e2e/smoke.spec.ts` navigiert zu `'/'`, `'/lobby'`, `'/game'`, `'/game-over'`,
   `'/browse'`, `'/settings'` — **ohne** den Base-Path `/Phomu`. Diese Pfade
   liefern HTTP 404. Die Assertions prüfen nur das URL-Muster, deshalb ist der
   Test grün, obwohl keine einzige Seite geladen wurde.

**Korrektur des Smoke-Tests** (eine Zeile plus ein Inhalts-Assert):

```ts
await page.goto('/Phomu/');
await expect(page.getByRole('heading', { name: 'Phomu' })).toBeVisible();
```

---

## 10. Weitere Gates, die heute messbar sind

| Ziel | Zielwert | Aktueller Stand | Kommando |
|---|---|---|---|
| TypeScript strict | 0 Fehler | **grün** | `npm run typecheck` |
| ESLint | 0 Fehler | **0 Fehler, 1 Warnung** (`playwright.config.ts`, anonymes Default-Export) | `npm run lint` |
| Formatierung | Prettier ohne Abweichung | nicht blockierend, im `local-ci` enthalten | `npm run format:check` |
| Produktions-Build | Build läuft durch | **grün** (statischer Export nach `out/`) | `npm run build` |
| Abhängigkeits-Audit | 0 Befunde ab „moderate" | im `local-ci` enthalten | `npm audit --omit=dev --audit-level=moderate` |
| Dateigröße der Quelldateien | ≤ 550 Zeilen, weich 400 | **Gate-Ergebnis: 0 Fehler, 6 Warnungen, 4 dokumentierte Altlasten.** Über der harten Grenze von 550 liegen 7 Dateien: `src/app/lobby/page.tsx` (801), `src/components/game/RevealPhase.tsx` (671), `src/stores/game-store.ts` (640), `src/components/game/MusicPlayer.tsx` (630), `src/components/game/modes/TimelineMode.tsx` (579), `src/app/admin/review/page.tsx` (760), `src/app/browse/page.tsx` (575) | `npm run check:file-size` |
| Umfang von `src/` | — | 85 geprüfte Quelldateien | `npm run check:file-size` |

---

## 11. Was als Nächstes gemessen werden muss

Nach Dringlichkeit, gemessen am Abstand zum Zielwert:

1. **Kontrast** (Abschnitt 5) — die größte ungeprüfte Lücke mit direkter Wirkung auf
   die Spielbarkeit. Ein `axe`-Lauf über fünf Routen in zwei Themes genügt.
2. **Testabdeckung der Punkterechnung** (Abschnitt 9) — die Kernmechanik des
   Spiels ist ungetestet.
3. **E2E mit Base-Path und Inhalts-Assert** (Abschnitt 9) — der Smoke-Test prüft
   derzeit nichts.
4. **Startzeit und Rundenübergang** (Abschnitte 1 und 2) — brauchen eine
   Messumgebung, die es noch nicht gibt.
5. **Bundle** (Abschnitt 3) — die Katalog-Auslieferung ist der Hebel; jede
   andere Optimierung bewegt die 4,22 MiB kaum.
