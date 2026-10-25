# LLM.md — Phomu in Kurzform

Diese Datei ist die **Einstiegskarte** für einen KI-Assistenten. Sie enthält
keine Spezifikation, sondern sagt, wo die Spezifikation steht und welche Regeln
unverhandelbar sind.

Die verbindliche Wahrheit liegt in drei Dateien:

| Frage | Datei |
|---|---|
| Was muss das Produkt tun? | [`REQUIREMENTS.md`](REQUIREMENTS.md) |
| Wie ist es gebaut? | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Wann gilt etwas als fertig? | [`QUALITY.md`](QUALITY.md) |

Die Arbeitsregeln für Agenten stehen in [`AGENTS.md`](AGENTS.md). **Lies sie,
bevor du Code änderst.**

---

## Was Phomu ist

Hybrides Musik-Partyspiel. Physische QR-Karten (59 × 91 mm + 3 mm Beschnitt)
plus Web-App. Eine Runde auf einem Gerät, das eine Person führt (der „Pilot").
1–24 Spieler, Einzelspieler oder feste oder wechselnde Teams. Sechs Spielmodi:
Timeline, Hint-Master, Lyrics Labyrinth, Vibe-Check, Survivor, Cover Confusion.

**Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 ·
Zustand (persist in localStorage) · i18next · Vitest + Playwright · GPL-3.0.**

---

## Die sechs Regeln, die am häufigsten greifen

1. **Konstanten kommen aus `src/config/`.** Punkte, Zeitlimits, Kapazitäten,
   Grenzwerte. Nie im Code duplizieren. `src/config/game-config.ts` ist die
   Wahrheit.
2. **Der Anti-Spoiler-Schutz ist heilig.** Vor dem Sperren der Antworten darf
   kein Titel, kein Interpret und kein Albumcover im DOM oder im Zustand liegen.
   Das gilt auch für die Metadaten der Aufgabe, nicht nur für den sichtbaren Text.
3. **Jeder sichtbare Text kommt aus der Übersetzung.** `de.json` und `en.json`
   werden immer zusammen gepflegt. Keine hartkodierten UI-Zeichenketten.
   Eigennamen (Spotify, YouTube, Jackbox) sind die Ausnahme.
4. **Keine Abnahme auf Basis von Stubs.** Eine Funktion, die nur so tut, als
   existierte sie, ist nicht implementiert. Kein `skip`, kein `@Ignore`, kein
   auskommentierter Test, um ein Gate grün zu machen.
5. **Keine erfundenen Zahlen.** Jede Zahl braucht das Kommando, das sie erzeugt
   hat. Was nicht gemessen wurde, ist „nicht gemessen".
6. **Die Doku entsteht im selben Commit.** Siehe
   [`docs/DOCUMENTATION_POLICY.md`](docs/DOCUMENTATION_POLICY.md).

---

## Der Stil des Projekts

Der Code ist **englisch**, die Doku ist **deutsch**. Bezeichner sind
beschreibend, Abkürzungen sind unzulässig, sofern sie nicht etablierte
Fachbegriffe sind:

```text
schlecht:  x, tmp, data2, mgr, handleStuff()
gut:       roundPhase, answersLocked, hintLevel, applyScoreDecay()
```

Kommentare erklären das **Warum**, nicht das Was. Der Code ist für jemanden
geschrieben, der das Projekt nicht kennt — eine erklärende Zeile ist besser als
eine kryptische.

Regeln für den Umfang: Ziel `≤ 400` Zeilen pro handgeschriebener Datei, harte
Grenze `550`. Jede Datei hat genau eine Verantwortung.

---

## Vor dem ersten Commit

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run check:i18n
npm run check:doc-links
npm run build
```

Die Reihenfolge ist die Reihenfolge der CI. Wer nur einen Teil laufen lässt,
kann nicht behaupten, das Projekt sei grün.

---

## Was du **nicht** tust

- Du änderst das Produktverhalten nicht ohne freigegebene Anforderung
  (siehe `docs/cr/`).
- Du pushst nicht, du taggst nicht, du veröffentlichst nicht. Das entscheidet
  der Owner.
- Du erfindest keine Zahlen, keine Testresultate, keinen Abnahmestatus.
- Du löschst keine Dokumentation, um sie aufzuräumen. Alte Stände wandern nach
  `specifications/archive/`.

---

## Der Index

| Thema | Datei |
|---|---|
| Anforderungen | [`REQUIREMENTS.md`](REQUIREMENTS.md) |
| Architektur | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Meilensteine | [`ROADMAP.md`](ROADMAP.md) |
| Qualität | [`QUALITY.md`](QUALITY.md) |
| Wo ändere ich was | [`WHERE_TO_CHANGE.md`](WHERE_TO_CHANGE.md) |
| Fachbegriffe | [`GLOSSARY.md`](GLOSSARY.md) |
| Agentenrollen | [`AGENTS.md`](AGENTS.md) |
| Projektzustand | [`project/project.yaml`](project/project.yaml) |
| Doku-Index | [`docs/README.md`](docs/README.md) |
| Anleitung für Spieler | [`docs/user-guide/USER-GUIDE.de.md`](docs/user-guide/USER-GUIDE.de.md) |
| Sicherheit | [`SECURITY.md`](SECURITY.md) |
| Datenschutz | [`PRIVACY.md`](PRIVACY.md) |

Der ausführliche KI-Kontext der früheren Fassung („LLM.md — The Master
Specification") liegt weiterhin als Archivstand unter
[`specifications/archive/LLM_archivstand_2026-10-25.md`](specifications/archive/LLM_archivstand_2026-10-25.md).
Er ist **historisch** — dort stehen Angaben, die nicht mehr stimmen.
