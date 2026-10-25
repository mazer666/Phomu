# Phomu — Dokumentationsindex

Diese Datei ist der Einstieg in die Dokumentation. Sie sagt, **wo** eine Information
steht — nicht, wie sie im Detail lautet. Zwei Wege führen hierher: die Tabelle unten
für alle, die wissen, wonach sie suchen; der Abschnitt „Die richtige Datei finden"
für alle, die es noch nicht wissen.

---

## Die zwei Ebenen

| Ebene | Ordner | Sprache | Gelesen von |
|---|---|---|---|
| **Projektdokumentation** | Repo-Root und `docs/` | Deutsch | Team, Agenten, Reviewer |
| **Nutzer-Guides** | `docs/user-guide/` | Deutsch **und** Englisch, je eine Datei | Spielerinnen und Spieler |

Der maschinenlesbare Projektzustand liegt in `project/project.yaml`. Er ist die
einzige Wahrheit für Werte, die mehrere Dokumente betreffen.

---

## Der Doku-Baum

```text
Phomu/
├── README.md              Einstieg: was Phomu ist, Schnellstart, Gates
├── AGENTS.md              Arbeitsregeln für Agenten, acht Rollen
├── REQUIREMENTS.md        Verbindliche Anforderungen mit IDs
├── ARCHITECTURE.md        Modulgrenzen und Abhängigkeitsrichtung
├── ROADMAP.md             Meilensteine, Gates, Status
├── QUALITY.md             Abnahmemodell
├── WHERE_TO_CHANGE.md     Wo ändere ich was
├── GLOSSARY.md            Fachbegriffe mit eigener Bedeutung
├── PROJECT_MANAGEMENT.md  Prozess, Rollen, Register
├── CHANGELOG.md           Was sich geändert hat
├── CONTRIBUTING.md        Beitragen
├── SECURITY.md            Bedrohungsmodell, Meldeweg
├── PRIVACY.md             Datenminimierung
├── LLM.md                 Kurzfassung für KI-Assistenten
├── PRINTING_GUIDE.md      Verweis auf docs/guides/PRINTING-GUIDE.md
├── project/
│   └── project.yaml       Maschinenlesbarer Projektzustand
├── docs/
│   ├── README.md          Diese Datei
│   ├── DOCUMENTATION_POLICY.md   Regeln der Dokumentation
│   ├── GETTING-STARTED.md        Setup und Fehlerbehebung
│   ├── BEST_IN_CLASS.md          messbare Qualitätsziele
│   ├── adr/                       Architekturentscheidungen
│   ├── cr/                        Change Requests
│   ├── acceptance/                Abnahmenachweise
│   ├── design/                    Entwurfsverträge
│   ├── guides/                    Drucken, Fehlerbehebung
│   │   ├── PRINTING-GUIDE.md
│   │   └── TROUBLESHOOTING.md
│   └── user-guide/                Nutzer-Guides
│       ├── USER-GUIDE.de.md
│       └── USER-GUIDE.en.md
└── specifications/         Vorgänger-Dokumentation (Historie)
```

---

## Was steht wo

| Datei | Inhalt | Wer liest sie |
|---|---|---|
| [`../README.md`](../README.md) | Was Phomu ist, Schnellstart, die Prüfkommandos | alle, die das Projekt zum ersten Mal sehen |
| [`../REQUIREMENTS.md`](../REQUIREMENTS.md) | Jede Verhaltensregel mit ID, Akzeptanz und Verifikation | Product Manager, Game Engineer, QA, Reviewer |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | Schichten, Modulgrenzen, Abhängigkeitsrichtung, Datenfluss | Architekt, alle Entwickelnden |
| [`../ROADMAP.md`](../ROADMAP.md) | Meilensteine mit Scope, Nicht-Zielen und Abnahmekriterien | Team, Product Manager, Owner |
| [`../QUALITY.md`](../QUALITY.md) | Abnahmemodell in acht Dimensionen, mit dem Beleg pro Aussage | QA, Reviewer, Owner |
| [`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md) | Thema → Datei → Anleitung → Kommando | jeder, der etwas ändern will |
| [`../GLOSSARY.md`](../GLOSSARY.md) | Fachbegriffe mit eigener Bedeutung, alphabetisch, mit Fundstelle | alle, die ein Wort nicht kennen |
| [`../AGENTS.md`](../AGENTS.md) | Rollen, Regeln, Übergabeformat | KI-Assistenten und Agenten |
| [`../PROJECT_MANAGEMENT.md`](../PROJECT_MANAGEMENT.md) | Prozess, Register, Governance | Team, Owner |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Beitragsregeln, Testphilosophie, PR-Checkliste | alle Beiträger |
| [`../SECURITY.md`](../SECURITY.md) | Bedrohungsmodell, Meldeweg, umgesetzte Härtungen | alle; Sicherheitsreviewer im Besonderen |
| [`../PRIVACY.md`](../PRIVACY.md) | Welche Daten lokal bleiben, was nicht fließt | alle; Datenschutzreviewer im Besonderen |
| [`../LLM.md`](../LLM.md) | Kurzfassung des Projekts für KI-Assistenten | KI-Assistenten |
| [`DOCUMENTATION_POLICY.md`](DOCUMENTATION_POLICY.md) | Same-Change-Regel, Single Source of Truth, Sprachregel, Benennungsregeln | jeder, der Doku schreibt |
| [`GETTING-STARTED.md`](GETTING-STARTED.md) | Vom Klon bis zum spielbaren Zustand, mit Fehlerbehebung | neue Entwickelnde, neue Beitragende |
| [`BEST_IN_CLASS.md`](BEST_IN_CLASS.md) | Messbare Qualitätsziele mit Messmethode und aktuellem Stand | QA, Architekt, Owner |
| [`guides/PRINTING-GUIDE.md`](guides/PRINTING-GUIDE.md) | Kartenformat, Auflösung, Testausdruck, QR-Inhalt | alle, die Karten drucken |
| [`guides/TROUBLESHOOTING.md`](guides/TROUBLESHOOTING.md) | Fehlerbilder und ihre Lösung für Endnutzer | Spielerinnen und Spieler, Support |
| [`user-guide/USER-GUIDE.de.md`](user-guide/USER-GUIDE.de.md) | Das vollständige Spiel in deutscher Sprache | deutschsprachige Spielerinnen und Spieler |
| [`user-guide/USER-GUIDE.en.md`](user-guide/USER-GUIDE.en.md) | Dasselbe Spiel in englischer Sprache | englischsprachige Spielerinnen und Spieler |
| `adr/` | Architekturentscheidungen mit Status, Kontext, Entscheidung, Alternativen | Architekt, Reviewer |
| `cr/` | Change Requests für materielle Verhaltensänderungen | Product Manager, Team |
| `acceptance/` | Abnahmenachweise je Meilenstein, mit konkreter Evidenz | QA, Owner |
| `design/` | Entwurfsverträge für einzelne Bausteine | Architekt, Entwickelnde |
| `specifications/` | Vorgänger- und Statusdokumentation, historische Snapshots | nur für die Historie; nicht mehr fortschreiben |

---

## Die richtige Datei finden

**Wenn du eine Frage über das Spiel stellst:**

| Frage | Datei |
|---|---|
| Wie läuft eine Runde ab? | [`user-guide/USER-GUIDE.de.md`](user-guide/USER-GUIDE.de.md), Abschnitt „Regeln, Punkte und Gewinnbedingung" |
| Was muss das Produkt tun? | [`../REQUIREMENTS.md`](../REQUIREMENTS.md) |
| Welche Punkte gibt welcher Modus? | [`../REQUIREMENTS.md`](../REQUIREMENTS.md), Domäne `GAME` |
| Was bedeutet „Pilot" oder „Vibe"? | [`../GLOSSARY.md`](../GLOSSARY.md) |

**Wenn du eine Frage über den Code stellst:**

| Frage | Datei |
|---|---|
| Wo ändere ich X? | [`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md) |
| Welche Datei darf was aufrufen? | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Welche Konstante ist die Wahrheit? | `src/config/game-config.ts` |
| Welche Zahlen sind gemessen? | [`BEST_IN_CLASS.md`](BEST_IN_CLASS.md) |

**Wenn du etwas ändern willst:**

1. Anforderung in [`../REQUIREMENTS.md`](../REQUIREMENTS.md) suchen oder anlegen.
2. Fundstelle über [`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md) bestimmen.
3. Ändern, Test schreiben, Doku im selben Commit aktualisieren — die Zuordnung
   steht in [`DOCUMENTATION_POLICY.md`](DOCUMENTATION_POLICY.md).

**Wenn du etwas nicht findest:**

1. In [`../GLOSSARY.md`](../GLOSSARY.md) nach dem Fachwort suchen.
2. In `src/config/game-config.ts` nach der Zahl suchen — jede Zahl des Spiels hat
   dort genau eine Stelle.
3. `grep -rn "<Begriff>" src/` — der Code ist die Wahrheit, die Doku folgt ihm.

---

## Zwei Regeln, die man kennen muss

**1. Jede Zahl steht an genau einer Stelle.** Punkte, Zeitlimits, Kapazitäten und
Grenzwerte stehen in `src/config/game-config.ts`; Katalogzahlen werden gemessen,
nicht geschätzt. Wer eine Zahl in zwei Dokumenten wiederholt, erzeugt einen
Widerspruch.

**2. Die Doku entsteht im selben Commit.** Eine Codeänderung ohne
Dokumentationsupdate ist unvollständig. Das ist keine Formalie: die Anforderung
in [`../REQUIREMENTS.md`](../REQUIREMENTS.md) nennt die Datei und den Test, und
genau daran hängt die Abnahme.
