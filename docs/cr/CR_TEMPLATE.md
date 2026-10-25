# CR-XXXX — Titel der Änderung

**Status:** proposed | approved | rejected | implemented
**Datum:** YYYY-MM-DD
**Auslöser:** Wer hat die Änderung angestoßen, und wodurch? (Befund, Anfrage, Audit, Fehlerbild)
**Vorgeschlagen von:** Rolle(n) laut `AGENTS.md` (z. B. ROLE-01)
**Geprüft von:** Rolle(n) laut `AGENTS.md`
**Entscheidung:** offen | angenommen | abgelehnt — mit Datum und Entscheidungsträger

---

## 1. Problem

Was ist falsch oder fehlt? Beschreibe den **beobachteten Zustand**, nicht die
Absicht. Belege jede Aussage mit Testname, Kommando-Ausgabe oder Datei:Zeile.
Ohne Beleg ist dieser Abschnitt ein Wunsch, kein Change Request.

## 2. Beantragte Änderung

Was genau wird geändert? Nenne Dateien, Verzeichnisse und Schritte. Eine
Änderung, die sich nicht in einem Diff ausdrücken lässt, ist keine Änderung.

## 3. Begründung

Warum ist diese Änderung die richtige? Welche Anforderung, welches Risiko
oder welcher Grundsatz spricht dafür? Verweise auf Anforderungs-IDs.

## 4. Betroffene Anforderungen

| ID | Auswirkung |
|---|---|
| `DOMÄNE-NNN` | neu / geändert / unverändert, mit einem Satz |

Wenn keine Anforderung betroffen ist, schreibe das ausdrücklich hin. Ein
Change Request ohne Anforderungsbezug ist in diesem Projekt unzulässig.

## 5. Betroffene Architektur

Welche Schichten, Module oder Abhängigkeitsrichtungen werden berührt?
Nennt die geänderten Pfade in `src/`.

## 6. Betroffene Plattformen

Web, mobile, Deployment, CI — was ist betroffen und was nicht?

## 7. Auswirkung auf die Meilensteine

Welche Meilensteine aus `ROADMAP.md` werden erweitert, verschoben, geteilt
oder neu bewertet? Eine stillschweigende Verschiebung ist verboten.

## 8. Auswirkung auf Abnahme und Tests

Welche Abnahmekriterien ändern sich, welche kommen hinzu? Welche Gates kommen
hinzu? Welche Tests müssen neu oder negativ geschrieben werden?

## 9. Risiken

| Risiko | Eintrittswahrscheinlichkeit | Auswirkung | Gegenmaßnahme | Owner |
|---|---|---|---|---|

## 10. Rücknahme

Wie wird die Änderung zurückgenommen? Konkrete Schritte, keine Prinzipien.

## 11. Entscheidung

Entschieden am YYYY-MM-DD von <Rolle/Person>: **angenommen | abgelehnt |
angenommen mit Auflagen**. Begründung, Auflagen, und was als Folge passiert
(Ticket, Meilenstein, Anforderungs-IDs).
