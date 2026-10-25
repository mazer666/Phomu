# Phomu — Entwurfsverträge

Dieser Ordner enthält die **Entwurfsverträge** des Projekts: bindende
Dokumente, die die Schnittstellen *zwischen* den Bausteinen definieren.
Sie stehen eine Ebene tiefer als [`../ARCHITECTURE.md`](../../ARCHITECTURE.md)
(Schichten und Abhängigkeitsrichtung) und eine Ebene höher als der Code.

> **Sprache:** Deutsch für die Projektion, Englisch für alle Bezeichner,
> Typen und Dateinamen im Code. Beides wird nicht gemischt.

---

## Der Index

| Vertrag | Bindung | Was er regelt | Wer liest ihn |
|---|---|---|---|
| [`GAME-CONTRACT.md`](GAME-CONTRACT.md) | **Binding** | Der Spielablauf: Rundenphasen-Automat, Anti-Spoiler-Grenze, die sechs Spielmodi, Punkte- und Zeitregeln, Team- und Rundenlogik, Persistenzregeln, Musikprovider, Modulgrenzen für `src/components/**` | Game Engineer, UI Engineer, QA, Chief Architect, Product Manager, Owner |

**Weitere Verträge sind geplant** und werden an dieser Stelle nachgezogen:
Admin-API-Vertrag (Server-Grenze), Katalog-Vertrag (Datenqualität),
i18n-Vertrag (Übersetzungsgrenze). Sie entstehen, wenn die betreffende
Grenze im Code belastbar festgelegt ist — nicht vorher.

---

## Was „binding" hier bedeutet

Ein Vertrag in diesem Ordner ist **binding** in genau einem Sinn:

> **Wer eine im Vertrag beschriebene Grenze verändert, verletzt nicht nur den
> Code-Konventionen, sondern einen Vertrag.** Das ist im Review sichtbar, im
> Test nachweisbar und in der Abnahme eine Begründungspflicht.

Konkret heißt das:

| Element | Verbindlichkeit |
|---|---|
| Phasennamen (`drawing`, `question`, `locked-in`, `reveal`, `scoring`) | unveränderlich ohne Vertragsänderung |
| Anti-Spoiler-Regeln je Modus | verschärfung ist erlaubt, Lockerung nur mit ADR |
| Modus-Verträge (Eingabe, Validierung, Ergebnis, Punkte, Fehlerfälle) | Erweiterung ja, Umbenennung oder Streichung nein ohne ADR |
| Persistenzregeln (was in `localStorage` liegt) | Erweiterung nur um Felder ohne Lösungsrelevanz |
| Provider-Reihenfolge und Rückfallverhalten | nur mit ADR |
| Modulgrenzen | nur mit ADR |

**Kein Vertrag ersetzt den Code.** Stimmt der Code nicht mit dem Vertrag
überein, ist das ein **Befund**, kein Freifahrtschein: entweder wird der Code
angepasst oder der Vertrag — mit Begründung und, bei Grenzverschiebungen, mit
einem ADR.

---

## Die Änderungsregel

> **Wer eine Grenze verändert, ändert den Vertrag im selben Commit — und bei
> Grenzverschiebungen zusätzlich per ADR.**

Drei Fälle, drei Handlungen:

| Fall | Handlung | Form |
|---|---|---|
| **Ergänzung** — eine Regel wird präzisiert, ein Fehlerfall dokumentiert, ein Messwert ergänzt | Vertrag im selben Commit aktualisieren | Direktedit in [`GAME-CONTRACT.md`](GAME-CONTRACT.md), Änderung in der Commit-Message benennen |
| **Verschiebung** — Zustandsübergänge, Anti-Spoiler-Regeln, Modusverträge, Persistenz, Provider-Reihenfolge, Modulgrenzen | Vertrag **und** neues ADR | [ADR-Template](../adr/ADR_TEMPLATE.md), Nummerierung ab `ADR-0001`, nie überschreiben |
| **Korrektur** — der Vertrag beschreibt etwas, das der Code nicht (mehr) tut | Vertrag an den Code angleichen **oder** den Code korrigieren | Korrektur mit Datei:Zeile belegen; offene Entscheidung an den Owner |

**ADR-Pflicht bei Verschiebungen.** Ein ADR ohne die Alternative, die
verworfen wurde, ist eine Notiz, keine Entscheidung. Das Format ist
verbindlich: `Status | Datum | Kontext | Entscheidung | Konsequenzen |
Alternativen` (siehe [`../adr/ADR_TEMPLATE.md`](../adr/ADR_TEMPLATE.md)).

**Anforderungs-IDs mitführen.** Jede Vertragsregel verweist auf die
Anforderung, die sie absichert, aus [`../REQUIREMENTS.md`](../../REQUIREMENTS.md)
(`GAME-*`, `MEDIA-*`, `LOBBY-*`, `CAT-*`). Eine neue Vertragsregel ohne
Anforderungs-Referenz braucht entweder eine neue Anforderung oder eine
Begründung, warum keine nötig ist.

**Zahlen nicht im Vertrag einfrieren.** Zahlen des Spiels stehen in
`PHOMU_CONFIG` (`src/config/game-config.ts`). Ein Vertrag zitiert sie mit
Fundstelle, es erfindet sie nicht.

---

## Wie der Vertrag geprüft wird

Jeder Vertrag nennt am Ende seine eigenen Prüfungen. Für
[`GAME-CONTRACT.md`](GAME-CONTRACT.md) sind das in § 10 gelistet; die
wichtigsten sind:

```bash
# Persistenz: der Song darf nicht in localStorage liegen
grep -n "partialize" -A 18 src/stores/game-store.ts

# Phase 'locked-in' darf nie betreten werden
grep -rn "advancePhase(" src

# Keine verbotene Abhängigkeit aus src/components/
grep -rn "from '@/app\|from '@/admin-api\|from '@/data" src/components/

# Doku-Links auflösbar
npm run check:doc-links
```

---

## Beziehung zu den anderen Dokumenten

```text
PROJECT_MANAGEMENT.md / ROADMAP.md     ← Was wird wann erreicht
        │
REQUIREMENTS.md                        ← Was das Produkt tun MUSS (mit IDs)
        │
ARCHITECTURE.md                        ← Wohin Code darf (Schichten, Richtung)
        │
docs/design/GAME-CONTRACT.md           ← WIE der Spielablauf sich verhält
        │
docs/adr/*.md                          ← WARUM eine Grenze so und nicht anders
        │
docs/acceptance/*.md                   ← OB die Umsetzung stimmt (mit Beleg)
```

Ein Widerspruch zwischen zwei Ebenen wird nicht stillschweigend geglättet,
sondern als **Befund** gemeldet: an den Owner, mit Datei:Zeile.

---

## Zugehörige Dokumente

| Dokument | Inhalt |
|---|---|
| [`../README.md`](../README.md) | Index der gesamten Dokumentation |
| [`../DOCUMENTATION_POLICY.md`](../DOCUMENTATION_POLICY.md) | Same-Change-Regel, Single Source of Truth, Sprachregel |
| [`../adr/`](../adr/) | Architekturentscheidungen |
| [`../cr/`](../cr/) | Change Requests für materielle Verhaltensänderungen |
| [`../acceptance/`](../acceptance/) | Abnahmenachweise je Meilenstein |
