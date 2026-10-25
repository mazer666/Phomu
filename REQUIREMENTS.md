# Phomu — Produktspezifikation (Requirements)

**Requirements-Baseline:** 0.1
**Status:** Product baseline — abgeleitet aus dem Code-Stand `feature/vocument-style-docs-and-i18n`, Commit `d5b6422` (2026-10-25)
**Regel:** Die Anforderungen in diesem Dokument sind die Wahrheit für das Verhalten von Phomu. Code, der sich anders verhält, ist ein Fehler im Code — keine stillschweigende Änderung der Anforderung.

**Herkunft dieses Dokuments:** Das Dokument wurde **aus dem Code abgeleitet**, nicht aus den Alt-Spezifikationen. Die Vorgänger-Dokumente (`LLM.md` sowie `specifications/*.md`) wurden am 25.10.2026 nach `specifications/archive/*_archivstand_2026-10-25.md` verschoben und sind **historisch, nicht mehr verbindlich** (siehe `specifications/README.md`). Der Abgleich mit dem Archivstand ist in [Widersprüche](#widersprüche) mit Beleg aufgeführt. Jede Anforderung nennt den belegenden Pfad und das Kommando, mit dem sie geprüft wird. Wo eine Regel noch nicht getestet ist, steht das ausdrücklich dabei und die zugehörige Lücke ist in [Offene Lücken](#offene-lücken) geführt.

**Maschinenlesbare Wahrheit:** `project/project.yaml` führt Baseline, Status, Meilensteine, Modulgrenzen, Anforderungs-IDs und Qualitätsschwellen. Die Root-Dokumente verweisen dorthin; dieses Dokument ist die fachliche Quelle, die Datei dort die maschinenlesbare Projektlage. Zu `project/project.yaml` siehe [Projektstatus-Datei](#projektstatus-datei-projectprojectyaml).

**Legende**

| Markierung | Bedeutung |
|---|---|
| **Preset** | Standardverhalten, aktiv und für alle Nutzer erreichbar |
| **Optional** | Im Code vorhanden, aber nicht aktiviert oder nicht auswählbar |
| **Later** | Bewusst verschoben — der Code enthält bewusst keinen belastbaren Pfad |

**Nachprüfbarkeit der Gates (gemessen in dieser Arbeitsrunde, 2026-10-25)**

| Kommando | Ergebnis | Quelle |
|---|---|---|
| `npm run typecheck` | grün (Exit 0) | `tsc --noEmit` |
| `npm run lint` | 0 Errors, 1 Warning (`playwright.config.ts:1`) | `eslint .` |
| `npx vitest run` | 4 Testdateien / 21 Tests bestanden | `vitest.config.ts` (`include: src/**/*.test.ts`) |
| `npm run validate-catalog` | 135 Pack-Dateien, 1.615 Songs, 0 Schema-Fehler, 126 Warnungen, 0 Duplicate-Gruppen, 4 erlaubte Dubletten, 0 fehlende Jahre (1950–2026) | `src/utils/validate-song-catalog.ts` |
| `node scripts/check-i18n-completeness.mjs --count` | 935 Literaltexte in 47 Dateien; `src/i18n/locales/parts/` ist leer | `scripts/check-i18n-completeness.mjs` |
| `npm run build` | nicht in dieser Runde gemessen | — |

---

# 1. Produktprinzipien (CORE)

### CORE-001 — Anforderungen sind die Wahrheit für das Verhalten

**Preset:** Preset
**Anforderung:** Das Verhalten von Phomu wird durch die Anforderungs-IDs in diesem Dokument definiert. Jede ID wird im Code, in Tests und in der Dokumentation referenziert; eine ID wird nie wiederverwendet.
**Begründung:** Ohne stabile IDs ist nicht prüfbar, ob eine Änderung eine Anforderung verletzt. Die ID-Schemata (`CORE`, `GAME`, `LOBBY`, `MEDIA`, `UI`, `I18N`, `CAT`, `SEC`, `NFR`) sind im Reform-Vertrag festgelegt.
**Akzeptanz:** Jeder Anforderungsblock in diesem Dokument trägt eine ID aus dem Schema `<DOMÄNE>-<NNN>` mit drei Ziffern; die IDs sind je Domäne fortlaufend und lückenlos.
**Verifikation:** `grep -c '^### ' REQUIREMENTS.md` zählt alle Anforderungsblöcke (Ist-Stand: 174); die ID-Eindeutigkeit wird mit `grep -o '^### [A-Z]*-[0-9]*' REQUIREMENTS.md | sort | uniq -d` (leer = keine Dublette) geprüft.

### CORE-002 — Freies Open Source ohne Zwangskonto

**Preset:** Preset
**Anforderung:** Phomu ist GPL-3.0-lizenziert. Es gibt keine Anmeldung, kein Abo, keine Werbung und keine erzwungene Kopplung an einen Dienst. Alle Kernfunktionen — Lobby, Spiel, Katalog, Admin-API — funktionieren ohne Benutzerkonto.
**Begründung:** Das Spiel wird in Bars, auf Geburtstagen und in Vereinen gespielt. Eine Anmeldepflicht wäre eine Abbruchhürde genau dort, wo das Produkt wirken soll.
**Akzeptanz:** `LICENSE` enthält GPL-3.0; `package.json` führt `"license": "GPL-3.0"`; es existiert kein Auth-Provider und keine Login-Route in `src/app/`.
**Verifikation:** `cat LICENSE | head -3`; `grep -rn '"license"' package.json`; `ls src/app/` enthält keine `login`-/`signup`-Route.

### CORE-003 — Lokal-zuerst und datensparsam

**Preset:** Preset
**Anforderung:** Spieler-, Punkte-, Konfigurations- und Fortschrittsdaten bleiben im Browser des Geräts (`localStorage`). Es werden keine persönlichen Profile auf Servern angelegt; es gibt kein Tracking und kein Telemetrie-Upload.
**Begründung:** Party-Spiele werden in Situationen gespielt, in denen Gäste nicht ihr Konto in fremde Hände geben wollen. Der Datenschutzhinweis muss die technische Realität abbilden, nicht einen Wunsch.
**Akzeptanz:** Der Zustand liegt im Zustand-Store mit `persist`-Middleware unter dem Schlüssel `phomu-game-state` (`src/stores/game-store.ts:618-638`); die Admin-Oberfläche schreibt ausschließlich in `localStorage` (`src/app/admin/songs/page.tsx:30`, `STORAGE_KEY = 'phomu-admin-songs'`). Der einzige ausgehende Nutzungsdatenfluss ist der optionale „Report Missing"-Dialog (siehe MEDIA-013).
**Verifikation:** `grep -n "persist(" src/stores/game-store.ts`; `grep -rn "localStorage" src/app/admin/ src/stores/`; `grep -rni "supabase\|firebase\|analytics\|gtag" src/ package.json` (muss leer sein).

### CORE-004 — Hybrid aus physischer Karte und digitalem Deck

**Preset:** Preset
**Anforderung:** Beide Zugänge zum Spiel sind gleichwertig unterstützt: das digitale Deck (zufälliger Zug aus dem Katalog) und die physische Karte (QR-Scan). Der QR-Scan führt zu einem Quick-Play mit dem gescannten Song.
**Begründung:** Die Produktidee ist die Brücke zwischen gedrucktem Spielmaterial und digitaler Musikwiedergabe. Ein Weg ohne den anderen halbiert den Wert des Produkts.
**Akzeptanz:** `DrawingPhase` zieht digital (`src/components/game/DrawingPhase.tsx:123-146`); `QRScannerModal` + `parseQrIntent` verarbeiten Karten-QRs (`src/components/game/QRScannerModal.tsx:31-56`, `src/utils/qr-intent.ts:16-43`); `startQuickGame` startet mit dem gescannten Song (`src/stores/game-store.ts:496-513`).
**Verifikation:** `npm run test -- qr-intent`; `grep -n "startQuickGame" src/stores/game-store.ts src/app/browse/page.tsx`.

### CORE-005 — Anti-Spoiler ist ein Produktversprechen, kein Komfortmerkmal

**Preset:** Preset
**Anforderung:** Während der Fragerunde sind Titel, Künstler, Cover und Streaming-Metadaten für die ratenden Spieler nicht sichtbar. Die Auflösung gibt die Identität des Songs erst frei, wenn die Antwort gesichert ist.
**Begründung:** Wer den Song vor der Auflösung identifiziert, zerstört die Runde für alle anderen. Der Schutz muss in jedem Modus gelten, nicht nur in den offensichtlichen.
**Akzeptanz:** Der `MusicPlayer` rendert den Provider-Embed unter einer Blur-/Overlay-Schicht (`src/components/game/MusicPlayer.tsx:424-479`); `blurred` wird in allen Fragephasen gesetzt (`TimelineMode.tsx:281`, `HintMasterMode.tsx:133`, `LyricsMode.tsx:121`, `SurvivorMode.tsx:69`, `CoverConfusionMode.tsx:114`); `VibeCheckMode.tsx:99` setzt `blurred={false}` bewusst, weil dort Stimmung statt Identität gefragt wird.
**Verifikation:** `grep -rn "blurred={" src/components/game/modes/`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### CORE-006 — Ein Kern, sechs klar getrennte Spielmodi

**Preset:** Preset
**Anforderung:** Phomu kennt genau sechs Spielmodi: `timeline`, `hint-master`, `lyrics`, `vibe-check`, `survivor`, `cover-confusion`. Jeder Modus hat eine eigene Frage-Logik, eine eigene Punkteformel und eine eigene Auflösungsdarstellung.
**Begründung:** Die sechs Modi sind der eigentliche Produktkern. Sie dürfen nicht zu einem generischen Quiz zusammenfallen, sonst ist der Moduswechsel nur Kosmetik.
**Akzeptanz:** `PHOMU_CONFIG.ALL_GAME_MODES` listet die sechs Modi (`src/config/game-config.ts:300-307`); `QuestionPhase` verteilt je Modus an eine eigene Komponente (`src/components/game/QuestionPhase.tsx:58-83`); `RevealPhase` hat je Modus eine eigene Reveal-Karte (`src/components/game/RevealPhase.tsx:541-546`).
**Verifikation:** `grep -n "ALL_GAME_MODES" src/config/game-config.ts`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### CORE-007 — Keine erzwungenen Umwege, kein Onboarding-Zwang

**Preset:** Preset
**Anforderung:** Vom Startbildschirm bis zum Spiel sind höchstens zwei Klicks nötig. Es gibt keine Tour, keine roten Punkte, keine „tipp-of-the-day"-Meldungen und keine Pflichtregistrierung.
**Begründung:** Ein Partyspiel lebt vom sofortigen Mitspielen. Jeder vorgeschaltete Schritt ist eine Lost-Party.
**Akzeptanz:** Beide Start-Buttons der Landingpage navigieren direkt zu `/lobby` (`src/app/page.tsx:56-84`); die Lobby bietet „Schnell-Setup" als Abkürzung (`src/app/lobby/page.tsx:730-734`).
**Verifikation:** `grep -n "router.push('/lobby')" src/app/page.tsx`; `grep -n "Schnell-Setup" src/app/lobby/page.tsx`.

### CORE-008 — Deutsch-primär, Englisch vollständig

**Preset:** Preset
**Anforderung:** Die Oberfläche ist deutsch-primär; Englisch ist als zweite Sprache vollständig gepflegt. Beide Sprachen müssen denselben Schlüsselumfang haben, und kein sichtbarer Text darf fest im JSX stehen.
**Begründung:** Das Produkt ist im deutschsprachigen Raum entstanden, wird aber international beworben. Eine halb übersetzte Oberfläche ist schlechter als eine ehrlich deutsche.
**Akzeptanz:** **Teilweise erfüllt.** `src/i18n/locales/de.json` und `en.json` sind parallel (aktuell je 6 Namensräume / 25 Blatt-Schlüssel, gemessen); `i18n.config` verwendet `fallbackLng: 'de'` (`src/i18n/config.ts:22`). Nicht erfüllt: der sichtbare Text kommt noch überwiegend hart kodiert aus dem JSX (935 Literaltexte in 47 Dateien).
**Verifikation:** `node scripts/check-i18n-completeness.mjs --count` — meldet aktuell 935 Literaltexte in 47 Dateien. Das Gate ist erst grün, wenn 0 Literaltexte verbleiben; als `npm run check:i18n` ist es noch nicht verdrahtet — siehe [GAP-006](#offene-lücken) und [I18N-007](#i18n-007--jeder-sichtbare-text-stammt-aus-der-übersetzung).

### CORE-009 — Der Code ist die Wahrheit, die Doku folgt

**Preset:** Preset
**Anforderung:** Die Zahlen und Regeln in diesem Dokument werden aus `src/config/game-config.ts` und dem Code abgeleitet. Wer eine Zahl in der Dokumentation ändert, muss die Quelle mitändern; die Quelle hat Vorrang.
**Begründung:** Die bisherige Doku (LLM.md, `specifications/*`) ist an genau den Stellen veraltet, an denen sie Zahlen aus dem Gedächtnis statt aus dem Code genommen hat (Next.js 15 statt 16, 5 statt 6 Modi, 1.915 statt 1.615 Songs).
**Akzeptanz:** Jede punkt-, zeit- oder kapazitätsbezogene Anforderung nennt `Datei:Zeile`. Keine Anforderung enthält eine Zahl ohne Quelle.
**Verifikation:** `grep -n "game-config.ts" REQUIREMENTS.md` — jede punkt-, zeit- oder kapazitätsbezogene Regel verweist auf eine belegte Stelle.

### CORE-010 — Keine Attrappen als abgenommene Funktionalität

**Preset:** Preset
**Anforderung:** Eine Funktion, die als implementiert gemeldet wird, muss eine echte, ausführbare Implementierung sein. Stubs, Dummy-Rückgaben, Platzhalter-Assets oder synthetische Mock-Brücken gelten nicht als „gemacht".
**Begründung:** Der Katalog enthält Hunderte Einträge mit leeren Feldern; der Admin-Bereich ist voll von localStorage-Mock-ups. Ohne diese Regel wird jede Abnahme eine Behauptung.
**Akzeptanz:** Bekannte Verstöße sind in den [Offenen Lücken](#offene-lücken) benannt (fehlende Audio-Assets, nicht erreichbare Cover-Versionen, ungenutzte Provider) und nicht als erfüllt geführt.
**Verifikation:** Abgleich der Lückenliste mit dem tatsächlichen Repo-Stand bei jeder Abnahme; die Gates aus [NFR-005](#nfr-005--ein-gate-über-die-gesamte-pipeline) bis [NFR-008](#nfr-008--keine-abnahme-auf-basis-von-stubs) müssen grün sein.

### CORE-011 — Keine Telemetrie, kein Auto-Upload von Diagnosedaten

**Preset:** Preset
**Anforderung:** Phomu überträgt keine Nutzungs- oder Fehlerdaten automatisch an den Betreiber. Der einzige Meldeweg ist eine vom Nutzer aktiv ausgelöste Aktion.
**Begründung:** Der Nutzer installiert keine Analysedienste; die Abwesenheit von Telemetrie ist Teil des Datenschutzversprechens in `/privacy`.
**Akzeptanz:** Es existiert kein Analytics-SDK in `package.json`; der Missing-Link-Report öffnet nur auf Nutzer-Klick ein neues Browser-Tab (`src/components/game/MusicPlayer.tsx:216-230`).
**Verifikation:** `grep -rni "analytics\|gtag\|segment\|sentry\|posthog" src/ package.json` (muss leer sein).

### CORE-012 — Bezeichner bleiben englisch, Projektdoku bleibt deutsch

**Preset:** Preset
**Anforderung:** Code-Bezeichner, Typen, Komponentennamen, Commit-Konventionen und Kommentare sind englisch. Root-Dokumentation und `docs/` sind deutsch.
**Begründung:** Der Code wird international gelesen, die Doku richtet sich an den deutschsprachigen Owner. Beide Sprachen sauber zu halten ist billiger als die spätere Trennung.
**Akzeptanz:** `src/` enthält keine deutschen Bezeichner (Ausnahmen: deutsche UI-Literale in `src/i18n/locales/de.json`); alle Root-Dokumente sind deutsch.
**Verifikation:** `grep -rn "const [a-zA-Z]* = " src/ | grep -P "[äöüß]"` (muss leer sein).

---

# 2. Spielmodi, Rundenlogik und Punkte (GAME)

## 2.1 Rundenablauf und Phasen

### GAME-001 — Fünf Rundenphasen mit definierten Übergängen

**Preset:** Preset
**Anforderung:** Eine Runde durchläuft die Phasen `drawing` → `question` → `reveal` → (`scoring`). Die Phase `locked-in` existiert als Typ, wird aber von keinem Codepfad betreten.
**Begründung:** Der Phasenautomat ist das Rückgrat des Spiels; ein unklarer Phasenautomat erzeugt doppelte Antworten und hängende Runden.
**Akzeptanz:** `RoundPhase` ist in `src/types/game-state.ts:28-33` definiert; `drawSong` setzt `question` (`src/stores/game-store.ts:394-402`), `nextRound` setzt `drawing` (`src/stores/game-store.ts:365-375`), `endGame` setzt `scoring` (`src/stores/game-store.ts:385-390`). `advancePhase('reveal')` wird nur in `src/app/game/page.tsx:165` und `:234` aufgerufen; für `locked-in` existiert kein Aufruf (`grep -rn "advancePhase(" src`).
**Verifikation:** `grep -rn "advancePhase(" src`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

### GAME-002 — Der Reveal gibt die Lösung erst nach dem Sperren frei

**Preset:** Preset
**Anforderung:** Die Auflösung (`reveal`) startet ausschließlich, wenn die Antwort der aktiven Runde abgegeben wurde — entweder über den Modus-eigenen Abschluss oder über den Button „Alle fertig → Reveal".
**Begründung:** Der Anti-Spoiler-Schutz ist ein Produktversprechen; ein Reveal ohne gesicherte Antwort wäre ein Regelbruch.
**Akzeptanz:** `QuestionPhase` rendert den Reveal-Button nur für `survivor`, `vibe-check`, `hint-master`, `timeline` (`src/components/game/QuestionPhase.tsx:34-40`, `:86-102`); `lyrics` und `cover-confusion` lösen den Reveal selbst aus (`src/components/game/modes/LyricsMode.tsx:95`, `src/components/game/modes/CoverConfusionMode.tsx:288`).
**Verifikation:** `grep -n "MODES_WITH_REVEAL_BUTTON" -A 7 src/components/game/QuestionPhase.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-003 — Der Spielablauf startet nur mit Spielern

**Preset:** Preset
**Anforderung:** Die Route `/game` ist geschützt: Ohne laufende Runde (`currentRound === 0`) oder ohne Spieler wird sofort zur Lobby umgeleitet. Nach Spielende geht es nach `/game-over`.
**Begründung:** Ein leeres Spielbildschirm ist ein toter Bildschirm; die Weiterleitung schützt vor leeren Runden und vor Zuständen ohne Teilnehmer.
**Akzeptanz:** `src/app/game/page.tsx:89-93` (Guard → `/lobby`), `:96-100` (`isGameOver` → `/game-over`), `:290-292` (nichts rendern vor dem Redirect).
**Verifikation:** `npm run test:e2e:smoke` deckt die Erreichbarkeit ab, nicht den Redirect — siehe [GAP-021](#offene-lücken).

### GAME-004 — Die aktive Reihenfolge wechselt pro Zug

**Preset:** Preset
**Anforderung:** Die Zugreihenfolge ist `turnOrder`; sie enthält im Individual-Modus die Spieler-IDs, im Team-Modus die Team-IDs. `currentTurnIndex` zeigt auf den aktiven Zug und springt zyklisch weiter.
**Begründung:** Der Pilot wechselt; das ist der Kern des Pass-the-Phone-Prinzips.
**Akzeptanz:** `startGame` baut die Reihenfolge je `teamMode` (`src/stores/game-store.ts:258-261`); `nextRound` inkrementiert zyklisch (`src/stores/game-store.ts:345-347`); die Game-Seite leitet den Piloten daraus ab (`src/app/game/page.tsx:103-113`).
**Verifikation:** Test existiert nicht — siehe [GAP-002](#offene-lücken).

### GAME-005 — Die Runde wird protokolliert, bevor die nächste beginnt

**Preset:** Preset
**Anforderung:** Beim Übergang zur nächsten Runde wird die abgeschlossene Runde (Nummer, Modus, Song, Antworten, Abschlusszeitpunkt) in `roundHistory` abgelegt. Eine Runde ohne gezogenen Song wird nicht protokolliert.
**Begründung:** Die Rundenhistorie ist die Grundlage für spätere Statistiken, Replays und QA-Regressionen.
**Akzeptanz:** `src/stores/game-store.ts:331-343` — nur bei `currentSong !== null` wird ein `GameRound`-Eintrag erzeugt, mit `completedAt: new Date().toISOString()`.
**Verifikation:** Test existiert nicht — siehe [GAP-002](#offene-lücken).

### GAME-006 — Punkte werden nie negativ

**Preset:** Preset
**Anforderung:** Jede Punktvergabe wird auf einen Minimalwert von 0 begrenzt; ein Abzug (Cheat, Joker, Override) kann einen Spieler nicht unter 0 bringen.
**Begründung:** Cheats kosten Punkte. Ein Spielstand unter 0 ist unerklärlich und würde bei Teamwertungen zu Unsinn führen.
**Akzeptanz:** `awardPoints` verwendet `Math.max(0, t.score + points)` bzw. `Math.max(0, p.score + points)` (`src/stores/game-store.ts:455-474`).
**Verifikation:** `grep -n "Math.max(0" src/stores/game-store.ts`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

### GAME-007 — Punkte eines Spielers fließen seinem Team zu

**Preset:** Preset
**Anforderung:** Wird einem Spieler in einem Team eine Punktzahl gutgeschrieben, erhöht sich der Teampunktestand um denselben Betrag.
**Begründung:** Im Team-Modus wird die Wertung des Teams geführt; die Teamwertung muss der Summe der Mitglieder entsprechen.
**Akzeptanz:** `src/stores/game-store.ts:470-473` — bei vorhandener `teamId` wird das Team mit demselben Delta aktualisiert.
**Verifikation:** Test existiert nicht — siehe [GAP-002](#offene-lücken).

### GAME-008 — Drei Beendigungsbedingungen, genau eine ist aktiv

**Preset:** Preset
**Anforderung:** Das Spiel endet über genau eine der Bedingungen `points`, `rounds` oder `time`. Die Prüfung erfolgt erst, wenn die letzte Runde der aktuellen Rotation abgeschlossen ist.
**Begründung:** Eine Partie braucht ein definiertes Ende; die Prüfung mitten in einer Rotation würde einem Spieler den Zug entreißen.
**Akzeptanz:** `src/stores/game-store.ts:300-323` — `isEndOfRotation` (`:300`), Punkteprüfung gegen `targetPoints` (`:303-311`), Rundenprüfung `currentRound >= targetRounds * Spieler- bzw. Teamanzahl` (`:312-316`), Zeitprüfung gegen `targetTimeMinutes` ab `gameStartTime` (`:317-322`).
**Verifikation:** Test existiert nicht — siehe [GAP-002](#offene-lücken).

### GAME-009 — Die Punktebedingung endet mit dem führenden Spieler bzw. Team

**Preset:** Preset
**Anforderung:** Wird die Punktebedingung erfüllt, ist der Spieler bzw. das Team mit dem höchsten Punktestand Gewinner.
**Begründung:** Der Gewinner muss eindeutig sein; ein Gleichstand wird nicht aufgelöst, der aktuell Führende wird gesetzt.
**Akzeptanz:** `src/stores/game-store.ts:304-311` — Sortierung absteigend nach Score, `winnerId` = ID des Führenden; die Anzeige nutzt dieselbe Logik (`src/components/game/RevealPhase.tsx:486-495`).
**Verifikation:** Test existiert nicht — siehe [GAP-002](#offene-lücken).

### GAME-010 — Die Rundenbedingung zählt pro Team bzw. pro Spieler

**Preset:** Preset
**Anforderung:** `targetRounds` ist die Zahl der Runden **pro** Spieler (Individual) bzw. **pro** Team. Die Gesamtzahl der Züge ist `targetRounds × Anzahl der Spieler bzw. Teams`.
**Begründung:** „10 Runden" bei 6 Spielern bedeutet 60 Züge; ohne diese Lesart bricht die Fortschrittsanzeige.
**Akzeptanz:** `src/stores/game-store.ts:314` — `currentRound >= config.targetRounds * (individual ? players.length : teams.length)`; identisch in der Fortschrittsanzeige `src/app/game/page.tsx:269-271`.
**Verifikation:** `grep -n "targetRounds \*" src/stores/game-store.ts src/app/game/page.tsx`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

### GAME-011 — Die Zeitbedingung misst ab Spielstart

**Preset:** Preset
**Anforderung:** Die Zeitbedingung zählt ab `gameStartTime`, das beim Spielstart gesetzt wird. Ablauf der Zeit beendet das Spiel auch mitten in einer Runde.
**Begründung:** Eine Party hat ein Ende, auch wenn niemand merkt, wie lange es schon läuft.
**Akzeptanz:** `gameStartTime: Date.now()` in `startGame` (`src/stores/game-store.ts:273`); Prüfung in `nextRound` (`src/stores/game-store.ts:317-322`); der Header-Progress rechnet ebenfalls ab diesem Zeitpunkt (`src/app/game/page.tsx:279-285`).
**Verifikation:** Test existiert nicht — siehe [GAP-002](#offene-lücken).

### GAME-012 — Der letzte Zug wird angekündigt

**Preset:** Preset
**Anforderung:** Erkennt die Spielseite die letzte Rotation, wird vor dem Wechsel ein „Letzte Runde"-Banner gezeigt (Zufallsauswahl aus 12 Texten), das ca. 3,4 Sekunden steht, bevor die nächste Runde startet.
**Begründung:** Der letzte Zug ist der dramaturgische Höhepunkt; er darf nicht wie jeder andere aussehen.
**Akzeptanz:** `isLastRotation` (`src/app/game/page.tsx:169-179`), `handleNextRound` mit 3.400 ms Banner-Dauer (`src/app/game/page.tsx:182-193`), Texte in `src/utils/last-round-messages.ts:14-77` (12 Einträge).
**Verifikation:** `grep -n "3400" src/app/game/page.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-013 — Ein defekter Song wird übersprungen, nicht blockiert

**Preset:** Preset
**Anforderung:** Schlägt die Wiedergabe fehl, wechselt die Phase zurück auf `drawing`. Bei Zufallszug wird sofort ein neuer Song gezogen; bei einem per QR gescannten Song wird nur zurück in die Ziehphase gewechselt.
**Begründung:** Ein gesperrtes Video darf die Party nicht anhalten — gerade in Regionen mit gesperrten YouTube-Videos ist das der Normalfall.
**Akzeptanz:** `skipBrokenSong` (`src/stores/game-store.ts:405-416`) — QR-Quelle: nur `roundPhase = 'drawing'`; Zufallsquelle: zusätzlich `currentSong = null` und `autoDrawIntent = true`. `DrawingPhase` reagiert auf `autoDrawIntent` mit automatischem Zug (`src/components/game/DrawingPhase.tsx:149-157`).
**Verifikation:** `grep -n "autoDrawIntent" src/stores/game-store.ts src/components/game/DrawingPhase.tsx`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

### GAME-014 — Nach dem Überspringen kann der Pilot neu würfeln

**Preset:** Preset
**Anforderung:** Während der Fragerunde ist ein dezenter Reroll-Knopf verfügbar („Video kaputt? Neu würfeln"). Er wartet 2 Sekunden (Würfel-Animation) und überspringt dann den Song.
**Begründung:** Der automatische Skip greift erst nach dem Fehler; die manuelle Möglichkeit deckt Grenzfälle ab.
**Akzeptanz:** `onReroll` in `src/components/game/QuestionPhase.tsx:105-112`; `handleReroll` mit 2.000 ms in `src/app/game/page.tsx:239-246`; `DiceAnimation` in `src/app/game/page.tsx:304`.
**Verifikation:** `grep -n "handleReroll" -A 8 src/app/game/page.tsx`.

### GAME-015 — Punkte werden nur für richtige Antworten vergeben

**Preset:** Preset
**Anforderung:** `awardPoints` wird nur aufgerufen, wenn `isCorrect` wahr ist und `pointsAwarded > 0`. Falsche Antworten verändern den Punktestand nicht.
**Begründung:** Eine falsche Antwort, die Punkte kostet, wäre eine Strafmechanik; das Spiel kennt nur Gewinn.
**Akzeptanz:** `src/app/game/page.tsx:147-149` — `if (isCorrect && pointsAwarded > 0) { awardPoints(...) }`.
**Verifikation:** `grep -n "isCorrect && pointsAwarded" src/app/game/page.tsx`.

## 2.2 Punkteformeln je Modus

### GAME-016 — Timeline: Punkte wachsen mit der Timeline, gedeckelt

**Preset:** Preset
**Anforderung:** Im Timeline-Modus ist der mögliche Punktestand `min(Anzahl der Jahreszahlen + 1, timelineMaxPoints)`. Voreinstellung ist `timelineMaxPoints = 5`.
**Begründung:** Eine längere Timeline ist schwerer zu treffen und soll entsprechend mehr wert sein — aber ohne Obergrenze wird die Runde unbezahlbar.
**Akzeptanz:** `src/components/game/modes/TimelineMode.tsx:154` — `Math.min(timelineYears.length + 1, config.timelineMaxPoints)`; `DEFAULT_TIMELINE_MAX_POINTS: 5` in `src/config/game-config.ts:63`.
**Verifikation:** `grep -n "timelineMaxPoints" src/components/game/modes/TimelineMode.tsx src/config/game-config.ts`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-017 — Timeline: Die Timeline startet mit drei Jahreszahlen

**Preset:** Preset
**Anforderung:** Ist die Timeline leer, werden drei zufällige, aufsteigend sortierte Jahreszahlen aus dem Katalog erzeugt.
**Begründung:** Ohne Startwerte gibt es keine Einordnungsfrage; drei Ankerpunkte erzeugen eine echte Einordnungsaufgabe.
**Akzeptanz:** `randomInitialYears(3)` (`src/components/game/modes/TimelineMode.tsx:82-86`), aufgerufen in `src/components/game/modes/TimelineMode.tsx:139-143`; `initTimeline` sortiert aufsteigend (`src/stores/game-store.ts:595-597`).
**Verifikation:** `grep -n "randomInitialYears(3)" src/components/game/modes/TimelineMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-018 — Timeline: Duplikatjahre gelten als korrekt

**Preset:** Preset
**Anforderung:** Liegt das gesuchte Jahr bereits in der Timeline, gilt der Slot **vor** und **nach** dem Duplikat ebenfalls als korrekt; der kanonische Slot ist der erste Slot, an dem das Jahr kleiner als das bestehende Jahr ist.
**Begründung:** Ohne diese Regel müsste der Spieler die exakte Position eines Jahres bestimmen, das gar nicht eindeutig ist.
**Akzeptanz:** `getValidSlots` (`src/components/game/modes/TimelineMode.tsx:93-115`) — kanonischer Slot plus Slot `i` und `i + 1` bei Jahresgleichheit; `canonicalSlot` (`src/components/game/modes/TimelineMode.tsx:118-123`).
**Verifikation:** Test existiert nicht — siehe [GAP-001](#offene-lücken). Die Regel ist eine reine Funktion und damit die erste Wahl für einen Unit-Test.

### GAME-019 — Timeline: Nach einem Treffer wächst die Timeline

**Preset:** Preset
**Anforderung:** Nach einer korrekten Platzierung wird das Jahreszahl des Songs zur Timeline hinzugefügt. Entsteht dabei ein Duplikat, wird das Duplikat sofort wieder entfernt, ohne Eingriff des Spielers.
**Begründung:** Die Timeline soll wachsen, aber nicht dieselbe Zahl doppelt enthalten.
**Akzeptanz:** `src/components/game/modes/TimelineMode.tsx:185-192` — `addTimelineYear(newYear)` und bei `isDuplicate` sofort `removeTimelineYear(newYear)`.
**Verifikation:** Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-020 — Timeline: Ab mehr als zehn Jahreszahlen darf eine entfernt werden

**Preset:** Preset
**Anforderung:** Führt ein Treffer zu mehr als zehn Jahreszahlen (`timelineYears.length + 1 > 10`), darf der Spieler optional eine Jahreszahl entfernen. Das Entfernen ist freiwillig.
**Begründung:** Die Obergrenze hält die Timeline lesbar; das Entfernen gibt dem Spieler eine aktive Rolle.
**Akzeptanz:** `src/components/game/modes/TimelineMode.tsx:193-196` (`setRemovalState('choosing')`), Auswahl-UI `:396-413`, Abschluss `:415-421`.
**Verifikation:** `grep -n "removalState" src/components/game/modes/TimelineMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-021 — Timeline: Der Dekaden-Hint kostet zwei Punkte

**Preset:** Preset
**Anforderung:** Der Dekaden-Hint (z. B. „Synthesizer, Schulterpolster, Schnurrbart") zieht sofort 2 Punkte vom aktiven Spieler ab und ist nur einmal pro Runde nutzbar.
**Begründung:** Hilfe muss kosten, sonst fragt der Pilot die Hilfe und rät sofort.
**Akzeptanz:** `handleCheat` (`src/components/game/modes/TimelineMode.tsx:214-220`) — `awardPoints(currentPlayerId, -2)`, Abbruch bei `cheatActive`; sichtbar als Badge `-2 PKT CHEAT` (`:366-378`).
**Verifikation:** `grep -n "awardPoints(currentPlayerId, -2)" src/components/game/modes/TimelineMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-022 — Timeline: Der Joker entfernt genau einen falschen Slot für einen Punkt

**Preset:** Preset
**Anforderung:** Der Joker wählt zufällig einen der falschen Slots, macht ihn ungültig und kostet 1 Punkt. Er ist erst ab vier Slots verfügbar (`numSlots > 3`) und nur einmal pro Runde.
**Begründung:** Ein Joker, der auch den richtigen Slot treffen könnte, wäre kein Joker, sondern ein Glücksspiel mit hohen Einsätzen.
**Akzeptanz:** `handleJoker` (`src/components/game/modes/TimelineMode.tsx:222-237`) — Auswahl ausschließlich aus `wrongSlots`, `awardPoints(currentPlayerId, -1)`, Freischalten der Auswahl, wenn der Joker-Slot gewählt war; Verfügbarkeitsbedingung in `src/components/game/modes/TimelineMode.tsx:335`.
**Verifikation:** `grep -n "numSlots > 3" src/components/game/modes/TimelineMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-023 — Hint-Master: Fünf Stufen, fünf bis ein Punkt

**Preset:** Preset
**Anforderung:** Der Hint-Master-Modus zeigt bis zu fünf Hinweise. Der Punktestand je Stufe ist `[5, 4, 3, 2, 1]` (Stufe 1 = 5 Punkte, Stufe 5 = 1 Punkt). Der Song liefert exakt fünf Hinweise.
**Begründung:** Die abgestufte Bezahlung ist das Prinzip des Modus: frühe Treffer sind mehr wert.
**Akzeptanz:** `PHOMU_CONFIG.HINT_MASTER_POINTS: [5, 4, 3, 2, 1]` (`src/config/game-config.ts:310`); `points = HINT_MASTER_POINTS[shownHints - 1] ?? 1` (`src/components/game/modes/HintMasterMode.tsx:36`); `hints` ist im Typ ein Tupel aus fünf Strings (`src/types/song.ts:87`).
**Verifikation:** `grep -n "HINT_MASTER_POINTS" src/config/game-config.ts src/components/game/modes/HintMasterMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-024 — Hint-Master: Ab Stufe zwei läuft die Musik (geblurrt)

**Preset:** Preset
**Anforderung:** Ab dem zweiten Hinweis startet die Musik automatisch, weiterhin hinter der Blur-Schicht. Der Pilot kann die Musik schon auf Stufe 1 manuell freischalten (kostet 2 Punkte).
**Begründung:** Ab Stufe 2 ist der Hinweis so eindeutig, dass die Identität fast klar ist; die Musik ist der letzte Schritt zur Auflösung.
**Akzeptanz:** `handleNextHint` (`src/components/game/modes/HintMasterMode.tsx:39-45`) — `if (shownHints + 1 >= 2) setShowMusic(true)`; Musik-Cheat `handleCheat` mit −2 Punkten (`:57-63`, Knopf `:176-183`).
**Verifikation:** `grep -n "shownHints + 1 >= 2" src/components/game/modes/HintMasterMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-025 — Hint-Master: Das Urteil des Piloten bestimmt die Punkte

**Preset:** Preset
**Anforderung:** Nach der Auflösung gibt der Pilot an, was er wusste: „Beides" = voller Punktestand, „Nur Künstler" oder „Nur Titel" = aufgerundeter halber Punktestand (`Math.ceil(points / 2)`), „Nichts" = 0 Punkte.
**Begründung:** Hint-Master ist der einzige Modus mit verbaler Antwort; ohne Differenzierung wäre die Trefferquote wertlos.
**Akzeptanz:** `handleFinalDecision` (`src/components/game/modes/HintMasterMode.tsx:47-55`) — `awardedPoints = knew === 'both' ? points : knew === 'none' ? 0 : Math.ceil(points / 2)`; Anzeige der vier Optionen `:206-241`.
**Verifikation:** `grep -n "Math.ceil(points / 2)" src/components/game/modes/HintMasterMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-026 — Hint-Master: Die Audiolänge wächst mit der Stufe

**Preset:** Preset
**Anforderung:** Bis Stufe 4 läuft das Audio 30 Sekunden ab `previewTimestamp.start`; ab Stufe 5 oder nach der Auflösung 180 Sekunden.
**Begründung:** Wer bis Stufe 5 kommt, hat Anspruch auf die ganze Erkennungsphase.
**Akzeptanz:** `src/components/game/modes/HintMasterMode.tsx:132` — `endSeconds={(isRevealed || shownHints === 5) ? startSecs + 180 : startSecs + 30}`.
**Verifikation:** `grep -n "endSeconds" src/components/game/modes/HintMasterMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-027 — Lyrics Labyrinth: Vier Zeilen, eine ist erfunden

**Preset:** Preset
**Anforderung:** Der Modus mischt drei echte Liedzeilen und eine KI-generierte Zeile und lässt den Spieler die **falsche** Zeile identifizieren. Die Reihenfolge der Optionen ist pro Song zufällig, aber während einer Runde stabil.
**Begründung:** Das Ratebild ist die Abwechslung zu den übrigen Modi.
**Akzeptanz:** `src/components/game/modes/LyricsMode.tsx:68-83` — `useMemo` über `song.id` mit `shuffle`; Optionen werden mit `A.`, `B.`, `C.`, `D.` nummeriert (`:164-166`).
**Verifikation:** Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-028 — Lyrics Labyrinth: Vier Punkte für die richtige Fake-Zeile

**Preset:** Preset
**Anforderung:** Eine korrekt erkannte Fake-Zeile bringt 4 Punkte, eine falsche 0.
**Begründung:** Vier Optionen, vier Punkte — eine erkennbare Einheit.
**Akzeptanz:** `LYRICS_POINTS = 4` (`src/components/game/modes/LyricsMode.tsx:21`), Vergabe in `handleConfirm` (`:89-96`).
**Verifikation:** `grep -n "LYRICS_POINTS" src/components/game/modes/LyricsMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-029 — Lyrics Labyrinth: Ohne Lyrics-Daten gibt es eine Bonusrunde

**Preset:** Preset
**Anforderung:** Fehlt einem Song die Lyrik-Struktur (`lyrics === null`), wird statt der Frage eine Bonusrunde gespielt: Wer den Song erkennt und laut nennt, bekommt 2 Punkte, sonst 0.
**Begründung:** 62 der 1.615 Katalogsongs haben keine Lyrics; ohne Ausweichregel wäre der Modus für diese Songs unspielbar.
**Begründung-Ergänzung:** Der Fallback hält den Modus spielbar, ohne den Katalog zu blockieren.
**Akzeptanz:** `src/components/game/modes/LyricsMode.tsx:42-44` (Fallback auf `BonusRound`), `BonusRound` `:214-263` mit `onAnswer(true, 2)` (`:239`). Datenstand: 1.553 von 1.615 Songs mit `lyrics !== null` (gemessen über `src/data/songs/*.json`).
**Verifikation:** `grep -n "BonusRound" src/components/game/modes/LyricsMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-030 — Vibe-Check: Sechs Optionen, zwei Punkte

**Preset:** Preset
**Anforderung:** Der Spieler wählt aus sechs Stimmungs-Optionen. Ist die gewählte Stimmung in `song.mood` enthalten, gibt es 2 Punkte, sonst 0. Artist, Titel und Dekade sind sichtbar — die Stimmung ist die gesuchte Größe.
**Begründung:** Der Modus prüft Gefühl, nicht Wissen; die Identität muss dafür bekannt sein.
**Akzeptanz:** `src/components/game/modes/VibeCheckMode.tsx:52-59` — `isCorrect = song.mood.includes(mood)`, `points = isCorrect ? (cheatUsed ? 1 : 2) : 0`; Optionsaufbau `:62-73` (5 falsche + 1 richtige); Dekade-Anzeige `:118`.
**Verifikation:** `grep -n "song.mood.includes(mood)" src/components/game/modes/VibeCheckMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-031 — Vibe-Check: Der Cheat halbiert die Optionen und senkt den Gewinn

**Preset:** Preset
**Anforderung:** Der Cheat reduziert die Auswahl von sechs auf drei Optionen und begrenzt den Gewinn auf 1 Punkt.
**Begründung:** Der Vorteil muss durch die niedrigere Punktzahl bezahlt werden.
**Akzeptanz:** `src/components/game/modes/VibeCheckMode.tsx:62-73` — `half` = 2 falsche + 1 richtige; Punktebegrenzung in `handleSelect` (`:57`); Hinweis-Text „Optionen halbiert — max. +1 Pkt" (`:141`).
**Verifikation:** `grep -n "cheatUsed ? 1 : 2" src/components/game/modes/VibeCheckMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-032 — Survivor: Ein-Hit-Wunder oder Dauerstar, drei Punkte

**Preset:** Preset
**Anforderung:** Der Spieler entscheidet, ob der Künstler ein One-Hit-Wonder ist. Richtig ist die Angabe `song.isOneHitWonder`; es gibt 3 Punkte, sonst 0. Der Künstlername bleibt bis zur Antwort verdeckt.
**Begründung:** Ohne Verdeckung wäre die Frage trivial (der Name verrät die Antwort).
**Akzeptanz:** `src/components/game/modes/SurvivorMode.tsx:30-37` — `isCorrect = guessedOneHit === song.isOneHitWonder`, 3 Punkte; Artist-Verdeckung `:97-102` (`???`), Enthüllung erst nach Antwort oder Cheat (`:103-114`); `blurred={!answered && !cheatUsed}` (`:69`).
**Verifikation:** `grep -n "isOneHitWonder" src/components/game/modes/SurvivorMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-033 — Survivor: Der Cheat enthüllt den Künstler für einen Punkt

**Preset:** Preset
**Anforderung:** Der Cheat blendet den Künstlernamen sofort ein und zieht 1 Punkt ab.
**Begründung:** Ein teurerer Cheat als im Timeline-Modus, weil die Auflösung unmittelbar folgt.
**Akzeptanz:** `handleCheat` (`src/components/game/modes/SurvivorMode.tsx:39-44`) — `awardPoints(currentPlayerId, -1)`; Badge `-1 PKT CHEAT` (`:83-94`).
**Verifikation:** `grep -n "awardPoints(currentPlayerId, -1)" src/components/game/modes/SurvivorMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-034 — Cover Confusion: Fünf bis zwei Punkte je nach Hinweiszahl

**Preset:** Preset
**Anforderung:** Der Modus kennt vier Punktestufen: kein Hinweis = 5 Punkte, ein Texthinweis = 4, zwei Texthinweise = 3, Multiple-Choice mit drei Künstlern = 2 Punkte.
**Begründung:** Die Hinweise werden teurer, je mehr Information der Spieler hat.
**Akzeptanz:** `POINTS_BY_HINTS = [5, 4, 3, 2]` (`src/components/game/modes/CoverConfusionMode.tsx:23`); `points = POINTS_BY_HINTS[Math.min(hintsUsed, 3)]` (`:41`); Hinweisvergabe `handleGetHint` (`:53-61`).
**Verifikation:** `grep -n "POINTS_BY_HINTS" src/components/game/modes/CoverConfusionMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-035 — Cover Confusion: Zwei Varianten mit gleicher Wahrscheinlichkeit

**Preset:** Preset
**Anforderung:** Pro Runde wird per Zufall eine von zwei Varianten gewählt: „Wer ist das Original?" (Ehrensystem + optionale Hinweise) oder „Cover oder Original?" (Binary-Frage, 3 Punkte).
**Begründung:** Die Variante hält den Modus abwechslungsreich und nutzt die vorhandene `coverMode`-Metadatenstruktur.
**Akzeptanz:** `const [variation] = useState(() => Math.random() > 0.5 ? 'who-is-it' : 'original-or-cover')` (`src/components/game/modes/CoverConfusionMode.tsx:39`); Binärvariante mit 3 Punkten (`:78-84`, `:188`).
**Verifikation:** `grep -n "variation" src/components/game/modes/CoverConfusionMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-036 — Cover Confusion: Die Ehrensystem-Variante entscheidet der Spieler selbst

**Preset:** Preset
**Anforderung:** In der Variante „Wer ist das Original?" wird der Original-Künstler angezeigt und der Spieler bestätigt selbst, ob er ihn kannte. Nur die Multiple-Choice-Variante wird automatisch gewertet.
**Begründung:** Ohne Tipp gibt es keinen Ground Truth — die Ehrensystem-Variante ist die ehrliche Lösung.
**Akzeptanz:** `handleSelfAssess` (`src/components/game/modes/CoverConfusionMode.tsx:63-68`) — Punkte nach Selbstauskunft; `handleChoice` (`:70-76`) — automatische Wertung im Multiple-Choice.
**Verifikation:** Test existiert nicht — siehe [GAP-001](#offene-lücken).

## 2.3 Cheats, No-Cheat und Zeitabzug

### GAME-037 — Der No-Cheat-Modus deaktiviert alle Hilfen

**Preset:** Preset
**Anforderung:** Ist `noCheatMode` aktiv, werden sämtliche Cheat- und Joker-Knöpfe ausgeblendet: Dekaden-Hint und Joker (Timeline), Musik-Cheat (Hint-Master), Options-Halbierung (Vibe-Check), Künstler-Enthüllung (Survivor).
**Begründung:** Für erfahrene Gruppen ist der Expert-Modus der einzige ehrliche Modus.
**Akzeptanz:** `config.noCheatMode` in `src/components/game/modes/TimelineMode.tsx:308` und `:335`, `src/components/game/modes/HintMasterMode.tsx:176`, `src/components/game/modes/VibeCheckMode.tsx:133`, `src/components/game/modes/SurvivorMode.tsx:153`; Vorgabe `DEFAULT_NO_CHEAT_MODE: false` (`src/config/game-config.ts:72`); umschaltbar in Lobby (`src/app/lobby/page.tsx:487-508`), Governance-Settings (`src/app/settings/governance/page.tsx`) und In-Game-Panel (`src/components/game/InGameSettingsPanel.tsx`).
**Verifikation:** `grep -rn "noCheatMode" src/components/game/modes/`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-038 — Der Zeitabzug bestraft langsame Antworten

**Preset:** Optional
**Anforderung:** Ist `timeDecayEnabled` aktiv, wird die Punktezahl einer richtigen Antwort um `floor(max(0, Antwortzeit − timeDecayGraceSeconds) / timeDecayStepSeconds) × timeDecayStepPoints` reduziert. Die standardmäßigen Werte sind: Verzicht 5 s, Schrittweite 5 s, 1 Punkt je Schritt, Mindestpunktzahl 1.
**Begründung:** Der Zeitabzug erzeugt Druck im Spiel — er muss abgeschaltet sein können, weil er in ruhigen Runden unangenehm ist.
**Akzeptanz:** `src/app/game/page.tsx:130-136` — Berechnung und `Math.max(config.minPointsPerCorrect, ...)`; Vorgaben in `src/config/game-config.ts:64-68` (`DEFAULT_TIME_DECAY_ENABLED: false`, `DEFAULT_TIME_DECAY_GRACE_SECONDS: 5`, `DEFAULT_TIME_DECAY_STEP_SECONDS: 5`, `DEFAULT_TIME_DECAY_STEP_POINTS: 1`, `DEFAULT_MIN_POINTS_PER_CORRECT: 1`); Schalter in der Lobby (`src/app/lobby/page.tsx:463-484`).
**Verifikation:** `grep -n "timeDecayStepPoints" src/app/game/page.tsx src/config/game-config.ts`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### GAME-039 — Die Antwortzeit wird nur im Timeline-Modus gemessen

**Preset:** Preset
**Anforderung:** Nur der Timeline-Modus übergibt `answeredInSeconds` an die Antwortbewertung. Die übrigen Modi übergeben keinen Zeitwert, damit der Zeitabzug dort nicht greift.
**Begründung:** Ein Zeitabzug, der in einem Modus ohne Entscheidungsdruck funktioniert, wäre eine stille Punktebenachteiligung.
**Akzeptanz:** `answeredInSeconds` wird nur in `src/components/game/modes/TimelineMode.tsx:178` berechnet und in `src/app/game/page.tsx:133` ausgewertet.
**Verifikation:** `grep -rn "answeredInSeconds" src/components/game/modes/` (nur TimelineMode) und `grep -rn "answeredInSeconds" src/app/game/page.tsx`.

### GAME-040 — Power-User-Override mit dokumentierter Governance

**Preset:** Preset
**Anforderung:** In der Auflösung gibt es ein Power-User-Menü mit zwei Aktionen: „Antwort trotzdem korrekt werten" und „Runde verwerfen & neue Frage". Die Governance-Einstellung (`host`, `co-host`, `majority`) wird angezeigt, aber noch nicht durchgesetzt.
**Begründung:** Der Pilot muss bei Streitigkeiten eingreifen können. Die Rollendurchsetzung ist bewusst zurückgestellt (siehe [GAP-019](#offene-lücken)).
**Akzeptanz:** `src/components/game/RevealPhase.tsx:604-634` (Menü mit Governance-Anzeige), `src/app/game/page.tsx:197-215` (`handleOverrideCorrect` vergibt `max(1, minPointsPerCorrect)`, `handleOverrideRedraw` ruft `nextRound`).
**Verifikation:** `grep -n "overrideGovernance" src/components/game/RevealPhase.tsx src/app/game/page.tsx src/config/game-config.ts`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

## 2.4 Modusrotation und Zugauswahl

### GAME-041 — Der Modus wird pro Runde zufällig gewählt

**Preset:** Preset
**Anforderung:** Aus den in der Lobby aktivierten Modi wird zu Beginn jeder Runde per Zufall ein Modus gewählt. Fällt die Liste leer, greift `timeline`.
**Begründung:** Der Moduswechsel hält lange Partien abwechslungsreich, ohne dass der PilotModi manuell planen muss.
**Akzeptanz:** `pickRandomMode` (`src/stores/game-store.ts:189-191`), Aufruf in `startGame` (`:268`) und `nextRound` (`:368`).
**Verifikation:** `grep -n "pickRandomMode" src/stores/game-store.ts`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

### GAME-042 — Mindestens ein Modus bleibt immer aktiv

**Preset:** Preset
**Anforderung:** In der Lobby kann der letzte aktive Modus nicht abgewählt werden. Der Modus trägt dann die Kennzeichnung „Pflicht".
**Begründung:** Ein Spiel ohne Modus ist nicht spielbar.
**Akzeptanz:** `toggleMode` (`src/components/lobby/ModeSelector.tsx:78-86`) — `if (selectedModes.length === 1) return`; „Pflicht"-Badge in `src/components/lobby/ModeSelector.tsx`; `canGoNext` verlangt `selectedModes.length > 0` (`src/app/lobby/page.tsx:84`).
**Verifikation:** `grep -n "selectedModes.length === 1" src/components/lobby/ModeSelector.tsx`.

### GAME-043 — Der Song wird passend zum Modus gezogen

**Preset:** Preset
**Anforderung:** Der Songzug filtert nach dem aktiven Modus: Im Modus `lyrics` muss der Song Lyrics-Daten haben, sonst muss `supportedModes` den aktuellen Modus enthalten. Führt der Filter zu einem leeren Pool, gilt ein weicher Fallback.
**Begründung:** Ein Song ohne Lyrics im Lyrics-Modus ist eine Sackgasse; ein Song ohne Unterstützung für den Modus ist eine Fehlbesetzung.
**Akzeptanz:** `src/utils/song-picker.ts:56-70` — Modusfilter und harter Lyrics-Fallback auf die Basis-Auswahl ohne Difficulty-/QR-Filter.
**Verifikation:** `grep -n "currentMode === 'lyrics'" -A 12 src/utils/song-picker.ts`; Test existiert nicht — siehe [GAP-003](#offene-lücken).

### GAME-044 — Gespielte Songs werden bevorzugt vermieden

**Preset:** Preset
**Anforderung:** Bereits gespielte Songs werden vom Zufallszug ausgeschlossen. Ist der Pool dadurch leer, werden nur die zuletzt fünf gespielten Songs ausgeschlossen; danach wird aus dem vollen Pool gezogen.
**Begründung:** Wiederholungen sind bei 1.615 Songs vermeidbar; die Ausnahme verhindert eine Sackgasse.
**Akzeptanz:** `src/utils/song-picker.ts:72-84` — Filter über `playedIds`, Rückfall auf `playedIds.slice(-5)`.
**Verifikation:** `grep -n "recentlyPlayed" src/utils/song-picker.ts`; Test existiert nicht — siehe [GAP-003](#offene-lücken).

### GAME-045 — Der Zufallszug respektiert Pack-, Schwierigkeits- und QR-Filter

**Preset:** Preset
**Anforderung:** Der Zufallszug filtert zuerst nach den gewählten Packs, dann nach `onlyQRCompatible`, dann nach `difficulty`, dann nach dem Modus. Jeder Filter ist ein weicher Fallback: Führt er zu einem leeren Pool, wird er verworfen. Führt schon der Pack-Filter zu einem leeren Pool, wird der gesamte Katalog verwendet.
**Begründung:** Ein zu enger Filter darf die Partie nicht blockieren.
**Akzeptanz:** `src/utils/song-picker.ts:36-70` — Reihenfolge und die Fallback-Kette mit den Kommentaren „Soft-Fallback" (`:45`) und „Absoluter Fallback" (`:41`).
**Verifikation:** `grep -n "Soft-Fallback\|Absoluter Fallback" src/utils/song-picker.ts`; Test existiert nicht — siehe [GAP-003](#offene-lücken).

---

# 3. Lobby, Spieler, Teams, Sitzung und Karten (LOBBY)

### LOBBY-001 — Die Lobby ist ein sechsstufiger Assistent

**Preset:** Preset
**Anforderung:** Die Lobby führt in sechs Schritten durch die Konfiguration: 1 Spieler, 2 Modi, 3 Packs, 4 Spielende, 5 Feintuning, 6 Teams. Der Fortschritt wird als Balken und als Schrittzähler angezeigt.
**Begründung:** Ein Assistent auf kleinen Bildschirmen verhindert Überfrachtung; die Schrittreihenfolge ist die fachliche Reihenfolge der Entscheidungen.
**Akzeptanz:** `TOTAL_STEPS = 6` (`src/app/lobby/page.tsx:80`), Schrittrendering `:153-669`, Fortschrittsbalken `:142-146`.
**Verifikation:** `grep -n "TOTAL_STEPS" src/app/lobby/page.tsx`; Test existiert nicht — siehe [GAP-021](#offene-lücken).

### LOBBY-002 — Schritt 1 verlangt mindestens einen Spieler

**Preset:** Preset
**Anforderung:** Der „Weiter"-Knopf in Schritt 1 ist erst aktiv, wenn mindestens `MIN_PLAYERS` Spieler existieren. Voreinstellung: 1.
**Begründung:** Ein Spiel ohne Teilnehmer ist kein Spiel.
**Akzeptanz:** `canGoNext` (`src/app/lobby/page.tsx:82-87`) — `players.length >= PHOMU_CONFIG.MIN_PLAYERS`; `MIN_PLAYERS: 1` (`src/config/game-config.ts:56`).
**Verifikation:** `grep -n "MIN_PLAYERS" src/app/lobby/page.tsx src/config/game-config.ts`.

### LOBBY-003 — Obergrenze von 24 Spielern

**Preset:** Preset
**Anforderung:** Es können höchstens 24 Spieler in einer Sitzung sein. Der 25. Spieler wird nicht angelegt.
**Begründung:** Die Obergrenze ist Teil des Produktversprechens „1–24 Spieler".
**Akzeptanz:** `MAX_PLAYERS: 24` (`src/config/game-config.ts:55`); Prüfung im Store `addPlayer` (`src/stores/game-store.ts:210`) und in der Lobby (`src/app/lobby/page.tsx:91`).
**Verifikation:** `grep -rn "MAX_PLAYERS" src/`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

### LOBBY-004 — Spieler erhalten automatisch Avatar und Farbe

**Preset:** Preset
**Anforderung:** Beim Hinzufügen eines Spielers werden automatisch ein Emoji-Avatar (aus 14 festen Emojis) und eine Farbe (aus 7 festen Farben) vergeben — zyklisch nach der Anzahl vorhandener Spieler. Der erste Spieler wird Pilot.
**Begründung:** Ohne automatische Zuordnung müsste der Pilot für jeden Spieler manuell Farbe und Avatar wählen.
**Akzeptanz:** `EMOJI_AVATARS` (14 Einträge, `src/app/lobby/page.tsx:25`), `PLAYER_COLORS` (7 Einträge, `:26`), Zuweisung in `handleAddPlayer` (`:93-97`); `isPilot: players.length === 0` (`src/stores/game-store.ts:219`).
**Verifikation:** `grep -n "EMOJI_AVATARS\|PLAYER_COLORS" src/app/lobby/page.tsx`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

### LOBBY-005 — Beim Entfernen des Piloten übernimmt der erste verbleibende Spieler

**Preset:** Preset
**Anforderung:** Wird der Pilot entfernt, übernimmt der erste verbleibende Spieler die Pilotrolle. Es gibt danach nie zwei Piloten und nie keinen.
**Begründung:** Ohne Pilot kann die Runde nicht validiert werden.
**Akzeptanz:** `removePlayer` (`src/stores/game-store.ts:231-245`) — `removedWasPilot` und Übergabe an `remaining[0]`.
**Verifikation:** Test existiert nicht — siehe [GAP-002](#offene-lücken).

### LOBBY-006 — Drei Teammodi: einzeln, fest, wechselnd

**Preset:** Preset
**Anforderung:** Der Teammodus ist `individual` (jeder für sich), `fixed` (feste Teams) oder `shifting` (Teams werden jede Runde neu gemischt). Voreinstellung ist `individual`.
**Begründung:** Der wechselnde Teammodus ist der stärkste soziale Hebel des Spiels.
**Akzeptanz:** `TeamMode` (`src/types/player.ts:9-12`), `DEFAULT_TEAM_MODE: 'individual'` (`src/config/game-config.ts:57`), Auswahl in `src/app/lobby/page.tsx:42-46` und `:533-545`.
**Verifikation:** `grep -rn "shifting" src/stores/game-store.ts src/app/lobby/page.tsx`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

### LOBBY-007 — Beim Wechsel auf einen Teammodus werden zwei Teams angelegt

**Preset:** Preset
**Anforderung:** Wird `fixed` oder `shifting` gewählt und noch kein Team existiert, werden automatisch zwei Teams erzeugt.
**Begründung:** Ein Teammodus ohne Teams ist nicht konfigurierbar.
**Akzeptanz:** `handleTeamModeChange` (`src/app/lobby/page.tsx:104-109`) — `initTeams(2)`.
**Verifikation:** `grep -n "initTeams(2)" src/app/lobby/page.tsx`.

### LOBBY-008 — Teams tragen Namen aus einer kuratierten Liste

**Preset:** Preset
**Anforderung:** Neu angelegte Teams erhalten einen Namen aus einer Liste von 24 festen, humorvollen Teamnamen; bereits vergebene Namen werden übersprungen. Ist die Liste erschöpft, wird erneut zufällig gewählt. Die Farbe rotiert über sechs feste Teamfarben.
**Begründung:** Der Name ist ein Gesprächsstarter; zufällige generierte Namen wären beliebig.
**Akzeptanz:** `FUNNY_TEAM_NAMES` (24 Einträge, `src/stores/game-store.ts:20-27`), `TEAM_COLORS` (6, `:29`), `pickTeamName` (`:31-35`), `initTeams` (`:530-544`), `createTeam` (`:547-558`).
**Verifikation:** `grep -n "FUNNY_TEAM_NAMES" src/stores/game-store.ts`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

### LOBBY-009 — Teamnamen und -farben sind frei editierbar

**Preset:** Preset
**Anforderung:** Der Teamname ist als Textfeld editierbar; ein Würfel-Knopf vergibt einen zufälligen Namen aus derselben Liste. Die Teamfarbe ist über sechs kuratierte Farben wählbar.
**Begründung:** Vorgegebene Farben und Namen sind ein Startpunkt, keine Vorschrift.
**Akzeptanz:** `src/app/lobby/page.tsx:564-582` (Namensfeld und Würfel), `CURATED_TEAM_COLORS` (`:48-55`) und Farbwahl (`:600-608`).
**Verifikation:** `grep -n "CURATED_TEAM_COLORS" src/app/lobby/page.tsx`.

### LOBBY-010 — Spieler werden einem Team zugeordnet oder entfernt

**Preset:** Preset
**Anforderung:** Im Modus `fixed` kann jeder Spieler genau einem Team zugeordnet werden; ein erneuter Klick auf das aktuelle Team hebt die Zuordnung auf. Entfernen eines Teams hebt alle Zuordnungen auf, ohne Spieler zu löschen.
**Begründung:** Fehlversehene Zuordnungen müssen korrigierbar sein, ohne die Spielerliste anzufassen.
**Akzeptanz:** `assignPlayerToTeam` (`src/stores/game-store.ts:572-592`), `removeTeam` (`:561-569`), UI `src/app/lobby/page.tsx:621-648`.
**Verifikation:** `grep -n "assignPlayerToTeam\|removeTeam" src/stores/game-store.ts`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

### LOBBY-011 — Hinweis auf zu wenige Spieler im Teammodus

**Preset:** Preset
**Anforderung:** Bei weniger als vier Spielern weist die Lobby darauf hin, dass im Teammodus mindestens zwei Spieler pro Team nötig sind.
**Begründung:** Die Information erspart eine verwirrte Diskussion am Tisch.
**Akzeptanz:** `src/app/lobby/page.tsx:659-664`.
**Verifikation:** `grep -n "mindestens 4 Spieler" src/app/lobby/page.tsx`.

### LOBBY-012 — Die Teamanzahl ist begrenzt und folgt der Spielerzahl

**Preset:** Preset
**Anforderung:** Ein weiteres Team kann nur angelegt werden, solange weniger Teams existieren als die größere Zahl aus 2 und der Hälfte der Spielerzahl, und solange höchstens 8 Teams vorhanden sind. Ein Team kann erst ab dem dritten Team gelöscht werden.
**Begründung:** Die Grenzen verhindern unbrauchbare Teamgrößen (ein Team pro Spieler).
**Akzeptanz:** Bedingung `src/app/lobby/page.tsx:651`; Löschknopf nur ab `teams.length > 2` (`:587`).
**Verifikation:** `grep -n "teams.length < 8\|teams.length > 2" src/app/lobby/page.tsx`.

### LOBBY-013 — Die Spielende-Bedingung wird exklusiv gewählt

**Preset:** Preset
**Anforderung:** Die Beendigungsbedingung ist exklusiv: `points`, `rounds` oder `time`. Voreinstellungen: 100 Punkte, 10 Runden, 60 Minuten.
**Begründung:** Nur eine aktive Bedingung ist eindeutig; parallele Bedingungen erzeugen Streit über den Spielende-Moment.
**Akzeptanz:** Auswahl `src/app/lobby/page.tsx:279-290`; Vorgaben `DEFAULT_CONFIG` (`src/stores/game-store.ts:41-66`): `endingCondition: 'rounds'`, `targetPoints: 100`, `targetRounds: 10`, `targetTimeMinutes: 60`.
**Verifikation:** `grep -n "targetPoints: 100\|targetRounds: 10\|targetTimeMinutes: 60" src/stores/game-store.ts`.

### LOBBY-014 — Die Zielwerte sind über Presets und einen Regler wählbar

**Preset:** Preset
**Anforderung:** Für Punkte stehen 50/100/200/500, für Runden 5/10/15/20 und für Zeit 30/60/90/120/150/180/210/240 Minuten als Presets bereit; zusätzlich regelt ein Schieberegler den Zielwert (Punkte/Runden: 5–500 in Schritten von 5, Zeit: 30–240 in Schritten von 30).
**Begründung:** Presets beschleunigen die Konfiguration, der Regler deckt individuelle Werte ab.
**Akzeptanz:** `src/app/lobby/page.tsx:293-321` (Presets), `:333-346` (Regler). **Achtung:** Die Preset-Liste für Runden (5/10/15/20) liegt unterhalb von `MIN_ROUNDS_TO_PLAY = 10` (`src/config/game-config.ts:61`); der Wert wird aber nicht erzwungen — siehe [GAP-026](#offene-lücken).
**Verifikation:** `grep -n "50, 100, 200, 500\|5, 10, 15, 20" src/app/lobby/page.tsx`; `grep -n "MIN_ROUNDS_TO_PLAY" src/config/game-config.ts`.

### LOBBY-015 — Die Legacy-Aliasse für Zielwerte werden mitgeführt

**Preset:** Preset
**Anforderung:** `winCondition` spiegelt `targetPoints` und `roundsToPlay` spiegelt `targetRounds`. Beide werden bei jeder Änderung mitgesetzt.
**Begründung:** Ältere Spielstände und aufrufende Komponenten nutzen die Aliasse; eine Divergenz erzeugt widersprüchliche Anzeigen.
**Akzeptanz:** `src/types/game-state.ts:62-63` und `:71-72` (Aliasse), `src/app/lobby/page.tsx:296`, `:306`, `:341-342` (gemeinsames Setzen).
**Verifikation:** `grep -n "winCondition\|roundsToPlay" src/app/lobby/page.tsx src/types/game-state.ts`.

### LOBBY-016 — Mindestens ein Song-Pack ist immer ausgewählt

**Preset:** Preset
**Anforderung:** Das letzte gewählte Pack kann nicht abgewählt werden. „Alle wählen" und „Abwählen" setzen die Auswahl auf alle bzw. auf das erste Pack zurück.
**Begründung:** Ohne Pack gibt es keine Songs und damit kein Spiel.
**Akzeptanz:** `src/components/lobby/PackSelector.tsx:36-40` (`if (selectedPacks.length === 1) return`), `:44-45` (`selectAll`/`selectNone`); `canGoNext` in `src/app/lobby/page.tsx:85`.
**Verifikation:** `grep -n "selectedPacks.length === 1" src/components/lobby/PackSelector.tsx`.

### LOBBY-017 — Alte Pack-IDs werden auf gültige Pack-Keys abgebildet

**Preset:** Preset
**Anforderung:** Zwölf historische Lobby-Pack-IDs (z. B. `global-hits`) werden auf die aktuellen Pack-Keys abgebildet, damit gespeicherte Spielstände weiterhin eine Auswahl treffen. Die Abbildung ist zentral in der Konfiguration hinterlegt.
**Begründung:** Ohne Abbildung liefern alte Spielstände leere Auswahlen — der Fehler ist in der Konfiguration ausdrücklich dokumentiert.
**Akzeptanz:** `PACK_ALIASES` mit 12 Einträgen (`src/config/game-config.ts:284-297`), Anwendung in `normalizePackIds` (`src/utils/song-picker.ts:12-15`) und beim QR-Pack-Intent (`src/app/lobby/page.tsx:684-685`).
**Verifikation:** `grep -n "PACK_ALIASES" src/config/game-config.ts src/utils/song-picker.ts src/app/lobby/page.tsx`; Test existiert nicht — siehe [GAP-003](#offene-lücken).

### LOBBY-018 — QR-Karten liefern drei Intent-Typen

**Preset:** Preset
**Anforderung:** Ein gescannter QR-Code kann drei Bedeutungen haben: `@Name` fügt einen Spieler hinzu, ein URL mit `?pack=` aktiviert ein Pack, ein URL mit `?session=` ist als Sitzungs-Intent vorgesehen. Alte `?id=`-Links werden als nicht unterstützt markiert.
**Begründung:** Die physische Karte soll mehrere Funktionen in einem Code tragen, ohne dass der Nutzer eine App für jede Funktion braucht.
**Akzeptanz:** `parseQrIntent` (`src/utils/qr-intent.ts:16-43`), Einordnung in `src/app/lobby/page.tsx:676-692`; Test `src/utils/qr-intent.test.ts`.
**Verifikation:** `npm run test -- qr-intent`.

### LOBBY-019 — Ein Pack-Intent für ein unbekanntes Pack wird abgelehnt

**Preset:** Preset
**Anforderung:** Verweist ein QR-Code auf ein Pack, das es nicht gibt, wird der Scan verworfen und der Nutzer informiert; es wird kein leeres Pack in die Auswahl aufgenommen.
**Begründung:** Ein toter Pack-Eintrag würde den Filter des gesamten Spiels leer machen.
**Akzeptanz:** `src/app/lobby/page.tsx:686-687` — Prüfung über `PHOMU_CONFIG.SONG_PACKS` und `alert`.
**Verifikation:** `grep -n "Pack nicht gefunden" src/app/lobby/page.tsx`.

### LOBBY-020 — Der Sitzungs-Intent ist erkannt, aber noch nicht ausgeführt

**Preset:** Later
**Anforderung:** Ein QR-Code mit `?session=` wird als Sitzungs-Intent erkannt und geparst; die tatsächliche Sitzungssuche und -beitritt sind nicht implementiert.
**Begründung:** Der Mehrgeräte-Modus ist für eine spätere Ausbaustufe vorgesehen; die Erkennung schafft die Anschlussstelle ohne vorzutäuschen, es gäbe sie schon.
**Akzeptanz:** `src/utils/qr-intent.ts:28-31` (Parsing), Test in `src/utils/qr-intent.test.ts`; in der Lobby wird der Intent bewusst nicht behandelt (`src/app/lobby/page.tsx:676-692` behandelt nur `player` und `pack`).
**Verifikation:** `npm run test -- qr-intent`; Lücke geführt als [GAP-016](#offene-lücken).

### LOBBY-021 — Die Sitzung ist clientseitig und überlebt einen Reload

**Preset:** Preset
**Anforderung:** Der gesamte Spielzustand (Spieler, Teams, Konfiguration, Session-ID, XP, Audio-Einstellungen, aktuelle Runde, Timeline) wird in `localStorage` unter `phomu-game-state` persistiert. Beim Neuladen steht die Lobby-Konfiguration weiterhin bereit.
**Begründung:** Auf einer Party wird das Handy gelöscht, gesperrt oder die App neu geladen — die Konfiguration darf nicht verloren gehen.
**Akzeptanz:** `persist(...)` mit `name: 'phomu-game-state'` und der `partialize`-Liste (`src/stores/game-store.ts:618-638`).
**Verifikation:** `grep -n "partialize" -A 20 src/stores/game-store.ts`; Test existiert nicht — siehe [GAP-002](#offene-lücken).

### LOBBY-022 — „Nochmal spielen" behält die Lobby, „Neue Lobby" setzt alles zurück

**Preset:** Preset
**Anforderung:** Auf dem Endbildschirm bietet Phomu zwei Wege: „Nochmal spielen" setzt nur die Punkte zurück und startet das Spiel erneut (Konfiguration und Spieler bleiben), „Neue Lobby starten" setzt den gesamten Zustand zurück.
**Begründung:** Beide Aktionen werden in der Praxis gebraucht — der erste für einen zweiten Durchgang, der zweite für eine neue Gruppe.
**Akzeptanz:** `resetScores` (`src/stores/game-store.ts:479-493`) setzt Punkte, Runden, Historie, `playedSongIds`, Antworten, Song, Timeline zurück, behält aber Spieler/Teams/Konfiguration; `initSession` (`:201-203`) setzt alles auf den Anfangszustand; Aufrufe in `src/app/game-over/page.tsx:147-159`.
**Verifikation:** `grep -n "resetScores\|initSession" src/app/game-over/page.tsx src/stores/game-store.ts`.

### LOBBY-023 — Beim Verlassen des Spiels wird nachgefragt

**Preset:** Preset
**Anforderung:** Der Exit-Knopf im Spiel und der „Party verlassen"-Knopf im In-Game-Panel fragen per Bestätigungsdialog ab, bevor der Zustand zurückgesetzt und die Lobby geöffnet wird.
**Begründung:** Ein unbeabsichtigter Exit mitten in der Partie zerstört den Spielstand.
**Akzeptanz:** `handleExit` (`src/app/game/page.tsx:224-229`) — `confirm('Spiel abbrechen und zur Lobby zurückkehren?')`, danach `initSession()` und `router.push('/lobby')`.
**Verifikation:** `grep -n "confirm(" src/app/game/page.tsx src/app/settings/account/page.tsx`.

### LOBBY-024 — Die Lobby bietet ein Schnell-Setup und einen vollständigen Reset

**Preset:** Preset
**Anforderung:** In Schritt 1 führt „Schnell-Setup" direkt zum Startschritt; „Reset" setzt die Sitzung zurück und springt zu Schritt 1.
**Begründung:** Für erfahrene Gruppen ist der Sechs-Schritte-Assistent zu lang.
**Akzeptanz:** `src/app/lobby/page.tsx:730-738`.
**Verifikation:** `grep -n "Schnell-Setup\|Reset ↺" src/app/lobby/page.tsx`.

---

# 4. Musikprovider, Anti-Spoiler und Wiedergabe (MEDIA)

### MEDIA-001 — YouTube ist der Standard-Provider

**Preset:** Preset
**Anforderung:** Der Standard-Musikprovider ist `youtube`. Die Wiedergabe läuft über die YouTube-IFrame-Player-API mit `autoplay: 1`, `controls: 0`, `rel: 0` und `modestbranding: 1`.
**Begründung:** YouTube ist der einzige Provider, der ohne Konto, ohne API-Key und ohne Bezahlung für alle Nutzer funktioniert.
**Akzeptanz:** `DEFAULT_MUSIC_PROVIDER: 'youtube'` (`src/config/game-config.ts:80`); Player-Initialisierung `src/components/game/MusicPlayer.tsx:290-303`.
**Verifikation:** `grep -n "autoplay\|controls\|rel\|modestbranding" src/components/game/MusicPlayer.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-002 — Die Provider-Auswahl ist persistent

**Preset:** Preset
**Anforderung:** Der gewählte Provider (`youtube`, `spotify-premium`, `spotify-free`, `amazon-music`) und der YouTube-Playermodus (`standard` = www.youtube.com, `music` = music.youtube.com) werden gespeichert und bleiben über Sitzungen erhalten.
**Begründung:** Provider-Wechsel bei jeder Partie wäre lästig.
**Akzeptanz:** `preferredMusicProvider` und `preferredPlayer` in der `partialize`-Liste (`src/stores/game-store.ts:626-628`); Auswahl in `src/app/settings/audio/page.tsx` und `src/components/game/InGameSettingsPanel.tsx`.
**Verifikation:** `grep -n "preferredMusicProvider" src/stores/game-store.ts src/app/settings/audio/page.tsx`.

### MEDIA-003 — YouTube-Links werden robust auf Video-IDs normalisiert

**Preset:** Preset
**Anforderung:** Sowohl reine 11-stellige IDs als auch vollständige URLs (`youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/vi/`) werden zu einer Video-ID aufgelöst. Ist weder ID noch URL erkennbar, greift der unveränderte Wert.
**Begründung:** Der Katalog mischt beide Formen; eine robuste Auflösung ist die Grundlage für den Fallback-Mechanismus.
**Akzeptanz:** `extractYouTubeId` (`src/components/game/MusicPlayer.tsx:69-73`).
**Verifikation:** Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-004 — Beschädigte YouTube-Videos lösen eine Fallback-Kette aus

**Preset:** Preset
**Anforderung:** Schlägt ein YouTube-Video fehl, wird automatisch der nächste Eintrag der Fallback-Liste versucht (Hauptlink, dann `youtubeAlternatives`, dann `fallbackYoutubeId`). Ist die Liste erschöpft, zeigt der Player einen Fehlerzustand mit drei Aktionen: „Jetzt überspringen", „Alternative Player" (Wechsel zwischen www.youtube.com und music.youtube.com) und „Report Missing".
**Begründung:** Region-Sperren und Löschungen sind bei YouTube der Normalfall, nicht die Ausnahme; die Partie darf daran nicht scheitern.
**Akzeptanz:** Fallback-Queue `src/components/game/MusicPlayer.tsx:149-155`, Fehlerbehandlung `:254-272`, Fehler-Overlay `:483-535`; Katalogstand: 30 Songs mit `youtubeAlternatives`, 7 mit `fallbackYoutubeId` (gemessen über `src/data/songs/*.json`).
**Verifikation:** `grep -n "fallbackQueue" src/components/game/MusicPlayer.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-005 — Startet ein Video nicht, gilt ein Sechs-Sekunden-Timeout

**Preset:** Preset
**Anforderung:** Bleibt der YouTube-Player im Zustand `UNSTARTED`, wird nach 6.000 ms ein Fehler angenommen und die Fallback-Kette ausgelöst.
**Begründung:** Ohne Timeout bleibt eine Runde endlos hängen, wenn ein Video blockiert wird.
**Akzeptanz:** `src/components/game/MusicPlayer.tsx:333-342` — `setTimeout(..., 6000)` mit Prüfung von `getPlayerState()`.
**Verifikation:** `grep -n "6000" src/components/game/MusicPlayer.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-006 — Nach einem Fehler wird der Song automatisch übersprungen

**Preset:** Preset
**Anforderung:** Ist die Fallback-Kette erschöpft, startet ein 10-Sekunden-Countdown, danach wird der Song automatisch übersprungen. Der Nutzer kann den Skip auch sofort auslösen.
**Begründung:** Der Pilot soll den Fehler nicht weg tippen müssen; die sichtbare Vorwarnung behält die Kontrolle.
**Akzeptanz:** `startAutoSkipCountdown` (`src/components/game/MusicPlayer.tsx:239-252`) mit Startwert 10 und 1-Sekunden-Takt; Anzeige „Skip in {n}s" (`:504-508`); Sofort-Skip-Knopf (`:511-516`).
**Verifikation:** `grep -n "setAutoSkipCountdown(10)" src/components/game/MusicPlayer.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-007 — Die Wiedergabe startet an einem definierten Offset

**Preset:** Preset
**Anforderung:** Songs können über `previewTimestamp.start` ab einer definierten Sekunde abgespielt werden. Fehlt der Wert, startet die Wiedergabe bei Sekunde 0.
**Begründung:** Intros, in denen der Song nicht erkennbar ist, verschwenden die knappe Fragezeit.
**Akzeptanz:** `startSeconds = 0` als Default (`src/components/game/MusicPlayer.tsx:133`), Weitergabe an `playerVars.start` (`:299`), Aufrufstellen `src/components/game/modes/TimelineMode.tsx:270-282` (ohne Offset), `src/components/game/modes/HintMasterMode.tsx:131`, `src/components/game/modes/LyricsMode.tsx:120`, `src/components/game/modes/VibeCheckMode.tsx:98`, `src/components/game/modes/CoverConfusionMode.tsx:113`.
**Verifikation:** `grep -rn "startSeconds" src/components/game/`.

### MEDIA-008 — Die Wiedergabe endet automatisch am konfigurierten Endpunkt

**Preset:** Preset
**Anforderung:** Ist ein Endpunkt gesetzt, wird die Wiedergabe bei Erreichen des Endpunkts pausiert. Die Prüfung erfolgt alle 500 ms.
**Begründung:** Der Modus gibt die Wiedergabelänge vor; die Steuerung darf nicht vom Nutzer abhängen.
**Akzeptanz:** `src/components/game/MusicPlayer.tsx:317-327` — `setInterval(..., 500)`, `pauseVideo()` bei `currentTime >= endSeconds`.
**Verifikation:** `grep -n "endSeconds" src/components/game/MusicPlayer.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-009 — Die Lautstärke und der An/Aus-Zustand steuern die Wiedergabe

**Preset:** Preset
**Anforderung:** Die globale Musiklautstärke (0–1) wird auf den Player übertragen (als Prozent 0–100). Ist die Musik deaktiviert, wird der Player stumm geschaltet und pausiert.
**Begründung:** Ohne Master-Lautstärke kann eine Partie in einer Bibliothek unhörbar oder unauslöschbar sein.
**Akzeptanz:** `onReady` setzt Lautstärke und prüft `musicEnabled` (`src/components/game/MusicPlayer.tsx:305-315`); der Reaktivierungseffekt `:372-389`; Vorgaben `musicEnabled: true`, `musicVolume: 0.8` (`src/stores/game-store.ts:177-180`).
**Verifikation:** `grep -n "musicVolume" src/components/game/MusicPlayer.tsx src/stores/game-store.ts`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-010 — Spotify Free nutzt die 30-Sekunden-Preview

**Preset:** Optional
**Anforderung:** Ist `spotify-free` gewählt und ein `links.spotifyFreePreview` hinterlegt, wird die Preview über ein `<audio>`-Element abgespielt. Ist keine Preview hinterlegt, wird YouTube verwendet.
**Begründung:** Der kostenlose Spotify-Zugang liefert nur 30 Sekunden; ohne Preview bleibt YouTube die ehrliche Antwort.
**Akzeptanz:** `useSpotifyFree` (`src/components/game/MusicPlayer.tsx:168`), Vorschau-Block `:573-583`, Einblendhinweis „Free ist auf kurze Preview-Clips begrenzt" (`:578-580`); Katalogstand: nur 7 von 1.615 Songs haben `spotifyFreePreview` (gemessen).
**Verifikation:** `grep -n "useSpotifyFree" src/components/game/MusicPlayer.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-011 — Spotify Premium nutzt den Embed-Player

**Preset:** Optional
**Anforderung:** Ist `spotify-premium` gewählt und eine Spotify-Track-ID vorhanden, wird ein Spotify-Embed-iframe über den Player gelegt. Ohne Premium-Konto bleibt YouTube aktiv, und der Nutzer wird darauf hingewiesen.
**Begründung:** Der Vollton-Playback über Spotify ist ein Komfortmerkmal; YouTube bleibt der verlässliche Weg.
**Akzeptanz:** `extractSpotifyTrackId` (`src/components/game/MusicPlayer.tsx:75-80`), `useSpotifyPremium` (`:167`), Embed `:559-571`, Hinweis „bei fehlender Premium-Wiedergabe wird YouTube genutzt" (`:552`); Katalogstand: 734 von 1.615 Songs haben einen Spotify-Link.
**Verifikation:** `grep -n "useSpotifyPremium" src/components/game/MusicPlayer.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-012 — Amazon Music nutzt den Embed-Player, Prime nur mit Preview

**Preset:** Optional
**Anforderung:** Für Amazon existieren zwei Pfade: `amazon-music-premium` mit Voll-Track-Embed (aus `links.amazonMusic`) und `amazon-music` mit Prime-Preview (aus `links.amazonPrimePreview`). Fehlt die jeweilige Quelle, wird YouTube verwendet und der eingeschränkte Umfang wird angezeigt.
**Begründung:** Amazon Music liefert ohne Prime-Zugang keine Vorschau; der Nutzer muss wissen, warum es leiser oder kürzer klingt.
**Akzeptanz:** `extractAmazonTrackId` mit fünf unterstützten URL-Formen (`src/components/game/MusicPlayer.tsx:96-120`), `useAmazonPrime`/`useAmazonPremium` (`:169-170`), Embeds `:585-619`, Hinweis `:553-555`; Katalogstand: 381 Songs mit `amazonMusic`, 0 mit `amazonPrimePreview` (gemessen) — siehe [GAP-012](#offene-lücken).
**Verifikation:** `npm run test -- MusicPlayer` (bestehende Tests decken `extractAmazonTrackId` ab); Test existiert nicht für die Pfadwahl — siehe [GAP-001](#offene-lücken).

### MEDIA-013 — Fehlende Links können gemeldet werden, mit Rate-Limit

**Preset:** Preset
**Anforderung:** Der Nutzer kann einen nicht abspielbaren Song melden. Der Meldeweg ist ausschließlich nutzergetriggert: Es wird ein GitHub-Issue mit technischen Metadaten (Song-ID, Titel, Künstler, Pack, gewählter Provider, vorhandene Links, Zeitzone, Locale, Region) in einem neuen Tab geöffnet. Ist keine Issue-URL konfiguriert, wird der JSON-Report in die Zwischenablage kopiert.
**Begründung:** Die Community kann Link- und Regionsprobleme selbst heilen; der Meldeweg soll ohne Server auskommen.
**Akzeptanz:** `handleReportMissing` (`src/components/game/MusicPlayer.tsx:172-237`); die Nutzerfreigabe wird ausdrücklich vermerkt: „avoid free-text fields … to prevent accidental transmission of PII" (`src/app/privacy/page.tsx`, Abschnitt „Technical Metadata").
**Verifikation:** `grep -n "NEXT_PUBLIC_GITHUB_ISSUE_URL" src/components/game/MusicPlayer.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-014 — Die Meldung ist auf fünf Meldungen pro Stunde und Gerät begrenzt

**Preset:** Preset
**Anforderung:** Pro Gerät sind maximal 5 Meldungen pro Stunde erlaubt. Jeder Song kann nur einmal gemeldet werden. Die Geräte-ID liegt im `localStorage` unter `phomu-device-id`, der Meldestatus unter `phomu-missing-report-state-v1`.
**Begründung:** Ohne Begrenzung produziert ein defekter Song einen Meldesturm in die offenen Issues.
**Akzeptanz:** `src/components/game/MusicPlayer.tsx:172-195` — `HOUR_MS = 60 * 60 * 1000`, `MAX_PER_HOUR = 5`, Duplikatprüfung über `parsed.songs[songId]`; Statusanzeige `:621-627` („Rate limit: max 5/h je Gerät", „Für diesen Song bereits gemeldet").
**Verifikation:** `grep -n "MAX_PER_HOUR\|phomu-device-id\|phomu-missing-report-state-v1" src/components/game/MusicPlayer.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-015 — Das Anti-Spoiler-Overlay nutzt Blur plus Aufdeck-Geste

**Preset:** Preset
**Anforderung:** Ist `blurred` gesetzt, liegt über dem Player eine Blur-Schicht (`blur-[60px]`, `opacity-50`, `scale-125`, `pointer-events-none`). Ein Drag-Griff erlaubt das Aufdecken ab einer horizontalen Verschiebung von mehr als 150 px. Nach dem Aufdecken kann der Zustand über „Verbergen" zurückgesetzt werden.
**Begründung:** Die Geste ist bewusst nicht-trivial: Wer sie kennt, bekommt einen Vorteil — das ist der Anti-Cheat, den der Pilot kontrolliert.
**Akzeptanz:** Blur-Wrapper `src/components/game/MusicPlayer.tsx:424-430`; Overlay `:434-478` — `drag="x"`, `if (info.offset.x > 150) setVideoRevealed(true)`; „Verbergen"-Knopf `:538-545`.
**Verifikation:** `grep -n "offset.x > 150\|blur-\[60px\]" src/components/game/MusicPlayer.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-016 — Fehlt ein abspielbares Medium, wird das explizit gesagt

**Preset:** Preset
**Anforderung:** Gibt es weder YouTube-ID noch Spotify-/Amazon-Quelle, rendert der Player den Hinweis „Kein Video verfügbar" statt einer leeren Fläche.
**Begründung:** Eine leere Fläche sieht wie ein Fehler im Spiel aus; der Klartext erklärt die Lage.
**Akzeptanz:** `src/components/game/MusicPlayer.tsx:417-419`.
**Verifikation:** `grep -n "Kein Video verfügbar" src/components/game/MusicPlayer.tsx`.

### MEDIA-017 — Der Musikplayer bleibt über den Reveal-Übergang hinweg montiert

**Preset:** Preset
**Anforderung:** Während des Wechsels von der Frage- zur Auflösungsphase wird die Frage-Komponente nicht unmounted, sondern per `display: none` ausgeblendet. Dadurch läuft die Wiedergabe ohne Neustart weiter.
**Begründung:** Ein Neustart des Videos mitten in der Auflösung wäre hörbar und würde den Rhythmus brechen.
**Akzeptanz:** `src/app/game/page.tsx:404-431` — Kommentar „QuestionPhase bleibt gemountet … display:none hält den Iframe am Leben — Audio läuft weiter"; `QuestionPhase` und `RevealPhase` werden im selben Container gerendert (`:423-460`).
**Verifikation:** `grep -n "display: 'none'" src/app/game/page.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### MEDIA-018 — Der Providerstatus wird im Player angezeigt

**Preset:** Preset
**Anforderung:** Bei Nutzung eines eingeschränkten Providers blendet der Player unten links einen Status-Text ein, der die Einschränkung benennt und den YouTube-Fallback ankündigt.
**Begründung:** Transparenz über die tatsächliche Tonquelle verhindert Beschwerden über „fehlende" Musik.
**Akzeptanz:** `src/components/game/MusicPlayer.tsx:547-557`.
**Verifikation:** `grep -n "YouTube-Fallback aktiv" src/components/game/MusicPlayer.tsx`.

---

# 5. Oberfläche, Themes, Navigation, Projektor, Barrierefreiheit (UI)

### UI-001 — Vier Themes mit CSS-Custom-Properties

**Preset:** Preset
**Anforderung:** Phomu bietet die Themes `jackbox` (Standard), `spotify`, `youtube` und `musicwall`. Jedes Theme definiert dieselben Tokens (`--color-bg`, `--color-bg-secondary`, `--color-bg-card`, `--color-text`, `--color-text-secondary`, `--color-primary`, `--color-primary-hover`, `--color-secondary`, `--color-accent`, `--color-success`, `--color-error`, `--color-border`, `--radius`).
**Begründung:** Ein einheitlicher Token-Satz macht neue Themes zu einer reinen CSS-Datei.
**Akzeptanz:** `AVAILABLE_THEMES` (`src/config/game-config.ts:86`), `DEFAULT_THEME: 'jackbox'` (`:85`); die vier Token-Blöcke in `src/app/globals.css`.
**Verifikation:** `grep -n "data-theme=" src/app/globals.css`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### UI-002 — Das Theme wird über ein HTML-Attribut gesteuert

**Preset:** Preset
**Anforderung:** Das aktive Theme wird über `data-theme` am `<html>`-Element gesetzt und unter `phomu-theme` in `localStorage` gespeichert. Ist der gespeicherte Wert unbekannt, greift das Standard-Theme.
**Begründung:** Ein Attribut statt JavaScript-Klassen erlaubt serverseitiges Styling und verhindert Flackern.
**Akzeptanz:** `src/contexts/ThemeContext.tsx:27-41` — `STORAGE_KEY = 'phomu-theme'`, Validierung gegen `PHOMU_CONFIG.AVAILABLE_THEMES` (`:33`), `document.documentElement.setAttribute('data-theme', theme)` (`:39`); Startwert in `src/app/layout.tsx:40` (`data-theme="jackbox"`).
**Verifikation:** `grep -n "data-theme" src/contexts/ThemeContext.tsx src/app/layout.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### UI-003 — Theme- und Sprachumschalter sind in NavBar und Settings erreichbar

**Preset:** Preset
**Anforderung:** Das Theme und die Sprache lassen sich sowohl über das Einstellungs-Panel der Navigationsleiste als auch über die Einstellungen-Seiten umschalten. Die aktive Auswahl ist eindeutig markiert.
**Begründung:** Der Wechsel muss jederzeit erreichbar sein, auch mitten im Spiel.
**Akzeptanz:** NavBar-Panel `src/components/ui/NavBar.tsx`; `ThemeSwitcher` (`src/components/ui/ThemeSwitcher.tsx:33-51`) und `LanguageSwitcher` (`src/components/ui/LanguageSwitcher.tsx:30-51`) mit `aria-pressed`; zusätzlich im In-Game-Panel (`src/components/game/InGameSettingsPanel.tsx`).
**Verifikation:** `grep -rn "aria-pressed" src/components/ui/`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### UI-004 — Die Navigationsleiste erscheint nicht im Spiel

**Preset:** Preset
**Anforderung:** Auf den Routen `/game` und `/game-over` wird keine Navigationsleiste gezeigt; diese Seiten bringen ihre eigene Kopfleiste mit.
**Begründung:** Im Spiel ist Platz für Punkte, Modus und Timer — nicht für Navigation.
**Akzeptanz:** `HIDDEN_PREFIXES = ['/game', '/game-over']` (`src/components/ui/ConditionalNavBar.tsx:13-19`), eingebunden in `src/app/layout.tsx:36-39`.
**Verifikation:** `grep -n "HIDDEN_PREFIXES" src/components/ui/ConditionalNavBar.tsx`.

### UI-005 — Die Navigation enthält Lobby und Browse

**Preset:** Preset
**Anforderung:** Die Hauptnavigation enthält die Links „Lobby" und „Browse" sowie einen Einstellungs-Knopf, der ein Panel mit Sprache, Theme und Admin-Link öffnet. Der aktive Eintrag ist farblich hervorgehoben.
**Begründung:** Zwei Hauptziele genügen: spielen und stöbern.
**Akzeptanz:** `NAV_LINKS` (`src/components/ui/NavBar.tsx:17-20`), `isActive`-Berechnung in der Renderfunktion, Admin-Link auf `/admin/songs`.
**Verifikation:** `grep -n "NAV_LINKS" src/components/ui/NavBar.tsx`.

### UI-006 — Der Projektor-Modus ist spoilerfrei

**Preset:** Preset
**Anforderung:** Die Route `/projector` zeigt Modus, Runde, Phase, Wertung, aktiven Spieler und den Fortschritt zum Ziel — aber niemals Titel, Künstler, Cover oder Jahr des aktuellen Songs. Während der Fragerunde steht dort ein animierter Platzhalter.
**Begründung:** Der Beamer hängt über dem Tisch; eine dort sichtbare Lösung entwertet die Runde für den ganzen Raum.
**Akzeptanz:** Platzhalter `src/app/projector/page.tsx:226-254`; im Player wird kein Song-Titel angezeigt; `phaseLabel` (`:54-59`).
**Verifikation:** `grep -n "Frage läuft" src/app/projector/page.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### UI-007 — Der Projektor-Modus synchronisiert sich über denselben Zustand

**Preset:** Preset
**Anforderung:** `/projector` liest aus demselben persistierten Zustand wie das Spiel und rendert alle 2 Sekunden neu, damit Punktänderungen vom Gerät ankommen. Ohne laufendes Spiel zeigt die Route „Kein Spiel aktiv".
**Begründung:** Ein zweites Gerät oder ein zweiter Tab soll ohne Server dieselbe Partie spiegeln.
**Akzeptanz:** `setInterval(..., 2000)` (`src/app/projector/page.tsx:41-44`), Zustandsquelle `useGameStore()` (`:27-36`), Leerzustand `:61-69`; Persistenz siehe [LOBBY-021](#lobby-021--die-sitzung-ist-clientseitig-und-überlebt-einen-reload).
**Verifikation:** `grep -n "2000" src/app/projector/page.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### UI-008 — Der Projektor-Modus ist im Spiel per Knopf erreichbar

**Preset:** Preset
**Anforderung:** Aus dem In-Game-Einstellungs-Panel öffnet ein Knopf den Projektor-Modus in einem neuen Browser-Tab.
**Begründung:** Der Beamer ist ein zweites Gerät; ein Tabwechsel auf dem Spielgerät wäre ein Fehler.
**Akzeptanz:** `window.open('/projector', '_blank')` in `src/components/game/InGameSettingsPanel.tsx`.
**Verifikation:** `grep -n "projector" src/components/game/InGameSettingsPanel.tsx`.

### UI-009 — Die Kopfleiste zeigt Modus, Piloten, Fortschritt und Timer

**Preset:** Preset
**Anforderung:** Die Spiel-Kopfleiste zeigt den aktiven Modus (mit Emoji), den Piloten (Avatar, Name, Farbe), den Fortschritt zum Ziel und — sofern `timeLimitSeconds` gesetzt ist — einen Sekundenzähler. Sie enthält einen Exit-Knopf mit `aria-label`.
**Begründung:** Der Pilot muss jederzeit wissen, wer dran ist, wie lange noch und wie weit das Spiel ist.
**Akzeptanz:** `src/components/game/GameHeader.tsx:127-209`; `TimerCountdown` `:66-92` mit Farbwechsel bei ≤ 20 s (`:78-81`) und `aria-label` (`:87`); `timeLimitSeconds` wird nur in der Fragephase übergeben (`src/app/game/page.tsx:317`).
**Verifikation:** `grep -n "TimerCountdown\|aria-label" src/components/game/GameHeader.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### UI-010 — Läuft die Fragezeit ab, geht die Runde in die Auflösung

**Preset:** Preset
**Anforderung:** Erreicht der Timer 0, wechselt die Phase von `question` auf `reveal`. In anderen Phasen hat der Timer keine Wirkung.
**Begründung:** Ohne automatische Auflösung hängt die Partie, wenn der Pilot vergisst.
**Akzeptanz:** `handleTimeUp` (`src/app/game/page.tsx:232-236`) — `if (roundPhase === 'question') advancePhase('reveal')`; Timer-Reset je Runde über den `key` in `src/components/game/GameHeader.tsx:201-205`.
**Verifikation:** `grep -n "handleTimeUp" -A 5 src/app/game/page.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### UI-011 — Touch-Ziele sind mindestens 44 Pixel hoch

**Preset:** Preset
**Anforderung:** Interaktive Elemente in Spiel und Lobby sind mindestens 44 px hoch (Höhe oder Breite). Das gilt insbesondere für Modus-, Pack- und Einstellungsknöpfe, den Entfernen-Knopf eines Spielers und die Knöpfe der Zeitlimit-Auswahl.
**Begründung:** 44 px ist die etablierte Mindestgröße für Touch-Ziele; darunter wird es auf dem Handy unzuverlässig.
**Akzeptanz:** `min-h-[44px]` in `src/components/lobby/ModeSelector.tsx`, `src/components/lobby/PackSelector.tsx`, `src/components/game/QuestionPhase.tsx:108`; `w-11 h-11` in `src/components/lobby/PlayerCard.tsx` und `src/components/game/GameHeader.tsx:150`.
**Verifikation:** `grep -rn "min-h-\[44px\]\|h-11 w-11\|w-11 h-11" src/components/ | wc -l`; Test existiert nicht — siehe [GAP-021](#offene-lücken).

### UI-012 — Safe-Area-Insets werden berücksichtigt

**Preset:** Preset
**Anforderung:** Für Geräte mit Notch und Home-Indicator werden die CSS-Variablen `--sat`, `--sar`, `--sab`, `--sal` aus `env(safe-area-inset-*)` gesetzt; die Utilities `pt-safe`, `pb-safe`, `pl-safe`, `pr-safe` verwenden sie. Der Viewport wird mit `viewportFit: 'cover'` geöffnet.
**Begründung:** Ohne die Insets liegt die Kopfzeile unter dem Notch und der Footer über dem Home-Indicator.
**Akzeptanz:** `src/app/globals.css` (Safe-Area-Block und Utilities); `src/app/layout.tsx:29-33` (`viewportFit: 'cover'`); Anwendung in `src/app/lobby/page.tsx:128` und `:697`, `src/components/game/GameHeader.tsx:129`.
**Verifikation:** `grep -n "safe-area-inset" src/app/globals.css`; Test existiert nicht — siehe [GAP-021](#offene-lücken).

### UI-013 — Tastaturbedienung und sichtbarer Fokus sind garantiert

**Preset:** Preset
**Anforderung:** Der Timeline-Modus ist per Tastatur bedienbar: Zifferntasten wählen den Slot 1–n, Pfeiltasten navigieren, Enter/Leertaste bestätigt. Sichtbare Fokusringe werden über `:focus-visible` mit einer 3 px starken Kontur in der Akzentfarbe gesetzt; Tooltips erscheinen auch bei Fokus.
**Begründung:** Am Laptop zu Hause wird Phomu ohne Maus gespielt.
**Akzeptanz:** `src/components/game/modes/TimelineMode.tsx:242-255` (Tastatursteuerung), `src/app/globals.css` (`:focus-visible`-Block), `src/components/ui/Tooltip.tsx` (`onFocus`/`onBlur`).
**Verifikation:** `grep -n "focus-visible" src/app/globals.css`; `grep -n "ArrowUp" src/components/game/modes/TimelineMode.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### UI-014 — Das Rückmeldebild ist bewusst „juicy", aber nicht{blockierend}

**Preset:** Preset
**Anforderung:** Richtige und falsche Antworten werden mit deterministisch gewählten Texten aus zwei Listen (je über 100 Einträge) quittiert. Gleiche Eingabe (Song-ID, Richtig/Falsch) ergibt immer denselben Text. Die Texte variieren den Ton zwischen flapsig und trocken, ohne die Spielbarkeit zu stören.
**Begründung:** Die Rückmeldung ist ein wesentlicher Teil des_party-Faktors; Determinismus sorgt dafür, dass ein Song immer gleich reagiert.
**Akzeptanz:** `CORRECT_MESSAGES` (`src/utils/feedback-messages.ts:10`), `WRONG_MESSAGES` (`:115`), `hashSeed`/`pickDeterministic` (`:223-240`), `getSpicyMessage`/`getSpicyColor` (`:242-249`); Aufrufe in `src/components/game/RevealPhase.tsx:508-513` und in jedem Modus.
**Verifikation:** `grep -n "getSpicyMessage" src/components/game/`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### UI-015 — Feedback-Overlays begleiten die Spielereignisse

**Preset:** Preset
**Anforderung:** Beim Wechsel in die Fragephase, beim Reveal, bei richtiger und falscher Antwort sowie beim Spielende werden eigene Overlays bzw. Soundeffekte ausgelöst. Doppelte Auslösung bei einem Re-Render ist ausgeschlossen (Vergleich mit dem vorherigen Zustand).
**Begründung:** Rückmeldung muss an das Ereignis gekoppelt sein, nicht an den Renderzyklus.
**Akzeptanz:** `src/hooks/useGameAudioCues.ts:76-96` (Phasenvergleich), `:97-108` (Antwortzähler), `:109-116` (Spielende); `FeedbackOverlay` und `DiceAnimation` in `src/app/game/page.tsx:300-304`.
**Verifikation:** `grep -n "previousPhaseRef\|previousAnswerCountRef" src/hooks/useGameAudioCues.ts`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### UI-016 — Soundeffekte sind abschaltbar und skalierbar

**Preset:** Preset
**Anforderung:** Soundeffekte lassen sich einzeln deaktivieren und in der Lautstärke regeln (Vorgabe 0,55). Fehlende oder nicht abspielbare Dateien führen zu keiner Fehlermeldung.
**Begründung:** Soundeffekte dürfen den Musikfluss nie unterbrechen.
**Akzeptanz:** `src/hooks/useGameAudioCues.ts:36-58` — `if (!sfxEnabled) return`, Stille im Fehlerfall; Vorgabe `sfxEnabled: true`, `sfxVolume: 0.55` (`src/stores/game-store.ts:181-184`); Regler `src/app/settings/audio/page.tsx`.
**Verifikation:** `grep -n "sfxVolume" src/hooks/useGameAudioCues.ts src/stores/game-store.ts`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### UI-017 — Das Einstellungs-Hub ist in fünf Bereiche gegliedert

**Preset:** Preset
**Anforderung:** `/settings` verlinkt auf fünf Bereiche: Spieler & Profil, Audio & Provider, Governance, Legal & Konto und Spielhilfe. Im Kopf werden Spielerzahl, Gesamt-XP und Level angezeigt; läuft ein Spiel, führt ein Knopf zurück ins Spiel.
**Begründung:** Fünf klar getrennte Bereiche sind auf dem Handy auffindbar; eine flache Liste mit 20 Optionen nicht.
**Akzeptanz:** `SETTINGS_SECTIONS` (`src/app/settings/page.tsx:10-37`), `StatCard`-Anzeige (`:42-47`), Level-Berechnung `Math.floor(totalXP / 100) + 1` (`:43`).
**Verifikation:** `grep -n "SETTINGS_SECTIONS" src/app/settings/page.tsx`.

### UI-018 — Änderungen im Spiel gelten ab der nächsten Runde

**Preset:** Preset
**Anforderung:** Ändern sich Modi, Packs oder Governance-Regeln während eines laufenden Spiels, bleiben Spieler, Punkte und der aktuelle Stand unverändert. Die Oberfläche weist darauf hin, dass Änderungen erst ab der nächsten Runde greifen.
**Begründung:** Ein Moduswechsel mitten in einer Runde würde die laufende Runde entwerten.
**Akzeptanz:** Hinweistext `src/app/settings/game-rules/page.tsx` („Änderungen gelten ab der nächsten Runde"), `currentRound`-Abfrage in allen Settings-Seiten, Modus-/Packwechsel über `setConfig` ohne Eingriff in `currentRound` (`src/stores/game-store.ts:248-252`).
**Verifikation:** `grep -rn "currentRound" src/app/settings/*/page.tsx | wc -l`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

---

# 6. Internationalisierung (I18N)

### I18N-001 — Zwei Sprachen: Deutsch als Standardsprache

**Preset:** Preset
**Anforderung:** Unterstützt sind `de` (Standard) und `en`. Die Liste der unterstützten Sprachen und die Standardsprache sind zentral in der Konfiguration hinterlegt.
**Begründung:** Deutsch ist die Sprache des Marktzentrums; Englisch erschließt den internationalen Markt.
**Akzeptanz:** `SUPPORTED_LANGUAGES: ['de', 'en']` und `DEFAULT_LANGUAGE: 'de'` (`src/config/game-config.ts:76-77`); `fallbackLng: 'de'` (`src/i18n/config.ts:22`).
**Verifikation:** `grep -n "SUPPORTED_LANGUAGES\|DEFAULT_LANGUAGE" src/config/game-config.ts`; `grep -n "fallbackLng" src/i18n/config.ts`.

### I18N-002 — Die Sprache wird erkannt, gespeichert und manuell umschaltbar

**Preset:** Preset
**Anforderung:** Die Sprache wird über `localStorage` und Browser-Einstellung erkannt und im `localStorage` gespeichert. Der Nutzer kann jederzeit manuell umschalten; die Umschaltung wirkt sofort.
**Begründung:** Ein erzwungener Neustart nach dem Sprachwechsel ist ein vermeidbarer Stolperstein.
**Akzeptanz:** `src/i18n/config.ts:26-29` — `detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] }`; Umschaltung `i18n.changeLanguage(lang)` in `src/components/ui/LanguageSwitcher.tsx:34` und `src/components/ui/NavBar.tsx`.
**Verifikation:** `grep -n "changeLanguage" src/components/ui/`; Test existiert nicht — siehe [GAP-006](#offene-lücken).

### I18N-003 — Der Sprachwechsel darf keinen unübersetzten Bildschirm zeigen

**Preset:** Preset
**Anforderung:** Die i18n-Bibliothek wird erst nach erfolgreicher Initialisierung geladen; bis dahin rendert die Anwendung nichts. Damit entsteht kein Zwischenstand mit unübersetzten oder fehlenden Texten.
**Begründung:** Das Nachladen der Sprachpakete ist ein asynchroner Schritt; ohne Wartephase flackert die Oberfläche.
**Akzeptanz:** `src/components/Providers.tsx:20-31` — dynamischer Import von `@/i18n/config`, `if (!isReady) return null`.
**Verifikation:** `grep -n "isReady" src/components/Providers.tsx`; Test existiert nicht — siehe [GAP-006](#offene-lücken).

### I18N-004 — DE und EN sind vollständig parallel

**Preset:** Preset
**Anforderung:** `de.json` und `en.json` enthalten denselben Schlüsselumfang in derselben Struktur; keine Werte sind leer, kein Schlüssel existiert nur in einer Sprache. Die englischen Werte sind echte Übersetzungen, keine Kopien der deutschen.
**Begründung:** Ein einseitiger Schlüssel ist ein toter Text in der Produktion und ein Fehler in der Oberfläche.
**Akzeptanz:** Gemessener Stand: beide Dateien haben 6 Namensräume (`app`, `landing`, `settings`, `themes`, `modes`, `common`) und je 25 Blatt-Schlüssel — parallel und vollständig. `en.json` enthält eigenständige englische Werte (z. B. `"landing.quickStartDesc": "3 clicks and you're playing!"`). Das Gate-Skript `scripts/check-i18n-completeness.mjs` prüft Parität, leere Werte und Pluralformen.
**Verifikation:** `node scripts/check-i18n-completeness.mjs` (Gate, Exit 1 bei Verstoß) bzw. `node scripts/check-i18n-completeness.mjs --count` für die Zählung. Das Skript existiert seit dem 25.10.2026; als npm-Skript `npm run check:i18n` ist es noch nicht verdrahtet — siehe [GAP-006](#offene-lücken).

### I18N-005 — Der Schlüsselraum ist flach und punktbasiert

**Preset:** Preset
**Anforderung:** Schlüssel sind flache Punktpfade der Form `namespace.unterpunkt.bezeichnung`. Schlüssel enthalten keine Interpolation; Platzhalter stehen ausschließlich im Wert (`{{count}}`).
**Begründung:** Statische Schlüssel sind die Voraussetzung dafür, dass ein Vollständigkeits-Gate überhaupt funktionieren kann.
**Akzeptanz:** `src/i18n/locales/de.json` und `en.json` verwenden ausschließlich Punktpfade; Platzhalter kommen im aktuellen Stand in keinem Wert vor.
**Verifikation:** `grep -n "{{" src/i18n/locales/*.json` (muss leer sein, solange keine Platzhalter verwendet werden); Pluralformen werden vom Gate `node scripts/check-i18n-completeness.mjs` geprüft.

### I18N-006 — Eigennamen und Modusnamen bleiben in beiden Sprachen identisch

**Preset:** Preset
**Anforderung:** Produkt- und Anbieternamen (Phomu, Spotify, YouTube, Jackbox, Amazon Music) sowie die sechs Modusnamen bleiben in beiden Sprachen unverändert. Die Modusnamen sind im Code englisch (`timeline`, `hint-master`, …) und werden in der Oberfläche über den Modusschlüssel übersetzt.
**Begründung:** Ein Markenname ist kein übersetzbarer Text.
**Akzeptanz:** `themes.*` und `modes.*` in `src/i18n/locales/de.json` und `en.json` sind identisch bzw. entsprechen dem jeweiligen Modusnamen; die Zuordnung Modus → Anzeigename erfolgt je Oberfläche (z. B. `MODE_LABELS` in `src/app/projector/page.tsx:17-24`).
**Verifikation:** `node -e "const d=require('./src/i18n/locales/de.json'),e=require('./src/i18n/locales/en.json');console.log(JSON.stringify(d.themes)===JSON.stringify(e.themes)?'themes identisch':'ABWEICHUNG')"`; die Eigennamen-Whitelist ist im Gate über `BRAND_ALLOWLIST` hinterlegt (`scripts/check-i18n-completeness.mjs`).

### I18N-007 — Jeder sichtbare Text stammt aus der Übersetzung

**Preset:** Preset
**Anforderung:** Jeder für den Nutzer sichtbare Text wird über `t()` bezogen. Im JSX steht kein Literaltext mehr.
**Begründung:** Nur so ist „Deutsch primär, Englisch vollständig" überhaupt haltbar.
**Akzeptanz:** **Stand: nicht erfüllt.** Derzeit wird `useTranslation` nur in `src/app/page.tsx` verwendet. Das Gate zählt 935 Literaltexte in 47 geprüften Dateien; die größten Fundorte sind `src/components/game/RevealPhase.tsx` (141), `src/components/game/FeedbackOverlay.tsx` (3) und `src/components/game/QuestionPhase.tsx` (2). Siehe [GAP-006](#offene-lücken).
**Verifikation:** `node scripts/check-i18n-completeness.mjs --count` — meldet aktuell 935 Literaltexte in 47 Dateien; das Gate ist erst grün, wenn 0 Literaltexte verbleiben. Derzeitiger Stand zusätzlich prüfbar mit `grep -rn "useTranslation" src/ | wc -l` (Ergebnis 1).

---

# 7. Songkatalog, Packs und Datenqualität (CAT)

### CAT-001 — Der Katalog ist die Dateibasis, keine Datenbank

**Preset:** Preset
**Anforderung:** Der Songkatalog liegt als JSON je Pack unter `src/data/songs/` und wird über `src/data/songs/index.ts` zu `ALL_SONGS` zusammengeführt. Der Loader ist generiert und nicht manuell zu pflegen.
**Begründung:** Eine versionierte Dateibasis ist reviewbar und deterministisch; die generierte Aggregation verhindert manuelle Abweichungen.
**Akzeptanz:** `src/data/songs/index.ts` (Hinweis „This file is generated by scripts/migrate_and_deduplicate.py. Do not edit it manually."), Import von 135 Pack-Dateien; `ALL_SONGS` exportiert.
**Verifikation:** `ls src/data/songs/*.json | grep -v packs.json | wc -l` (gemessen: 135); `grep -n "generated by" src/data/songs/index.ts`.

### CAT-002 — Der Katalog umfasst 135 Pack-Dateien mit 1.615 Songs

**Preset:** Preset
**Anforderung:** Der Bestand umfasst 135 Pack-Dateien und 1.615 Songs (gemessen am 2026-10-25 über `npm run validate-catalog`).
**Begründung:** Der Bestand ist das größte Einzelasset des Produkts; jede Zahl, die ihn beschreibt, muss messbar sein.
**Akzeptanz:** `npm run validate-catalog` meldet „Packs: 135", „Songs: 1615".
**Verifikation:** `npm run validate-catalog`.

### CAT-003 — Es gibt genau 27 konfigurierte Packs, und alle sind im Katalog belegt

**Preset:** Preset
**Anforderung:** `PHOMU_CONFIG.SONG_PACKS` listet 27 Packs mit ID, Namen, Claim, Emoji und Farbverlauf. Jede dieser IDs kommt als `packs`-Eintrag in mindestens einem Song vor, und im Katalog existiert kein Pack-Name ohne zugehörige Konfiguration.
**Begründung:** Ein Pack ohne Songs liefert eine leere Auswahl und blockiert die Partie; ein Katalog-Pack ohne Konfiguration ist nicht wählbar und wäre toter Bestand.
**Akzeptanz:** `src/config/game-config.ts:89-279` (27 Einträge); gemessen: 27 verschiedene Pack-Namen in den Songdaten, 0 SONG_PACKS-IDs ohne Songs, 0 Daten-Packnamen ohne Konfiguration.
**Verifikation:** `grep -c "^      id: '" src/config/game-config.ts` (Ergebnis 27); Gegenprüfung über ein Skript über `src/data/songs/*.json`.

### CAT-004 — Der Katalog-Zugang filtert nach Pack-Zuordnung

**Preset:** Preset
**Anforderung:** Ein Song gehört zu einem Pack, wenn seine `packs`-Liste mindestens eine der gewählten Pack-IDs enthält. Der Zugang filtert über diese Zuordnung.
**Begründung:** Die Pack-Zuordnung ist das einzige Ordnungsprinzip des Katalogs.
**Akzeptanz:** `src/utils/song-picker.ts:36-40` — `ALL_SONGS.filter(s => s.packs.some(p => packIds.includes(p)))`; Typ `packs: string[]` (`src/types/song.ts:83`).
**Verifikation:** `grep -n "packs.some" src/utils/song-picker.ts`; Test existiert nicht — siehe [GAP-003](#offene-lücken).

### CAT-005 — Der Katalog-Gate verhindert Regressionen

**Preset:** Preset
**Anforderung:** `npm run validate-catalog` schlägt fehl, wenn die Zahl der Schema-Fehler, der Duplicate-Gruppen oder der fehlenden Jahre gegenüber `specifications/quality-baseline.json` steigt. Mit `--strict` gilt jede Überschreitung als Fehler. Der Gate schreibt optional einen JSON-Report.
**Begründung:** Ein Bestand ohne Baseline-Gate erodiert unbemerkt.
**Akzeptanz:** `src/utils/validate-song-catalog.ts:250-268` — Strict-Modus und Baseline-Vergleich; Baseline-Datei `specifications/quality-baseline.json` (`schemaErrors: 3194`, `duplicateGroups: 164`, `missingYears: 0`); Report-Pfad `specifications/catalog_issues_report.json` (`:200-204`).
**Verifikation:** `npm run validate-catalog` (gemessen: „Katalog-Gate bestanden (keine Regression gegen Baseline)."); `npm run validate-catalog:report`.

### CAT-006 — Dubletten sind verboten, Ausnahmen sind kuratiert

**Preset:** Preset
**Anforderung:** Zwei Songs mit gleichem normalisiertem `artist + title + year` sind unzulässig. Ausnahmen sind ausschließlich über Einträge in `specifications/duplicate-allowlist.json` erlaubt. Reine Sekundär-Import-Dubletten aus `youtube-import.json` werden nicht als kuratierter Fehler gezählt, solange höchstens ein Primär-Pack betroffen ist.
**Begründung:** Doppelt enthaltene Songs verdoppeln die Ziehungswahrscheinlichkeit und beschädigen die Wertung des Katalogs.
**Akzeptanz:** `duplicateKey` und `checkDuplicates` (`src/utils/validate-song-catalog.ts:92-133`), Allowlist-Zugriff `:44-53`, Sekundär-Pack-Set `:57-61`; Policy in `specifications/duplicate_policy.md`. Gemessener Stand: 0 offene Duplicate-Gruppen, 4 erlaubte Dubletten.
**Verifikation:** `npm run validate-catalog`; `cat specifications/duplicate-allowlist.json`.

### CAT-007 — Der Katalog muss jedes Jahr von 1950 bis zum laufenden Jahr abdecken

**Preset:** Preset
**Anforderung:** Für jedes Jahr von 1950 bis zum laufenden Jahr muss mindestens ein Song existieren. Fehlende Jahre sind ein harter Gate-Fehler.
**Begründung:** Der Timeline-Modus braucht dichte Jahrgänge; ein Loch macht die Frage „wann war das?" unspielbar.
**Akzeptanz:** `checkYearCoverage(packs, 1950, coverageEndYear)` (`src/utils/validate-song-catalog.ts:198`), Option `--coverage-end-year` (`:161-173`); gemessener Stand: 0 fehlende Jahre für 1950–2026.
**Verifikation:** `npm run validate-catalog` (Ausgabezeile „Fehlende Jahre (1950-2026): 0").

### CAT-008 — Das Jahr eines Songs liegt zwischen 1500 und laufendem Jahr + 1

**Preset:** Preset
**Anforderung:** Das Jahr eines Katalogeintrags muss eine ganze Zahl zwischen 1500 und dem laufenden Jahr plus 1 sein. Die Untergrenze 1500 deckt klassische Werke ab; die Obergrenze + 1 erlaubt angekündigte Veröffentlichungen.
**Begründung:** Eine Untergrenze von 1900 würde korrekte Kompositionsjahre als Fehler markieren; ohne Obergrenze könnten unrealistische Veröffentlichungen einsickern.
**Akzeptanz:** `MIN_SONG_YEAR = 1500`, `MAX_SONG_YEAR_OFFSET = 1` (`src/config/song-year-range.ts:21-24`), Prüfung in `validateSong` (`src/utils/validate-song-data.ts:122-137`), gebundene Obergrenze `getMaxSongYear` (`:27-29`).
**Verifikation:** `npm run test -- validate-song-data` (8 Tests, u. a. „akzeptiert klassische Kompositionsjahre vor 1900" und „lehnt Zukunftsjahre jenseits +1 ab").

### CAT-009 — Pflichtfelder eines Songs sind vollständig und typisiert

**Preset:** Preset
**Anforderung:** Ein Song muss enthalten: `id` (nicht leerer String), `title`, `artist`, `year` (Zahl), `country` (ISO-3166-1 alpha-2, zwei Großbuchstaben), `genre`, `difficulty` (`easy`|`medium`|`hard`), `mood` (mindestens ein Eintrag), `packs` (mindestens ein Eintrag), `hints` (4 oder 5 Strings; 5 außerhalb der Pack-Gruppe „YouTube Collection"), `isOneHitWonder` (Boolean), `links.youtube` sowie `supportedModes` und `isQRCompatible`.
**Begründung:** Fehlende Pflichtfelder erzeugen zur Laufzeit kaputte Spielstände.
**Akzeptanz:** `src/utils/validate-song-data.ts:107-168` und `:171-228`; Hinweisanzahl-Regel `:175-180`.
**Verifikation:** `npm run validate-songs`; `npm run validate-catalog` (gemessen: 0 Schema-Fehler).

### CAT-010 — Lyrics müssen genau drei echte und eine erfundene Zeile haben

**Preset:** Preset
**Anforderung:** Ist `lyrics` gesetzt, enthält `lyrics.real` genau drei Strings und `lyrics.fake` genau einen String. `lyrics === null` ist erlaubt und erzeugt eine Warnung, keinen Fehler.
**Begründung:** Der Modus mischt genau diese vier Zeilen; eine andere Struktur macht die Frage unspielbar.
**Akzeptanz:** `src/utils/validate-song-data.ts:313-324`; Typ `src/types/song.ts:96-102`. Gemessener Stand: 1.553 von 1.615 Songs haben Lyrics, 62 nicht.
**Verifikation:** `npm run validate-catalog`; `npm run test -- validate-song-data`.

### CAT-011 — Hinweise dürfen den Song nicht verraten

**Preset:** Preset
**Anforderung:** Ein Hinweis, der ein Token aus Titel oder Künstler (ab 4 Zeichen, normalisiert) enthält, erzeugt eine Warnung. Zusätzlich gilt: Liegt `hintEvidence` vor, muss es fünf gültige URLs enthalten; fehlt es, erzeugt das eine Warnung.
**Begründung:** Ein Hinweis, der den Namen nennt, zerstört das Spiel. Die Nachweisbarkeit der Hinweise schützt zusätzlich vor falschen Angaben.
**Akzeptanz:** `src/utils/validate-song-data.ts:191-222` — Spoiler-Token-Warnung und `hintEvidence`-Prüfung; der Hinweistext wird zur Laufzeit zusätzlich zensiert (`src/utils/censor-utils.ts:11-59`).
**Verifikation:** `npm run validate-catalog` (gemessen: 126 Warnungen); Test existiert nicht — siehe [GAP-004](#offene-lücken).

### CAT-012 — Hinweise werden zur Laufzeit zensiert

**Preset:** Preset
**Anforderung:** Vor der Anzeige wird ein Hinweis gegen Titel und Künstler geprüft. Tokens ab vier Zeichen sowie alle in der Ausnahmeliste geführten Künstlernamen (z. B. `BTS`, `U2`, `2Pac`) werden durch `[XXX]` ersetzt. Kurze Tokens (< 4 Zeichen) nur mit Wortgrenzen; Wörter aus der Ignorierliste (`THE`, `AND`, `DER`, `UND` …) werden nie zensiert.
**Begründung:** Eine nachträglich ergänzte Cover-Version kann einen Hinweis nachträglich spoilerfrei machen — die Zensur muss zur Laufzeit erfolgen, nicht nur beim Import.
**Akzeptanz:** `censorHint` (`src/utils/censor-utils.ts:11-59`), Konfiguration `src/config/spoiler-config.ts:13` (`MIN_LENGTH: 4`), `:19-22` (Ausnahmen), `:25-28` (Ignorierliste); Anwendung in `src/components/game/modes/HintMasterMode.tsx:156`.
**Verifikation:** `grep -n "censorHint" src/components/game/modes/HintMasterMode.tsx src/utils/censor-utils.ts`; Test existiert nicht — siehe [GAP-004](#offene-lücken).

### CAT-013 — Streaming-Links werden formal geprüft

**Preset:** Preset
**Anforderung:** `links.youtube` muss vorhanden sein; ein Platzhalter (`TODO:`, leer, `PLACEHOLDER`) erzeugt eine Warnung. `spotify` muss ein `spotify:track:`-URI oder eine `open.spotify.com/track/`-URL sein, `spotifyFreePreview`, `amazonMusic` und `amazonPrimePreview` müssen http(s)-URLs sein. `previewTimestamp.start` muss kleiner als `.end` sein.
**Begründung:** Formfehler in Links sind die häufigste Ursache für nicht abspielbare Songs.
**Akzeptanz:** `src/utils/validate-song-data.ts:231-308` und `:348-355`.
**Verifikation:** `npm run validate-catalog`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### CAT-014 — Cover-Metadaten sind typisiert und geprüft

**Preset:** Preset
**Anforderung:** Ist `coverMode` gesetzt, muss `relationType` einer von `original`, `cover`, `sample`, `remix` und `confidence` einer von `low`, `medium`, `high` sein; `coverYear` muss eine Zahl sein.
**Begründung:** Der Cover-Confusion-Modus braucht belastbare Beziehungsangaben.
**Akzeptanz:** `src/utils/validate-song-data.ts:327-345`; Typ `src/types/song.ts:29-41`.
**Verifikation:** `npm run validate-catalog`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### CAT-015 — Die Admin-Oberfläche bearbeitet Songs lokal und exportierbar

**Preset:** Preset
**Anforderung:** `/admin/songs` und `/admin/review` erlauben das Ansehen, Filtern, Bearbeiten und Exportieren von Songs. Änderungen werden im `localStorage` unter `phomu-admin-songs` bzw. `phomu-review-edits` gehalten und als JSON-Delta exportiert. Es werden keine Server-Daten verändert.
**Begründung:** Der Katalog wird ohne Datenbank gepflegt; die Oberfläche ist die einzige Arbeitsfläche dafür.
**Akzeptanz:** `src/app/admin/songs/page.tsx:30` (`STORAGE_KEY`), `src/app/admin/review/page.tsx:33` (`STORAGE_KEY = 'phomu-review-edits'`), Delta-/Vollexport in `src/app/admin/review/page.tsx`.
**Verifikation:** `grep -n "phomu-admin-songs\|phomu-review-edits" src/app/admin/*/page.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### CAT-016 — Der Browse-Bereich kann einen Song direkt starten

**Preset:** Preset
**Anforderung:** Im Browse-Bereich kann ein Song per Klick sofort gespielt werden (Quick Play). Der Browse-Bereich dedupliziert nach Titel und Künstler, filtert nach Suche, Genre, Dekade, Schwierigkeit, Stimmung, One-Hit-Wonder, Lyrics und QR-Kompatibilität und paginiert (8/24/48/96/alle).
**Begründung:** „Welcher Song war das nochmal?" ist eine der häufigsten Fragen in der eigenen Partyrunde.
**Akzeptanz:** `handlePlaySong` (`src/app/browse/page.tsx`), Filterlogik in `filteredSongs`, Pagination `PAGE_SIZE_OPTIONS` (`src/app/browse/page.tsx:15`).
**Verifikation:** `grep -n "startQuickGame\|onlyWithLyrics\|onlyQR" src/app/browse/page.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

---

# 8. Sicherheit, Datenschutz und Admin-API (SEC)

> **Stand 25.10.2026:** Der Admin-API-Bereich wird parallel durch die Security-Rolle gehärtet (`src/admin-api/_lib/security.ts` und `src/admin-api/_lib/rate-limit.ts` wurden am selben Tag um Rate-Limiting, Redirect-Guard, Größenkappen und Fehlerstatus erweitert). Die Zeilenverweise in diesem Abschnitt beziehen sich auf diesen Stand. Offen bleibt die Verdrahtung der neuen Hilfen in den Routen — siehe [GAP-029](#offene-lücken).

### SEC-001 — Die Admin-API ist token-geschützt

**Preset:** Preset
**Anforderung:** Jede Admin-API-Route verlangt den Header `x-admin-token`. Ohne gültiges Token wird `401 Unauthorized` geantwortet.
**Begründung:** Die Cover-API schreibt Dateien in das Repository; sie darf nicht offen im Internet stehen.
**Akzeptanz:** `assertAdminAccess` (`src/admin-api/_lib/security.ts:61-78`); Aufruf in `src/admin-api/admin/covers/search/route.ts:46-47` und `src/admin-api/admin/covers/save/route.ts:119-120`.
**Verifikation:** `grep -rn "assertAdminAccess" src/admin-api/`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-002 — Der Token-Vergleich ist zeitkonstant

**Preset:** Preset
**Anforderung:** Der Token-Vergleich erfolgt über `crypto.timingSafeEqual` auf SHA-256-Hashes und damit ohne zeitbares Seitenkanalleck. Beide Hashes sind gleich lang, damit der Vergleich nicht werfen kann.
**Begründung:** Ein einfacher String-Vergleich verrät die Länge und Position des Tokens über die Antwortzeit.
**Akzeptanz:** `timingSafeEqual` (`src/admin-api/_lib/security.ts:47-51`), Einsatz in `assertAdminAccess` (`:71`).
**Verifikation:** `grep -n "timingSafeEqual" src/admin-api/_lib/security.ts`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-003 — Fehlende oder zu kurze Konfiguration führt zu 503, nicht zu offenem Zugriff

**Preset:** Preset
**Anforderung:** Ist `ADMIN_API_TOKEN` nicht gesetzt oder kürzer als 32 Zeichen, antwortet die API mit `503` — in keinem Fall mit Zugriff.
**Begründung:** Ein fehlgeschlagenes Deployment darf nicht zu einer unbegrenzten Schreib-API führen.
**Akzeptanz:** `src/admin-api/_lib/security.ts:62-68` — `MIN_ADMIN_TOKEN_LENGTH = 32` (`:7`), Fehlertexte „Admin API not configured" und „Admin API token too short" mit Status 503.
**Verifikation:** `grep -n "MIN_ADMIN_TOKEN_LENGTH\|503" src/admin-api/_lib/security.ts`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-004 — Das Token wird lokal erzeugt und nicht eingecheckt

**Preset:** Preset
**Anforderung:** Das Token wird mit `node scripts/generate-admin-token.js` erzeugt (Standard: 32 zufällige Bytes, hex-kodiert; mindestens 16 Bytes zulässig) und über die Umgebungsvariable `ADMIN_API_TOKEN` gesetzt. Die `.env.example` enthält nur einen Platzhalter.
**Begründung:** Ein eingechecktes Token ist kein Token.
**Akzeptanz:** `scripts/generate-admin-token.js:4-12`; `.env.example` („ADMIN_API_TOKEN=replace-with-long-random-token"); `scripts/generate-admin-token.js` verweigert Werte unter 16 Bytes.
**Verifikation:** `node scripts/generate-admin-token.js`; `grep -n "ADMIN_API_TOKEN" .env.example`; das Token darf nicht in `git ls-files` stehen (`git ls-files | xargs grep -l "ADMIN_API_TOKEN=" 2>/dev/null` — muss nur `.env.example` treffen).

### SEC-005 — Externe Cover-Downloads sind auf HTTPS und eine Host-Allowlist beschränkt

**Preset:** Preset
**Anforderung:** Eine Cover-URL muss `https:` verwenden und auf einem von vier erlaubten Hosts liegen (`mzstatic.com`, `is1-ssl.mzstatic.com`, `cdn-images.dzcdn.net`, `dzcdn.net`); Subdomains der erlaubten Hosts sind zugelassen. Alle anderen URLs werden mit `400` abgelehnt.
**Begründung:** Eine vom Client frei wählbare URL ist ein SSRF-Vektor (Zugriff auf interne Netze) und ein Dateityp-Vektor.
**Akzeptanz:** `assertAllowedHost` (`src/admin-api/_lib/security.ts:136-143`), `parseHttpUrl` (`:145-162`), Allowlist `src/admin-api/admin/covers/save/route.ts:11`, Aufruf `:128`, Fehlerbehandlung `:126-132` → HTTP 400.
**Verifikation:** `grep -n "ALLOWED_IMAGE_HOSTS\|Only HTTPS" src/admin-api/`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-006 — Der Download ist in Zeit, Typ und Größe begrenzt

**Preset:** Preset
**Anforderung:** Der Cover-Download bricht nach 10 Sekunden ab, akzeptiert nur Responses mit `content-type` beginnend mit `image/`, und lehnt Dateien über 5 MiB ab (sowohl über `content-length` als auch über die tatsächliche Bytezahl). Fehlgeschlagene Downloads liefern `502`, zu große Dateien `413`.
**Begründung:** Ein unbegrenzter Download ist eine Denial-of-Service-Fläche.
**Akzeptanz:** `downloadCover` (`src/admin-api/admin/covers/save/route.ts:32-69`), `MAX_IMAGE_BYTES = 5 * 1024 * 1024` (`:10`; zentral auch in `src/admin-api/_lib/security.ts:13`), Statuszuordnung `:46-63` und `:149-156`.
**Verifikation:** `grep -n "MAX_IMAGE_BYTES\|content-type\|10_000" src/admin-api/`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-007 — Suchanfragen der Cover-API sind längenbegrenzt und zeitbegrenzt

**Preset:** Preset
**Anforderung:** `artist` und `title` der Cover-Suche sind auf 120 Zeichen begrenzt und dürfen nicht leer sein. Externe Abrufe brechen nach 7.000 ms ab und laufen ohne Cache (`cache: 'no-store'`).
**Begründung:** Unbegrenzte Eingaben und hängende Upstreams blockieren den Server.
**Akzeptanz:** `boundedText` (`src/admin-api/_lib/security.ts:118-123`), Aufruf `src/admin-api/admin/covers/search/route.ts:51-52`; `fetchWithTimeout` mit `DEFAULT_TIMEOUT_MS = 7000` (`src/admin-api/_lib/security.ts:6`, `:173-204`).
**Verifikation:** `grep -n "boundedText\|DEFAULT_TIMEOUT_MS" src/admin-api/`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-008 — Die Cover-Suche nutzt zwei feste, externe Quellen

**Preset:** Preset
**Anforderung:** Die Cover-Suche fragt ausschließlich die Suchschnittstellen von iTunes Search API und Deezer ab, jeweils mit `limit=5`. Die Ergebnisse werden entdoppelt und auf 10 begrenzt.
**Begründung:** Ein fester, dokumentierter Katalog schützt vor unerwarteten Datenquellen und hält das Verhalten nachvollziehbar.
**Akzeptanz:** `src/admin-api/admin/covers/search/route.ts:56-93` — beide Abrufe, `uniqueResults` (`:35-43`), `slice(0, 10)` (`:93`).
**Verifikation:** `grep -n "itunes.apple.com\|api.deezer.com" src/admin-api/admin/covers/search/route.ts`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-009 — Schreibzugriffe auf den Katalog sind serialisiert

**Preset:** Preset
**Anforderung:** Das Aktualisieren der Pack-Dateien erfolgt unter einer exklusiven Sperrdatei `.covers-save.lock` (Flag `wx`). Es wird höchstens 30-mal im Abstand von 60 ms versucht; schlägt das fehl, antwortet die API mit `503`.
**Begründung:** Zwei parallele Cover-Speicherungen dürfen sich nicht gegenseitig die JSON-Datei überschreiben.
**Akzeptanz:** `withPacksLock` (`src/admin-api/admin/covers/save/route.ts:71-94`), Konstanten `:9`, `:12-13`, Fehler „Cover save is temporarily busy" (`:85`).
**Verifikation:** `grep -n "withPacksLock\|LOCK_RETRIES" src/admin-api/admin/covers/save/route.ts`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-010 — Unbekannte Song-IDs werden nicht angelegt

**Preset:** Preset
**Anforderung:** Wird eine `songId` übergeben, die in keiner Pack-Datei vorkommt, antwortet die API mit `404` und ändert keine Pack-Datei. Das Format der ID ist auf `[a-z0-9][a-z0-9-_]{2,120}` beschränkt.
**Begründung:** Eine ungeprüfte ID ist ein Weg, beliebige Dateinamen zu erzeugen.
**Akzeptanz:** `parseSongId` (`src/admin-api/_lib/security.ts:125-130`), Suche über alle Pack-Dateien und 404-Antwort (`src/admin-api/admin/covers/save/route.ts:106-146`).
**Verifikation:** `grep -n "not found in any pack" src/admin-api/admin/covers/save/route.ts`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-011 — Fehler der Admin-API geben keine internen Details preis

**Preset:** Preset
**Anforderung:** Fehlerantworten enthalten eine Meldung und einen Statuscode; unerwartete Fehler liefern `500` mit generischem Text. Interne Stacktraces, Pfade oder Tokenwerte werden nicht ausgegeben.
**Begründung:** Fehlermeldungen der Admin-API sind ein Informationsleck.
**Akzeptanz:** `src/admin-api/admin/covers/save/route.ts:149-156`, `src/admin-api/admin/covers/search/route.ts:94-97`; die Fehlerklasse dokumentiert die Zusage ausdrücklich (`src/admin-api/_lib/security.ts:27-40`).
**Verifikation:** `grep -n "status: 500" src/admin-api/`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-012 — Keine personenbezogenen Daten im Meldeweg

**Preset:** Preset
**Anforderung:** Der Missing-Link-Report enthält ausschließlich technische Metadaten (Song-Kennung, technische Bezeichnungen, vorhandene Provider, Zeitzone, Locale, Region, zufällige Geräte-ID) — keine Freitextfelder, keine Namen, keine Kontaktdaten.
**Begründung:** Die Geräte-ID ist eine zufällige UUID, kein Nutzerkonto; freie Textfelder wären ein PII-Risiko.
**Akzeptanz:** `src/components/game/MusicPlayer.tsx:198-214` (Payload), `deviceId = localStorage.getItem(DEVICE_KEY) ?? crypto.randomUUID()` (`:179`); zugesagte Eigenschaft in `src/app/privacy/page.tsx` („We explicitly avoid free-text fields in these flows").
**Verifikation:** `grep -n "issuePayload" -A 18 src/components/game/MusicPlayer.tsx`; Test existiert nicht — siehe [GAP-001](#offene-lücken).

### SEC-013 — Die lokalen Daten lassen sich vollständig löschen

**Preset:** Preset
**Anforderung:** Über `/settings/account` kann der gesamte lokale Fortschritt (XP) nach Bestätigung zurückgesetzt werden. Die Aktion ist als „Gefahrzone" gekennzeichnet.
**Begründung:** Datenschutzrechte müssen ohne technisches Wissen ausübbar sein.
**Akzeptanz:** `resetProgress` (`src/stores/game-store.ts:525-527`), `src/app/settings/account/page.tsx` (Gefahrenzone mit `confirm(...)`).
**Verifikation:** `grep -n "resetProgress" src/app/settings/account/page.tsx src/stores/game-store.ts`.

### SEC-014 — Fehlgeschlagene Anmeldeversuche werden begrenzt

**Preset:** Preset
**Anforderung:** Fehlgeschlagene Token-Prüfungen werden gezählt: 10 Versuche je Client und 100 Versuche global je 5-Minuten-Fenster. Wird ein Limit überschritten, antwortet die API mit `429` und einem `Retry-After`-Header. Der Bucket je Client ist hart begrenzt (höchstens 10.000 Schlüssel), damit gespoofte Schlüssel den Speicher nicht auffüllen können.
**Begründung:** Ohne Begrenzung ist der Token eine Brute-Force-Fläche.
**Akzeptanz:** `enforceAuthFailureLimit` (`src/admin-api/_lib/security.ts:84-98`), Grenzwerte `:19` und `:25`, `checkRateLimit`/`getClientKey` (`src/admin-api/_lib/rate-limit.ts:13-48`, `MAX_TRACKED_KEYS = 10.000` in `:43`). Die Limitierung wirkt **pro Instanz** und ist keine verteilte DoS-Sicherung — das ist in `src/admin-api/_lib/rate-limit.ts:4-11` ausdrücklich dokumentiert.
**Verifikation:** `grep -n "AUTH_FAILURE_LIMIT\|AUTH_FAILURE_GLOBAL_LIMIT\|429" src/admin-api/_lib/security.ts`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-015 — Weiterleitungen werden manuell verfolgt und je Hop geprüft

**Preset:** Preset
**Anforderung:** Binärdownloads folgen Weiterleitungen manuell, höchstens drei Hops. Jeder Hop wird erneut gegen Protokoll (`https:`) und Host-Allowlist geprüft; ein Redirect ohne Ziel, in ein internes Netz oder auf einen nicht erlaubten Host wird mit `400` abgelehnt.
**Begründung:** Ein automatisch verfolgter Redirect ist der übliche Weg, die Allowlist zu umgehen (`http://169.254.169.254/`).
**Akzeptanz:** `fetchGuardedBinary` (`src/admin-api/_lib/security.ts:268-322`), `MAX_REDIRECTS = 3` (`:10`), Hop-Prüfung `:285-307`.
**Verifikation:** `grep -n "fetchGuardedBinary\|MAX_REDIRECTS" src/admin-api/_lib/security.ts`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-016 — Antwortkörper externer Dienste sind größenbegrenzt

**Preset:** Preset
**Anforderung:** Der Body externer Antworten wird gestreamt und abgebrochen, sobald er die konfigurierte Grenze überschreitet (5 MiB für Bilder, 512 KiB für JSON-Antworten). Ein Server ohne `content-length` kann dadurch nicht den Speicher des Prozesses erschöpfen.
**Begründung:** `arrayBuffer()` ohne Limit ist ein Speicher-Desaster bei bösartigen oder defekten Upstreams.
**Akzeptanz:** `readCappedBody` (`src/admin-api/_lib/security.ts:211-250`), `MAX_IMAGE_BYTES` (`:13`), `MAX_JSON_BYTES = 512 * 1024` (`:16`), Integration in `fetchWithTimeout` (`:191-200`).
**Verifikation:** `grep -n "readCappedBody\|MAX_JSON_BYTES" src/admin-api/_lib/security.ts`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-017 — Zugangsdaten in URLs sind verboten

**Preset:** Preset
**Anforderung:** Eine Cover-URL mit `username` oder `password` wird abgelehnt.
**Begründung:** Eingebettete Zugangsdaten landen in Logs, in Fehlermeldungen und in Upstream-Anfragen.
**Akzeptanz:** `src/admin-api/_lib/security.ts:156-157`.
**Verifikation:** `grep -n "Credentials in URL" src/admin-api/_lib/security.ts`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

### SEC-018 — Fehler der Admin-API tragen einen expliziten HTTP-Status

**Preset:** Preset
**Anforderung:** Fehler der Admin-API werden über eine eigene Fehlerklasse mit Statuscode geführt (`AdminRequestError`), damit Status und Meldung nicht über Fehlertexte auseinanderlaufen.
**Begründung:** String-Matching auf Fehlertexte ist fehleranfällig und unprüfbar.
**Akzeptanz:** `src/admin-api/_lib/security.ts:32-40` (Klasse), `:216`, `:235`, `:287`, `:293`, `:297`, `:302`, `:310`, `:315`, `:321` (Statuszuordnung).
**Verifikation:** `grep -n "AdminRequestError" src/admin-api/_lib/security.ts`; Test existiert nicht — siehe [GAP-005](#offene-lücken).

---

# 9. Nicht-funktionale Anforderungen (NFR)

### NFR-001 — TypeScript läuft im Strict-Modus ohne Fehler

**Preset:** Preset
**Anforderung:** `npm run typecheck` (`tsc --noEmit`) ist fehlerfrei. `any` ist nicht erlaubt; Typen sind über `src/types/` und `src/config/` zentral definiert.
**Begründung:** Ein striktes Typsystem ist die billigste Form von Qualitätssicherung.
**Akzeptanz:** `tsconfig.json` mit `strict: true`; gemessener Stand: `npm run typecheck` endet mit Exit 0.
**Verifikation:** `npm run typecheck`; `grep -rn ": any\|<any>\|as any" src/ | grep -v "\.test\."` (muss leer sein).

### NFR-002 — ESLint ist fehlerfrei

**Preset:** Preset
**Anforderung:** `npm run lint` meldet keine Errors. Verbleibende Warnungen sind dokumentiert und begründet.
**Begründung:** Lint ist der billigste kontinuierlich laufende Qualitätscheck.
**Akzeptanz:** Gemessener Stand: 0 Errors, 1 Warning (`playwright.config.ts:1` — `import/no-anonymous-default-export`).
**Verifikation:** `npm run lint` — Ausgabe muss „0 errors" enthalten.

### NFR-003 — Unit-Tests decken die reine Logik ab

**Preset:** Preset
**Anforderung:** Vitest testet die regeltragenden Utilities. Der Test-Umfang umfasst mindestens: QR-Intent-Parsing, KI-Task-Queue, Katalog-Jahresvalidierung und die Amazon-Link-Auflösung.
**Begründung:** Die teuersten Regeln des Produkts (Scoring, Slot-Logik, Auswahl-Kette) sind noch ungetestet — das ist die größte Abdeckungslücke (siehe [GAP-001](#offene-lücken) bis [GAP-003](#offene-lücken)).
**Akzeptanz:** Gemessener Stand: 4 Testdateien, 21 Tests, alle bestanden (`src/utils/qr-intent.test.ts`, `src/utils/ai-task-queue.test.ts`, `src/utils/validate-song-data.test.ts`, `src/components/game/MusicPlayer.test.ts`). `vitest.config.ts` schließt `src/**/*.test.ts` ein.
**Verifikation:** `npx vitest run` — 4 Dateien / 21 Tests müssen grün sein.

### NFR-004 — Die Testkonfiguration ist über den Quellbereich hinaus ausgedehnt

**Preset:** Preset
**Anforderung:** Vitest erfasst alle Testdateien unter `src/` und misst die Coverage über den gesamten Produktcode, nicht nur über `src/utils/`.
**Begründung:** Die aktuelle Coverage-Messung blendet Store, Komponenten und Moduslogik vollständig aus — genau die Bereiche mit den teuersten Regeln.
**Akzeptanz:** **Stand: nicht erfüllt.** `vitest.config.ts` begrenzt `coverage.include` auf `src/utils/**/*.ts`. Siehe [GAP-001](#offene-lücken).
**Verifikation:** `grep -n "include" vitest.config.ts`; Zielzustand: `coverage.include: ['src/**/*.{ts,tsx}']`.

### NFR-005 — Ein Gate über die gesamte Pipeline

**Preset:** Preset
**Anforderung:** `npm run local-ci` führt in fester Reihenfolge aus: Typecheck, Lint, Unit-Tests, Format-Check (nicht blockierend), Song-Validierung, Katalog-Validierung, Build, Dependency-Audit (ab `moderate`) sowie — nur bei gesetztem `YOUTUBE_API_KEY` — den YouTube-Link-Audit.
**Begründung:** Ein Gate, das nur einen Teil prüft, erzeugt ein falsches Gefühl von Sicherheit.
**Akzeptanz:** `scripts/local-ci.sh:47-72` (Checkliste);
**Verifikation:** `bash scripts/local-ci.sh` — jeder als blockierend markierte Check muss „[SUCCESS]" melden.

### NFR-006 — Der Format-Check ist nicht blockierend, aber vorhanden

**Preset:** Optional
**Anforderung:** Die Formatierung wird mit Prettier geprüft (`npm run format:check`), der Check blockiert die Pipeline derzeit nicht.
**Begründung:** Ein blockierender Format-Check in einem aktiven Content-Repository erzeugt Rauschen; die Existenz des Checks reicht vorerst.
**Akzeptanz:** `scripts/local-ci.sh:56` —
**Verifikation:** `npm run format:check`.

### NFR-007 — Der Katalog-Report ist Teil des Gates

**Preset:** Preset
**Anforderung:** Der Katalog-Gate schreibt seinen Report nach `specifications/catalog_issues_report.json` und wird im Release-Prozess als Nachweis geführt.
**Begründung:** Ohne mitgeschriebenen Report ist der Gate-Zustand nicht belegbar.
**Akzeptanz:** `src/utils/validate-song-catalog.ts:230-244` (Report-Schreiben), `npm run validate-catalog:report`.
**Verifikation:** `npm run validate-catalog:report`; `cat specifications/catalog_issues_report.json`.

### NFR-008 — Keine Abnahme auf Basis von Stubs

**Preset:** Preset
**Anforderung:** Ein Feature gilt erst als umgesetzt, wenn eine echte, ausführbare Implementierung vorliegt. Platzhalter-Assets, Mock-Brücken und nur als konfiguriert geführte Provider zählen nicht als Umsetzung. Bekannte Verstöße werden in den [Offenen Lücken](#offene-lücken) geführt und blockieren die Abnahme des betroffenen Features.
**Begründung:** Der Bestand enthält Audio-Prompts statt Audio, eine Cover-Variante ohne Cover-Daten und einen Amazon-Pfad ohne Preview-Daten. Ohne diese Regel wird jede Abnahme eine Behauptung.
**Akzeptanz:** Bekannte Verstöße: [GAP-009](#offene-lücken) (Audio-Assets), [GAP-011](#offene-lücken) (Cover-Versionen), [GAP-012](#offene-lücken) (Amazon-Preview). Gegenprüfung: `ls public/audio/sfx/` enthält nur `.prompt.md`-Dateien, keine `.mp3`.
**Verifikation:** `ls public/audio/sfx/ public/audio/mode-cues/` — der Nachweis der Lücke ist Teil der Abnahme, nicht ihr Ersatz.

### NFR-009 — Quellcode-Dateien bleiben unterhalb der Größengrenze

**Preset:** Preset
**Anforderung:** Keine Quelldatei überschreitet 550 Zeilen (weiches Ziel 400 Zeilen). Das Gate `scripts/check-file-size.mjs` prüft das automatisch.
**Begründung:** Sehr große Dateien sind der Hauptgrund für schwer wartbaren Code.
**Akzeptanz:** **Stand: nicht erfüllt.** Gemessen: 5 Dateien über 550 Zeilen (`src/app/admin/review/page.tsx` 755, `src/app/lobby/page.tsx` 744, `src/components/game/RevealPhase.tsx` 671, `src/stores/game-store.ts` 640, `src/components/game/MusicPlayer.tsx` 630) und 5 weitere über 400 Zeilen. Das Gate-Skript existiert nicht. Siehe [GAP-007](#offene-lücken).
**Verifikation:** `find src -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -rn | head -15` — nach Fertigstellung muss `scripts/check-file-size.mjs` existieren, grün laufen und in `scripts/local-ci.sh` eingebunden sein.

### NFR-010 — Ein i18n-Gate verhindert unübersetzte Texte

**Preset:** Preset
**Anforderung:** `scripts/check-i18n-completeness.mjs` prüft, dass `de.json` und `en.json` parallel sind, keine leeren Werte enthalten und kein sichtbarer Literaltext mehr im JSX steht. Das Gate läuft lokal und in der CI.
**Begründung:** Ohne automatisches Gate driftet die Übersetzung bei jeder Änderung auseinander.
**Akzeptanz:** **Stand: teilweise erfüllt.** Das Skript `scripts/check-i18n-completeness.mjs` existiert seit dem 25.10.2026 und prüft Parität, leere Werte, Pluralformen und Literaltexte (`--count`, `--json`, `--files=`). Nicht erfüllt: die Verdrahtung als `npm run check:i18n` in `package.json` und der Lauf in `scripts/local-ci.sh`. Siehe [GAP-006](#offene-lücken).
**Verifikation:** `node scripts/check-i18n-completeness.mjs` — muss ohne Treffer (Exit 0) enden. Verdrahtung: `grep -n "check:i18n" package.json scripts/local-ci.sh`.

### NFR-011 — Ein Doku-Linkcheck verhindert tote Verweise

**Preset:** Preset
**Anforderung:** `scripts/check-doc-links.mjs` prüft, dass jeder relative Markdown-Link in der Projektdokumentation auflösbar ist. Das Gate läuft lokal und in der CI.
**Begründung:** Tote Links in einer Spezifikation sind teurer als fehlende Links, weil sie Vertrauen zerstören.
**Akzeptanz:** **Stand: nicht erfüllt.** Das Skript existiert nicht. Im Repo liegt allerdings ein `broken-links-report.json` (72.904 Byte) als Alt-Artefakt. Siehe [GAP-008](#offene-lücken).
**Verifikation:** `ls scripts/check-doc-links.mjs` — nach Fertigstellung muss das Skript existieren, grün laufen und in `scripts/local-ci.sh` eingebunden sein.

### NFR-012 — Der E2E-Smoke-Test prüft die Erreichbarkeit der Kernrouten

**Preset:** Preset
**Anforderung:** Der Playwright-Smoke-Test öffnet die Kernrouten `/`, `/lobby`, `/game`, `/game-over`, `/browse` und `/settings` und prüft, dass jede Route geladen wird. Ein Live-Server wird über die Playwright-Konfiguration gestartet.
**Begründung:** Der Smoke-Test fängt den häufigsten Produktionsfehler: eine Route, die nicht mehr baut.
**Akzeptanz:** `e2e/smoke.spec.ts` (ein Testfall mit sechs Route-Prüfungen), `playwright.config.ts`.
**Verifikation:** `npm run test:e2e:smoke` (setzt einen installierten Chromium-Browser voraus: `npm run test:e2e:install`).

### NFR-013 — Der E2E-Test deckt die Kernjourney ab

**Preset:** Preset
**Anforderung:** Der End-to-End-Test muss den vollständigen Spielablauf abdecken: Spieler anlegen, Modus wählen, Spiel starten, eine Runde beantworten, Reveal auslösen, Spiel beenden.
**Begründung:** Der aktuelle Smoke-Test prüft nur URLs; ein Fehler im Zustandsautomaten bliebe unentdeckt.
**Akzeptanz:** **Stand: nicht erfüllt.** `e2e/smoke.spec.ts` besteht ausschließlich aus URL-Assertions. Siehe [GAP-021](#offene-lücken).
**Verifikation:** `npm run test:e2e:smoke` — nach Erweiterung muss der Test mindestens eine vollständige Runde durchlaufen.

### NFR-014 — Die KI-Task-Queue arbeitet mit Retry und Statusmodell

**Preset:** Optional
**Anforderung:** Die Queue verarbeitet Aufgaben mit einer Standard-Parallelität von 1 und einem Retry-Abstand von 1.000 ms. Bei Fehlern wird mit linearer Verzögerung (`retryDelayMs × attempts`) erneut versucht, bis `maxAttempts` erreicht ist; danach lautet der Status `failed` mit der Fehlermeldung. Erfolgreiche Aufgaben erhalten den Status `done`.
**Begründung:** Das Modell ist die Grundlage für den geplanten KI-Hinweis-Pipeline; die Wiederholungssemantik muss vor dem Einsatz feststehen.
**Akzeptanz:** `src/utils/ai-task-queue.ts:20-64`; Test `src/utils/ai-task-queue.test.ts` (2 Tests: Erfolg, Retry bis `failed`).
**Verifikation:** `npm run test -- ai-task-queue`.

### NFR-015 — Die KI-Hinweis-Pipeline ist noch nicht angebunden

**Preset:** Later
**Anforderung:** Die Einstellungen `hintReleasePolicy` (`auto-publish` | `manual-review`) und `aiQueueStrategy` (`queue-retry-pending` | `fail-fast`) werden gespeichert und in der Oberfläche angezeigt, steuern aber noch keinen Prozess. Es existiert keine KI-Hint-Erzeugung im Produktcode.
**Begründung:** Eine sichtbare Einstellung ohne Wirkung ist eine Zusage, die nicht eingelöst wird; sie wird deshalb hier als „Later" geführt und nicht als Funktion behauptet.
**Akzeptanz:** Typen `src/types/game-state.ts:17-20`, Vorgaben `src/config/game-config.ts:70-71`, Oberfläche `src/app/settings/governance/page.tsx`; kein Aufrufer der Queue im Produktcode (`grep -rn "processAITaskQueue" src/` findet nur die Testdatei).
**Verifikation:** `grep -rn "processAITaskQueue" src/`; Lücke geführt als [GAP-020](#offene-lücken).

### NFR-016 — Die Entwicklungswerkzeuge bleiben reproduzierbar

**Preset:** Preset
**Anforderung:** Die Generator- und Reparaturskripte (`scripts/*.js`, `scripts/*.py`) verändern den Katalog deterministisch und sind versioniert. Der Loader `src/data/songs/index.ts` wird von `scripts/migrate_and_deduplicate.py` erzeugt und nicht manuell gepflegt.
**Begründung:** Ein Katalog, der nur per Hand gepflegt wird, ist nicht reproduzierbar prüfbar.
**Akzeptanz:** Kopfkommentar in `src/data/songs/index.ts`; `scripts/migrate_and_deduplicate.py`, `scripts/fix-duplicates.js`, `scripts/find-duplicates.js`, `scripts/repair-links.js`, `scripts/fix-youtube-links.js` liegen vor.
**Verifikation:** `ls scripts/ | wc -l`; `head -8 src/data/songs/index.ts`.

---

# Widersprüche

Die folgenden Aussagen aus `LLM.md` und den Alt-Spezifikationen unter `specifications/` widersprechen dem Code. Maßgeblich ist der Code; die Alt-Dokumente sind zu korrigieren oder zu archivieren.

| # | Fundstelle | Behauptung | Ist-Stand (Code) | Auflösung |
|---|---|---|---|---|
| W-01 | `specifications/archive/LLM_archivstand_2026-10-25.md:11` (altes `LLM.md`) | „Next.js 15 (App Router)" | `package.json`: `"next": "^16.2.1"`, `eslint-config-next: ^16.2.1`, `react: ^19.2.4` | Durch das Archivieren und die neue Einstiegskarte `LLM.md` („Next.js 16 (App Router) · React 19 …") **erledigt**. Maßgeblich ist `package.json`. |
| W-02 | `specifications/archive/LLM_archivstand_2026-10-25.md:43` | „THE 5 GAME MODES" | Sechs Modi: `src/config/game-config.ts:12-18` und `:300-307` | Erledigt durch das Archiv; die sechs IDs sind in [CORE-006](#core-006--ein-kern-sechs-klar-getrennte-spielmodi) verbindlich. |
| W-03 | `specifications/archive/LLM_archivstand_2026-10-25.md:44` | Timeline = „Drag & drop songs onto a timeline" | Slot-basierte Klick-/Tastaturauswahl, kein Drag & Drop: `src/components/game/modes/TimelineMode.tsx:466-536`, `:242-255` | Erledigt durch das Archiv; als „Ordnen per Slot-Auswahl" geführt. |
| W-04 | `specifications/archive/LLM_archivstand_2026-10-25.md:52` | Lyrics Labyrinth: „Players MUST lock in their choice **before** the music starts. Audio is the reveal." | Die Musik startet sofort beim Aufbau der Frage (blurred): `src/components/game/modes/LyricsMode.tsx:109-122` | Erledigt durch das Archiv. Die Lock-in-Semantik ist weiterhin **nicht** umgesetzt — siehe [GAP-010](#offene-lücken). |
| W-05 | `specifications/archive/LLM_archivstand_2026-10-25.md:55` | Vibe-Check: „Community stats show how many other users chose the same vibe (via Supabase)." | Keine Community-Statistik. Gewertet wird lokal gegen `song.mood`: `src/components/game/modes/VibeCheckMode.tsx:54` | Erledigt durch das Archiv; verbindlich ist [GAME-030](#game-030--vibe-check-sechs-optionen-zwei-punkte). |
| W-06 | `specifications/archive/LLM_archivstand_2026-10-25.md:72` | „Strategy Pattern: A single `MusicPlayer` component delegates to provider-specific adapters." | `src/types/music-provider.ts:34-93` definiert `MusicProviderInterface`, aber **keine** Implementierung existiert. `MusicPlayer` ist ein monolithischer Component mit Inline-Zweigen (`:149-170`, `:559-619`) | Erledigt durch das Archiv. Das Interface bleibt **Later**; die tatsächliche Architektur steht in [MEDIA-001](#media-001--youtube-ist-der-standard-provider) bis [MEDIA-018](#media-018--der-providerstatus-wird-im-player-angezeigt). |
| W-07 | `specifications/archive/LLM_archivstand_2026-10-25.md:79` | „No title, artist, album art, or provider chrome visible — **not even in the DOM**." | Der YouTube-Iframe liegt im DOM, abgedeckt von der Blur-Schicht: `src/components/game/MusicPlayer.tsx:424-430` | Erledigt durch das Archiv. „Nicht sichtbar" ist die belegbare Aussage; `controls: 0` und `modestbranding: 1` (`:296-297`) verhindern sichtbare Chrome. |
| W-08 | `specifications/archive/LLM_archivstand_2026-10-25.md:86` | Autoplay-Workaround: „User must click a 'Play' button, followed by a countdown (3-2-1), then music starts." | Kein Play-Knopf und kein Countdown. `playerVars.autoplay = 1` (`:295`); `PHOMU_CONFIG.COUNTDOWN_SECONDS: 3` wird nirgends verwendet | Erledigt durch das Archiv. `COUNTDOWN_SECONDS` ist toter Konfigurationsbestand — siehe [GAP-022](#offene-lücken). |
| W-09 | `specifications/archive/LLM_archivstand_2026-10-25.md:81-82` | Reveal-Trigger: „Singleplayer: After the player locks in their answer. Multiplayer: After ALL players have locked in." | Es gibt nur Pass-the-Phone mit einem antwortenden Piloten; der Reveal läuft über einen manuellen Button: `src/components/game/QuestionPhase.tsx:86-102`, `src/app/game/page.tsx:164-166` | Erledigt durch das Archiv; die tatsächliche Auslösung ist in [GAME-002](#game-002--der-reveal-gibt-die-lösung-erst-nach-dem-sperren-frei) beschrieben. |
| W-10 | `specifications/archive/LLM_archivstand_2026-10-25.md:20`, `:25-26`, `:29` | Anti-Cheat-UI mit Swipe-to-Unlock, „PASS DEVICE"-Screen, 6-stelliger Session-Code, Supabase-Realtime, Google-Login, Spectator-Modus, Eliminierung | Nicht implementiert. `isEliminated`/`isSpectator` werden nur auf `false` gesetzt (`src/stores/game-store.ts:216-217`) und nie geändert. `deviceMode` steht fest auf `'pass-the-phone'` (`:45`). `MultiDeviceSession` und `SessionPreset` sind reine Typen (`src/types/session.ts:21-49`) | Erledigt durch das Archiv; als **Later** geführt — siehe [GAP-016](#offene-lücken). |
| W-11 | `specifications/archive/LLM_archivstand_2026-10-25.md:109` | „File Size: Target 400 lines; **Absolute Max 600** lines per file." | `CONTRACT.md:307` fordert ein Gate mit max. 550 (weich 400). Real: 5 Dateien über 550 Zeilen, größte 755 Zeilen | Erledigt durch das Archiv. Verbindlich ist die Grenze 550/400 aus [NFR-009](#nfr-009--quellcode-dateien-bleiben-unterhalb-der-größengrenze). |
| W-12 | `specifications/archive/LLM_archivstand_2026-10-25.md:132` | `PhomuSong.pack: string` | `packs: string[]` (`src/types/song.ts:83`) | Erledigt durch das Archiv; verbindlich ist [CAT-004](#cat-004--der-katalog-zugang-filtert-nach-pack-zuordnung). |
| W-13 | `specifications/archive/LLM_archivstand_2026-10-25.md:135` | `lyrics.real: string[]` | Tupel aus genau drei Strings: `[string, string, string]` (`src/types/song.ts:98`) | Erledigt durch das Archiv; verbindlich ist [CAT-010](#cat-010--lyrics-müssen-genau-drei-echte-und-eine-erfundene-zeile-haben). |
| W-14 | `specifications/archive/LLM_archivstand_2026-10-25.md:101` | „Standard Packs: … (20 total)" | 27 konfigurierte Packs (`src/config/game-config.ts:89-279`), 27 verschiedene Pack-Namen in den Daten | Erledigt durch das Archiv; verbindlich ist [CAT-003](#cat-003--es-gibt-genau-27-konfigurierte-packs-und-alle-sind-im-katalog-belegt). |
| W-15 | `specifications/archive/LLM_archivstand_2026-10-25.md:102` | „First Pack: 'Global Hits 1950-2026' (50 songs for development…)" | Der Pack enthält 1.107 Songs (gemessen über `src/data/songs/*.json`). `src/data/songs/packs.json` behauptet `songCount: 59` | Erledigt durch das Archiv; `packs.json` bleibt aber eine veraltete Metadatenquelle (siehe [GAP-028](#offene-lücken)). |
| W-16 | `specifications/archive/LLM_archivstand_2026-10-25.md:116` | „Printing: Card generator exporting high-res PNGs (59x91mm + 3mm bleed) for `meinspiel.de`" | `CARD_WIDTH_MM: 59`, `CARD_HEIGHT_MM: 91`, `CARD_BLEED_MM: 3` existieren (`src/config/game-config.ts:322-324`), werden aber nirgends verwendet; ein Kartengenerator existiert nicht | Erledigt durch das Archiv. Die Maße sind in der neuen `LLM.md` als Produktmerkmal genannt, der Generator fehlt — siehe [GAP-022](#offene-lücken). |
| W-17 | `specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:12` | „Lint: ❌ nicht grün (10 Errors, 2 Warnings)" | Gemessen: 0 Errors, 1 Warning (`playwright.config.ts:1`) | Erledigt durch das Archiv; der Code ist lint-grün. |
| W-18 | `specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:13` | „Unit Tests (Vitest): ✅ 2 Test-Dateien, 6 Tests bestanden" | Gemessen: 4 Testdateien, 21 Tests | Erledigt durch das Archiv. |
| W-19 | `specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:7` | „37 Packs / 1.629 Songs" | Gemessen: 135 Pack-Dateien, 1.615 Songs (`npm run validate-catalog`) | Erledigt durch das Archiv; siehe [CAT-002](#cat-002--der-katalog-umfasst-135-pack-dateien-mit-1615-songs). |
| W-20 | `specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:14` | „Coverage (Vitest): ⚠️ gesamt 7.56% Lines" | Die Coverage misst aktuell nur `src/utils/**/*.ts` (`vitest.config.ts`), also weder Store noch Komponenten. Ein aktueller Wert wurde in dieser Runde nicht neu gemessen | Erledigt durch das Archiv. Keine Zahl ohne frische Messung zitieren; die Einschränkung des Messbereichs ist die belastbare Aussage. |
| W-21 | `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md:24` | „Große Contentbasis (1.915 Songs)" | 1.615 Songs (gemessen) | Erledigt durch das Archiv. |
| W-22 | `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md:114` | „Admin-Cover-Routen ohne AuthN/AuthZ Guardrail sichtbar." | AuthN ist umgesetzt: `assertAdminAccess` mit Token, Längenprüfung und zeitkonstantem Vergleich (`src/admin-api/_lib/security.ts:13-28`). AuthZ (Rollen) fehlt | Erledigt durch das Archiv; der Befund ist auf „AuthN vorhanden, AuthZ offen" zu korrigieren. Siehe [SEC-001](#sec-001--die-admin-api-ist-token-geschützt). |
| W-23 | `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md:134` | „Lint: viele Warnungen (65), keine Errors" | 1 Warning, 0 Errors | Erledigt durch das Archiv. |
| W-24 | `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md:113` | „Keine expliziten Security-Header in Next-Konfiguration." | **Bestätigt:** `next.config.ts` enthält nur `reactStrictMode`. Es werden keine CSP-/HSTS-/Referrer-/Permissions-Header ausgeliefert | **Offen** — als [GAP-018](#offene-lücken) geführt. |
| W-25 | `specifications/archive/logic-flow_archivstand_2026-10-25.md:8-12` | Validierungstabelle mit fünf Modi, Vibe-Check mit Community-Stats, Lyrics mit Lock-in vor dem Audio | Sechs Modi, keine Community-Stats, Audio startet sofort | Erledigt durch das Archiv; siehe W-02, W-04, W-05. |
| W-26 | `specifications/archive/logic-flow_archivstand_2026-10-25.md:18` | „A 'Staff Menu' is available in all modes to manually adjust scores or skip turns" | Das Power-User-Menü erscheint erst in der Auflösungsphase: `src/components/game/RevealPhase.tsx:604-634`; es korrigiert nur die aktuelle Runde, nicht beliebige Punkte | Erledigt durch das Archiv; verbindlich ist [GAME-040](#game-040--power-user-override-mit-dokumentierter-governance). |
| W-27 | `specifications/archive/database_schema_archivstand_2026-10-25.md:4`, `:19`, `:52-60` | „Used across all 5 game modes", `pack: string`, Supabase-Tabellen `songs`, `sessions`, `session_players`, `game_rounds`, `vibe_votes`, `user_profiles`, `saved_presets` | Sechs Modi, `packs: string[]`, Lyrics optional. Keine Supabase-Tabelle existiert; `package.json` enthält keine Supabase-Abhängigkeit, die einzige Persistenz ist `localStorage` | Erledigt durch das Archiv. Supabase ist **Later** — siehe [GAP-016](#offene-lücken). |
| W-28 | `CONTRACT.md:196` | „Heute: 25 Schlüssel, ~285 Literale in 41 Dateien" | Die 25 Schlüssel stimmen. Die Literale sind **nicht** übersetzt: `useTranslation` wird nur in `src/app/page.tsx` verwendet. Das Gate zählt 935 Literaltexte in 47 Dateien | Die Zahl „~285 Literale in 41 Dateien" ist zu ersetzen durch den gemessenen Wert (935 in 47). Siehe [I18N-007](#i18n-007--jeder-sichtbare-text-stammt-aus-der-übersetzung) und [GAP-006](#offene-lücken). |
| W-29 | `CONTRACT.md:214-259` | Vorgabe von 46 `common.*`-Schlüsseln | `de.json`/`en.json` enthalten je 6 `common.*`-Schlüssel (`play`, `back`, `next`, `cancel`, `save`, `loading`); `src/i18n/locales/parts/` ist leer | Die Liste ist eine Zielvorgabe, kein Ist-Stand. Status als „geplant" führen. |
| W-30 | `CONTRACT.md:78` | Beispielanforderung mit `answersLocked === true` als Bedingung für den Reveal | Eine Variable `answersLocked` existiert nicht (`grep -rn "answersLocked" src` ist leer). Der Reveal folgt einem Knopfdruck bzw. dem Modus-Ablauf | Beispiel an den Code anpassen; verbindlich ist [GAME-002](#game-002--der-reveal-gibt-die-lösung-erst-nach-dem-sperren-frei). |
| W-31 | `CONTRACT.md:305-307` | Gates `scripts/check-i18n-completeness.mjs`, `scripts/check-doc-links.mjs`, `scripts/check-file-size.mjs` | `check-i18n-completeness.mjs` existiert seit dem 25.10.2026 (Ergebnis: 935 Literaltexte in 47 Dateien). `check-doc-links.mjs` und `check-file-size.mjs` fehlen; `npm run check:i18n` ist nicht in `package.json` definiert | **Teilweise erledigt.** Offen bleiben Verdrahtung, Dateigrößen-Gate und Linkcheck — siehe [NFR-009](#nfr-009--quellcode-dateien-bleiben-unterhalb-der-größengrenze) bis [NFR-011](#nfr-011--ein-doku-linkcheck-verhindert-tote-verweise). |
| W-32 | `specifications/archive/current_status_2026-04-08_archivstand_2026-10-25.md:15` | „Song-Validation (`validate-songs`): ❌ fehlgeschlagen (A1.json: 52 Fehler, 362 Warnungen)" | `npm run validate-catalog` meldet 0 Schema-Fehler und 126 Warnungen über alle 135 Packs | Erledigt durch das Archiv. Der Einzelpack-Check `npm run validate-songs` prüft weiterhin `src/data/songs/A1.json` als Einzeldatei (`src/utils/validate-song-data.ts:465`) und ist nicht mit dem Katalog-Gate identisch. |
| W-33 | `src/config/game-config.ts:282-283` | Kommentar: alte Pack-IDs „lieferten im Filter leere Auswahlen" | `PACK_ALIASES` (`:284-297`) behebt das für die 12 gelisteten IDs. Die 27 IDs in `SONG_PACKS` und die 27 Pack-Namen in den Daten stimmen exakt überein (gemessen) | Kein offener Widerspruch; die Konfiguration ist konsistent. Die 12 Aliase bleiben für alte Spielstände nötig. |
| W-34 | `LLM.md:37-39` (neue Einstiegskarte, Stand 25.10.2026) | Regel 2: „Vor dem Sperren der Antworten darf kein Titel, kein Interpret und kein Albumcover **im DOM oder im Zustand** liegen." | Der Song mit Titel, Künstler, Jahr und Cover liegt im Zustand (`currentSong` in `src/stores/game-store.ts:394-402`), und der YouTube-Iframe mit dem Video liegt im DOM (`src/components/game/MusicPlayer.tsx:425-429`). Die Regel ist im Code **nicht** erfüllt | **Offen — höchste Priorität.** Entweder wird die Regel umgesetzt (getrennter Anzeige-Song ohne Metadaten) oder die Einstiegskarte präzisiert. Siehe [GAP-027](#offene-lücken). |
| W-35 | `LLM.md:40-42` (neue Einstiegskarte) | Regel 3: „Jeder sichtbare Text kommt aus der Übersetzung. … Keine hartkodierten UI-Zeichenketten." | 935 Literaltexte in 47 Dateien (`node scripts/check-i18n-completeness.mjs --count`) | **Offen.** Das Gate existiert und weist die Stelle aus; die Migration steht aus. Siehe [GAP-006](#offene-lücken). |
| W-36 | `specifications/catalog_issues_report.json:5-6` | Report vom 22.10.2026: „songs: 1623", „schemaWarnings: 308" | Gemessen am 25.10.2026: 1.615 Songs, 126 Warnungen (`npm run validate-catalog`) | Der Report ist nicht aktuell — er wurde nicht nach dem Katalog-Cleanup neu erzeugt. Gate: `npm run validate-catalog:report` neu ausführen. |

---

# Offene Lücken

Jede Lücke nennt die betroffenen Anforderungen und die Frage, ob sie eine **Anforderung** (muss umgesetzt werden) oder ein bewusst zurückgestelltes **Later** ist. Ohne Owner-Entscheidung bleibt sie offen — sie wird nicht als erfüllt geführt.

| ID | Lücke | Betroffene Anforderungen | Einordnung | Fundstelle |
|---|---|---|---|---|
| GAP-001 | Keine Tests für die Spielmodus-Logik: Scoring-Formeln, Timeline-Slot-Logik, Cheat-Abzüge, No-Cheat-Verhalten. Die teuersten Regeln des Produkts sind ungetestet. | GAME-016 … GAME-039 | **Anforderung** | `src/components/game/modes/*.tsx`; `vitest.config.ts` (`include: src/**/*.test.ts` — keine Komponententests) |
| GAP-002 | Keine Tests für die Store-Transitions: `startGame`, `nextRound`, Endbedingungen, Team-Mischung, Punktevergabe, Pilot-Übergabe. | GAME-001 … GAME-015, GAME-039, GAME-041, LOBBY-003 … LOBBY-012 | **Anforderung** | `src/stores/game-store.ts` |
| GAP-003 | Keine Tests für `pickRandomSong` (Pack-/Difficulty-/QR-/Modusfilter und deren Fallback-Kette) und für `normalizePackIds`. | GAME-043 … GAME-045, LOBBY-017 | **Anforderung** | `src/utils/song-picker.ts` |
| GAP-004 | Keine Tests für `censorHint` (Spoiler-Zensur in Hinweisen). | CAT-011, CAT-012 | **Anforderung** | `src/utils/censor-utils.ts` |
| GAP-005 | Keine Tests für die Admin-API: Token-Prüfung, SSRF-Allowlist, Größenlimit, Content-Type-Prüfung, Sperrmechanismus. | SEC-001 … SEC-011 | **Anforderung** | `src/admin-api/**` |
| GAP-006 | Das i18n-Gate ist **angelegt** (`scripts/check-i18n-completeness.mjs`), aber noch nicht verdrahtet (`npm run check:i18n` fehlt in `package.json`, kein Lauf in `scripts/local-ci.sh`). Der Kern der Lücke bleibt: 935 hart kodierte Literaltexte in 47 Dateien sind nicht übersetzt (u. a. in `src/app/lobby`, `src/app/game`, `src/app/projector`, `src/app/settings`, `src/components/game/**`). | I18N-004, I18N-005, I18N-006, I18N-007, NFR-010 | **Anforderung** | `node scripts/check-i18n-completeness.mjs --count` → „Summe Literaltexte: 935", „Dateien geprüft: 47`; `grep -rn "useTranslation" src/` → 1 Treffer (`src/app/page.tsx`) |
| GAP-007 | Kein Dateigrößen-Gate; 5 Dateien über 550 Zeilen, 5 weitere über 400 Zeilen. | NFR-009 | **Anforderung** | `src/app/admin/review/page.tsx` (755), `src/app/lobby/page.tsx` (744), `src/components/game/RevealPhase.tsx` (671), `src/stores/game-store.ts` (640), `src/components/game/MusicPlayer.tsx` (630) |
| GAP-008 | Kein Doku-Linkcheck-Gate. | NFR-011 | **Anforderung** | `scripts/` enthält kein `check-doc-links.mjs` |
| GAP-009 | Die Soundeffekt- und Modus-Cue-Dateien fehlen. Vorhanden sind nur Asset-Prompts (`public/audio/sfx/*.prompt.md`, `public/audio/mode-cues/*.prompt.md`), die im Code referenzierten `.mp3`-Dateien existieren nicht. Der SFX-Spieler schluckt den Fehler still. | UI-015, UI-016, NFR-008 | **Anforderung** (oder bewusst „Later", falls die Sounds gestrichen werden) | `src/utils/game-audio-cues.ts:4-20` gegen `ls public/audio/sfx/` |
| GAP-010 | Die Phase `locked-in` wird von keinem Codepfad betreten; es gibt keine `answersLocked`-Semantik. Die Lyrics-Variante startet die Musik vor der Antwort. | GAME-001, GAME-002, W-04, W-30 | **Entscheidung erforderlich**: echte Sperrphase bauen oder den Phasenumfang auf vier Phasen reduzieren | `src/types/game-state.ts:31`; `grep -rn "advancePhase(" src` |
| GAP-011 | `links.coverLink` ist in **keinem** der 1.615 Songs gesetzt. Die Cover-Confusion-Variante „Cover oder Original?" ist damit nie mit einem echten Cover verknüpft, und das Label „COVER-VERSION AKTIV" erscheint nie. | GAME-034, GAME-035, MEDIA-016, NFR-008 | **Anforderung** (Datenlieferung) oder **Later** (Variante entfernen) | gemessen über `src/data/songs/*.json`; `src/components/game/modes/CoverConfusionMode.tsx:116-120` |
| GAP-012 | `links.amazonPrimePreview` ist in **keinem** Song gesetzt. Der Pfad `useAmazonPrime` ist damit toter Code; die Auswahl „Amazon Music" in den Settings bewirkt außer einem Hinweistext nichts — es wird YouTube abgespielt. | MEDIA-012, MEDIA-002, NFR-008 | **Anforderung** (Datenlieferung) oder **Later** (Provider aus der Auswahl nehmen) | gemessen über `src/data/songs/*.json`; `src/components/game/MusicPlayer.tsx:169`, `:285` |
| GAP-013 | `apple-music` und `amazon-music-premium` sind Provider-Typen ohne UI-Auswahl und ohne Adapter (`src/config/game-config.ts:20-26`). | MEDIA-001 … MEDIA-018 | **Later** | `grep -rn "amazon-music-premium\|apple-music" src/` → nur Typdefinition und Embed-Zweig |
| GAP-014 | `onlyQRCompatible` hat keine Wirkung: alle 1.615 Songs haben `isQRCompatible: true`. Der Schalter in der Lobby suggeriert eine Filterung, die es nicht gibt. | LOBBY-023 (Lobby-Schritt 5), GAME-045 | **Entscheidung erforderlich**: Filter schärfen (echte Karten-Kompatibilität pflegen) oder Schalter entfernen | gemessen über `src/data/songs/*.json`; `src/app/lobby/page.tsx:439-460` |
| GAP-015 | `supportedModes` ist inkonsistent zu `lyrics !== null`: 1.521 Songs führen „lyrics" in `supportedModes`, 1.553 haben Lyrics-Daten. Der Modusfilter in `pickRandomSong` greift daher für 32 Songs mit Lyrics nicht. | GAME-043, CAT-003 | **Anforderung** (Datenbereinigung) | gemessen über `src/data/songs/*.json`; `src/utils/song-picker.ts:58-62` |
| GAP-016 | Multi-Geräte-Modus, Sitzungscode, Supabase, Google-Login, Spectator-Modus und Eliminierung existieren nur als Typen bzw. Flags, die nie gesetzt werden. | LOBBY-020, W-10, W-27 | **Later** | `src/types/session.ts`; `src/types/player.ts:31-43`; `src/stores/game-store.ts:216-217` |
| GAP-017 | `FORCE_REMOVE_DUPLICATE_YEARS: true` (`src/config/game-config.ts:316`) wird nicht durchgesetzt: ein Duplikat wird automatisch entfernt, die Spieler-Auswahl greift nur ab mehr als zehn Jahreszahlen. | GAME-019, GAME-020 | **Entscheidung erforderlich**: Konstante wirksam machen oder entfernen | `src/components/game/modes/TimelineMode.tsx:185-196` |
| GAP-018 | Es werden keine Security-Header (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) ausgeliefert. `next.config.ts` enthält nur `reactStrictMode`. | SEC-001 … SEC-013 | **Anforderung** | `next.config.ts`; `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md:113` |
| GAP-019 | `overrideGovernance` wird angezeigt, aber nicht durchgesetzt — es gibt keine Rollen, keine Co-Host-Identität und keine Mehrheitsentscheidung. | GAME-040 | **Anforderung** (Rollenmodell) oder **Later** | `src/components/game/RevealPhase.tsx:614-618`; `src/app/game/page.tsx:197-215` |
| GAP-020 | `hintReleasePolicy` und `aiQueueStrategy` werden persistiert und angezeigt, steuern aber keinen Prozess. Es gibt keine KI-Hint-Erzeugung im Produktcode. | NFR-014, NFR-015 | **Later** | `src/app/settings/governance/page.tsx`; `grep -rn "processAITaskQueue" src/` |
| GAP-021 | Der E2E-Test prüft ausschließlich die Erreichbarkeit von sechs Routen; die Kernjourney (Lobby → Runde → Reveal → Spielende) ist nicht abgedeckt. | GAME-003, LOBBY-001, UI-011, UI-012, NFR-012, NFR-013 | **Anforderung** | `e2e/smoke.spec.ts` |
| GAP-022 | Acht Konfigurationskonstanten werden nie verwendet: `SPOTIFY_PREVIEW_DURATION`, `COUNTDOWN_SECONDS`, `DEFAULT_UNLOCK_METHOD`, `FORCE_REMOVE_DUPLICATE_YEARS`, `MIN_ROUNDS_TO_PLAY`, `MAX_ROUNDS_TO_PLAY`, `MAX_CARDS_PER_SET`, `DEFAULT_LANGUAGE` (sowie `CARD_*_MM`, `ALL_GAME_MODES`). | MEDIA-001 … MEDIA-018, LOBBY-014 | **Entscheidung erforderlich**: wirksam machen oder entfernen (toter Konfigurationsbestand) | `src/config/game-config.ts:61-62`, `:81-82`, `:313`, `:316`, `:322-325` |
| GAP-023 | Der Pack-Selector zeigt die ungeprüfte Zahl „Über 1.000 Songs bereit zum Spielen". Bei 1.615 Songs ist die Aussage zwar wahr, aber nicht gemessen und bei Katalogänderungen nicht gepflegt. | LOBBY-016, CAT-002 | **Entscheidung erforderlich**: Zahl aus dem Katalog ableiten oder Text ohne Zahl verwenden | `src/components/lobby/PackSelector.tsx` (Footer-Badge) |
| GAP-024 | `chipsEnabled` wird persistiert, aber es gibt keine Chips-Mechanik. `ENABLE_CHIPS_BETTING: false` ist die Quelle der Wahrheit. | GAME-001 … GAME-039 (Konfiguration) | **Later** | `src/types/game-state.ts:102`, `src/config/game-config.ts:319` |
| GAP-025 | `supportedModes` erlaubt aktuell alle sechs Modi für 1.615 Songs (`timeline`, `hint-master`, `vibe-check`, `cover-confusion`, `survivor`), `lyrics` nur für 1.521. Der Modusfilter fällt stillschweigend auf den Vollpool zurück, wenn ein Filter leer ist — der Modus läuft dann mit Songs, die ihn nicht unterstützen. | GAME-043, GAME-045 | **Entscheidung erforderlich**: stiller Fallback beibehalten oder Fehler anzeigen | `src/utils/song-picker.ts:56-70` |
| GAP-026 | `MIN_ROUNDS_TO_PLAY = 10` und `MAX_ROUNDS_TO_PLAY = 30` werden nicht durchgesetzt. Die Lobby bietet 5, 10, 15 und 20 Runden an, der Regler erlaubt 5 bis 500. | LOBBY-014 | **Entscheidung erforderlich**: Grenzen durchsetzen oder die Konstanten entfernen | `src/config/game-config.ts:61-62`; `src/app/lobby/page.tsx:305-310`, `:333-346` |

---


| GAP-027 | Die neue Einstiegskarte `LLM.md:37-39` verlangt, dass vor dem Sperren der Antworten weder Titel noch Interpret noch Cover „im DOM oder im Zustand" liegen. Der Code hält den vollständigen Song (inkl. `title`, `artist`, `year`, `coverUrl`) in `currentSong` und rendert den YouTube-Iframe im DOM. Die Regel ist damit im Produktcode **nicht** erfüllt. | CORE-005, MEDIA-015, W-34 | **Anforderung** (Umsetzung: Anzeige-Song ohne Metadaten) oder **Entscheidung des Owners** (Regel präzisieren auf „nicht sichtbar") | `src/stores/game-store.ts:394-402`; `src/components/game/MusicPlayer.tsx:425-429`; `LLM.md:37-39` |
| GAP-028 | `src/data/songs/packs.json` ist als Metadatenquelle veraltet: Für „Global Hits 1950-2026" steht dort `songCount: 59`, tatsächlich enthält der Pack 1.107 Songs. Mehrere Einträge sind zudem leere Objekte (`{}`), z. B. `electronic-synth`, `80s-pop`, `kids-disney`. | CAT-003, W-15 | **Anforderung** (Metadatenpflege) oder **Later** (Quelle entfernen) | `src/data/songs/packs.json`; gemessen über `src/data/songs/*.json` |
| GAP-029 | Die gehärteten Hilfsfunktionen der Admin-API (`fetchGuardedBinary`, `assertRateLimit`, `MAX_JSON_BYTES`, credential-freie URLs) werden von den Routen noch nicht verwendet: `src/admin-api/admin/covers/save/route.ts:37-44` lädt weiterhin mit `redirect: 'follow'` und eigener `downloadCover`-Funktion, `src/admin-api/admin/covers/search/route.ts:57` und `:75` rufen `fetchWithTimeout` ohne `maxBytes`. Damit greifen der Redirect-Guard und die JSON-Größenkappe im Betriebsfall nicht. | SEC-006, SEC-007, SEC-015, SEC-016, SEC-017 | **Anforderung** | `src/admin-api/admin/covers/save/route.ts:32-69`; `src/admin-api/admin/covers/search/route.ts:57`, `:75` |

# Projektstatus-Datei (`project/project.yaml`)

`project/project.yaml` ist die **maschinenlesbare Wahrheit** über den Projektzustand. Sie wird parallel zu diesem Dokument gepflegt und von den Root-Dokumenten referenziert. Die Datei existiert im Repository noch nicht (`ls project/` → „No such file or directory"); sie ist durch den parallelen Worker zu erstellen.

**Was hineingehört** (ohne hier Zahlen zu erfinden — die Werte werden aus dem Code und aus den Gates dieser Runde übernommen):

| Abschnitt | Inhalt | Quelle der Werte |
|---|---|---|
| `project` | Name, Lizenz (GPL-3.0), Baseline-Version, Status | `package.json`, `LICENSE`, Kopf dieses Dokuments |
| `stack` | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Framer Motion, Zustand, i18next, Playwright, Vitest | `package.json` |
| `milestones` | Aktueller Meilenstein, abgeschlossene Meilensteine, je mit Nachweis | `specifications/project_roadmap.md`, `specifications/current_status_2026-04-08.md` |
| `domains` | Die neun Anforderungs-Domänen mit ihren ID-Bereichen und Anforderungsanzahl | Dieses Dokument |
| `requirements` | Liste der Anforderungs-IDs mit Status und Preset | Dieses Dokument |
| `module_boundaries` | Modulgrenzen: `src/config`, `src/types`, `src/stores`, `src/utils`, `src/components`, `src/app`, `src/admin-api`, `src/i18n`, `src/data` | Verzeichnisstruktur |
| `quality_thresholds` | Messbare Schwellen: max. Dateigröße 550/400 Zeilen, Gate-Liste, Catalog-Baseline | `specifications/quality-baseline.json`, `scripts/local-ci.sh` |
| `open_gaps` | Die GAP-IDs aus diesem Dokument mit Status | [Offene Lücken](#offene-lücken) |
| `contradictions` | Die W-IDs aus diesem Dokument mit Status | [Widersprüche](#widersprüche) |

**Regel:** Zahlen, Schwellen und Statusangaben in `project/project.yaml` werden aus den Gates abgeleitet, nicht geschätzt. Jeder Wert muss durch ein Kommando oder eine Datei:Zeile belegbar sein.

---

# Änderungsverzeichnis dieser Baseline

| Datum | Änderung | Nachweis |
|---|---|---|
| 2026-10-25 | Baseline 0.1 angelegt: 174 Anforderungen aus dem Code abgeleitet, 36 Widersprüche, 29 offene Lücken | Commit `d5b6422`; `npm run typecheck` (grün), `npm run lint` (0 Errors), `npx vitest run` (21 Tests), `npm run validate-catalog` (135 Packs / 1.615 Songs), `node scripts/check-i18n-completeness.mjs --count` (935 Literaltexte in 47 Dateien) |
