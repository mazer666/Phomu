# Phomu

**Hybrides Musik-Partyspiel: physische QR-Karten trifft dynamische Web-App.**

Phomu ist ein Open-Source-Partyspiel, das Musikquiz, Social-Gaming und physische
QR-Karten in einem Spiel verbindet. Eine Runde läuft auf **einem** Gerät (oder auf
mehreren, wenn ein Sitzungscode verteilt wird), die Karten kommen aus dem Drucker
oder aus dem Handy-Bildschirm.

- **Lizenz:** GPL-3.0
- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · Zustand · i18next
- **Sprachen:** Deutsch (primär) und Englisch (vollständig)

---

## Was Phomu ist

Phomu ist kein Streaming-Client und keine Musikdatenbank. Es ist ein **Spiel**:
eine Mischung aus Zuordnungs-, Deduktions- und Musikwissen-Runden, die mit
physischen oder virtuellen Karten gespielt wird.

Drei Dinge unterscheiden es vom klassischen Musikquiz:

1. **Die Karte ist der Zugang.** Eine gedruckte QR-Karte führt direkt in den
   passenden Spielmodus. Wer die Karte hat, kann mitspielen — ohne Konto.
2. **Ein Gerät, eine Rolle.** Eine Person hält das Gerät und führt durch die Runde
   (der „Pilot"). Die Spieler antworten, ohne das Gerät zu berühren. Das verhindert
   Spoiler und macht ein Telefon zum vollwertigen Partysetup.
3. **Der Modus bestimmt die Mechanik.** Es gibt nicht „ein Quiz", sondern sechs
   verschiedene Denkaufgaben — von Reihenfolge bis Deduktion.

---

## Schnellstart

```bash
git clone https://github.com/mazer666/Phomu.git
cd Phomu
npm ci
npm run dev
```

Die App läuft danach auf `http://localhost:3000`.

Für die Admin-Oberfläche wird ein Token gebraucht:

```bash
cp .env.example .env.local
npm run security:rotate-admin-token   # schreibt einen Token nach .env.local
```

Ausführliche Anleitung inklusive Fehlerbehebung:
[`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md).

---

## Die sechs Spielmodi

| Modus | Aufgabe | Validierung |
|---|---|---|
| **Chronologische Timeline** | Songs in die richtige zeitliche Reihenfolge einordnen | automatisch |
| **Hint-Master** | den Song über bis zu fünf Hinweisstufen erraten | manuell durch den Pilot |
| **Lyrics Labyrinth** | die gefälschte Zeile unter echten Zeilen finden | automatisch |
| **Vibe-Check** | den Song einer Stimmung zuordnen | automatisch |
| **Survivor** | One-Hit-Wonder oder Dauerbestseller? | automatisch |
| **Cover Confusion** | das Original hinter der Cover-Version finden | automatisch |

**Anti-Spoiler:** Während des Spiels zeigt die Oberfläche niemals Titel, Interpret
oder Albumcover. Die Lösung erscheint erst, wenn alle Antworten gesperrt sind. Für
den Beamer gibt es einen eigenen, ebenfalls spoiler-freien Projektor-Modus.

**Punkte:** Grundpunkte, ein optionaler Zeit-Abfall und eine konfigurierbare
Deckelung. Alle Werte stehen zentral in
[`src/config/game-config.ts`](src/config/game-config.ts) — dort ist die Wahrheit,
nicht in irgendeiner Komponente.

---

## Funktionsumfang

- **Lobby:** 1–24 Spieler, Einzelspieler, feste Teams oder in jeder Runde neu
  gemischte Teams; Sitzungscode für mehrere Geräte
- **Spielablauf:** Ziehen → Frage → Sperren → Auflösen → Punkte, danach die nächste Runde
- **Katalog:** 135 Packs mit 1.615 Songs, mit Schema-Gate und Dubletten-Policy
- **Druck:** Kartenlayout 59 × 91 mm plus 3 mm Beschnitt, QR-Code auf jede Karte
- **Themes:** Jackbox, Spotify, YouTube, Music Wall
- **Sprachen:** Deutsch und Englisch, umschaltbar, persistent
- **Barrierefreiheit:** Tooltips an allen Bedienelementen, Tastaturbedienung,
  Fokusringe, `prefers-reduced-motion`

---

## Qualität und Gates

Der Qualitätsmaßstab steht in [`QUALITY.md`](QUALITY.md). Jede wesentliche Funktion
wird über acht Dimensionen abgenommen — funktional, technisch, Performance,
Usability, Security/Privacy, Internationalisierung, Interoperabilität, Dokumentation.

Die Prüfungen laufen lokal und in der CI:

| Kommando | Prüft |
|---|---|
| `npm run typecheck` | TypeScript strict, ohne Emit |
| `npm run lint` | ESLint |
| `npm run test` | Vitest mit Coverage |
| `npm run test:e2e:smoke` | Playwright-Smoke über den kompletten Ablauf |
| `npm run validate-songs` | Schema und Pflichtfelder jedes Songs |
| `npm run validate-catalog` | Katalog-Gate: Packs, Songs, Dubletten, fehlende Jahre |
| `npm run check:i18n` | Parität und Vollständigkeit von DE und EN |
| `npm run check:doc-links` | jeder relative Link im Repo löst auf |
| `npm run build` | Produktions-Build |

`npm run local-ci` führt die Prüfungen in der Reihenfolge aus, in der die CI sie
ausführt.

---

## Dokumentation

Die vollständige Navigation steht in [`docs/README.md`](docs/README.md).

| Dokument | Inhalt |
|---|---|
| [`REQUIREMENTS.md`](REQUIREMENTS.md) | die verbindlichen Anforderungen mit IDs |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Modulgrenzen und Abhängigkeitsrichtung |
| [`ROADMAP.md`](ROADMAP.md) | Meilensteine, Gates und Status |
| [`QUALITY.md`](QUALITY.md) | das Abnahmemodell |
| [`WHERE_TO_CHANGE.md`](WHERE_TO_CHANGE.md) | wo ändere ich was |
| [`GLOSSARY.md`](GLOSSARY.md) | die Fachbegriffe |
| [`AGENTS.md`](AGENTS.md) | wie Agenten in diesem Projekt arbeiten |
| [`SECURITY.md`](SECURITY.md) | Bedrohungsmodell und Meldeweg |
| [`PRIVACY.md`](PRIVACY.md) | Datenminimierung |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Beitragen |
| [`docs/user-guide/`](docs/user-guide/) | Anleitung für Spieler, Deutsch und Englisch |

Die maschinenlesbare Wahrheit über den Projektzustand liegt in
[`project/project.yaml`](project/project.yaml).

---

## Mitwirken

```bash
git clone https://github.com/mazer666/Phomu.git
cd Phomu
npm ci
npm run local-ci
```

Bitte lies vorher [`CONTRIBUTING.md`](CONTRIBUTING.md) und
[`AGENTS.md`](AGENTS.md). Beiträge folgen dem Hausstil: klare Namen, eine
Verantwortung pro Datei, Tests mit jeder Verhaltensänderung, Dokumentation im
selben Commit, keine erfundenen Zahlen.

---

## Lizenz

GPL-3.0-or-later. Siehe [`LICENSE`](LICENSE).

Die im Katalog referenzierten Musikstücke, Coverbilder und Videolinks gehören
Dritten; das Projekt stellt die Software unter GPL-3.0 bereit, nicht die Inhalte.
Siehe [`PRIVACY.md`](PRIVACY.md) und [`SECURITY.md`](SECURITY.md).
