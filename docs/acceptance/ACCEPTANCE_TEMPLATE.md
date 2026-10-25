# Abnahme — FEATURE / MEILENSTEIN

**Anforderungs-IDs:**
**Build / Commit:**
**Testende Rollen:**
**Datum:**
**Umgebung:** (Node-Version, npm-Version, Betriebssystem, Browser)

> **Evidenzregel — bindend.**
>
> Jede Aussage in diesem Dokument braucht eine **konkrete Evidenz**:
>
> - ein **Testname** (der Test wird zitiert, nicht „Unit-Tests" gesagt),
> - eine **Kommando-Ausgabe** (Kommando + Exit-Code + die entscheidende Zeile),
> - oder eine **Datei:Zeile**-Angabe im Repository.
>
> Ein „implemented", „grün", „erledigt" ohne Beleg ist **kein** gültiges
> Ergebnis. Was nicht gemessen wurde, wird als **NOT RUN** mit Begründung
> eingetragen — nie als bestanden. Stubs, Mock-Simulationen und
> Dummy-Rückgaben zählen nicht als Nachweis (`NFR-008`).
>
> **Bestehensbedingung:** Ein Meilenstein ist erst abgenommen, wenn **alle**
> Gates dieses Abschnitts erfüllt sind. Teilabnahmen sind möglich, sie werden
> aber als solche benannt.

---

## 1. Funktional

Jede Verhaltensregel, die dieser Meilenstein berührt.

| Szenario | Erwartet | Ergebnis | Evidenz |
|---|---|---|---|
| | | | |

**Regel:** Ein Szenario ohne beobachtbares Ergebnis ist kein Szenario. Ein
Szenario, dessen Ergebnis „geht" lautet, ist nicht geprüft.

---

## 2. Technik

- Architekturgrenzen eingehalten: ja / nein / teilweise — Beleg:
- Zentrale Konfiguration eingehalten (`src/config/game-config.ts`): ja / nein — Beleg:
- Tests grün: ja / nein / teilweise — Beleg:
- Migration / Versionierung geprüft: ja / nein / nicht zutreffend — Beleg:
- Typprüfung: ja / nein — Beleg:
- Lint: ja / nein — Beleg:
- Dateigrößen-Gate: ja / nein / **NOT RUN** — Beleg:
- Neue Gates vorhanden und ausführbar: … — Beleg:

---

## 3. Performance

| Metrik | Budget | Gemessen | Ergebnis |
|---|---:|---:|---|
| | | | |

**Referenzhardware / Eingabe:**
**Methode:** (welches Kommando, welcher Lauf, wie viele Läufe)

> Ein Budget ohne Messwert ist eine Absichtserklärung, kein Ergebnis. Wenn ein
> Budget nicht definiert ist, steht hier **„Budget nicht definiert"** — nicht
> eine geschätzte Zahl.

---

## 4. Usability

- Anzahl Schritte für die Hauptaufgabe:
- Auffindbarkeit (was ist sichtbar, was nicht):
- Verhalten auf Mobil / nativ:
- Touch-Ziele, Fokusreihenfolge, Kontrast:
- Screenreader (VoiceOver / TalkBack):
- Visuelle Feinheiten / offene Mängel:
- **NOT RUN**-Punkte mit Begründung:

---

## 5. Security-Privacy

- Neue gespeicherte Daten:
- Netzzugriff (ausgehend / eingehend):
- Negative Tests (welche, mit Testname):
- Bedrohungsnotizen:
- Was **nicht** geprüft wurde:

---

## 6. Interoperabilität

- Wiederöffnen / Rücklesen der Daten:
- Fremde Viewer / Editoren / Geräte:
- Roundtrip (Schreiben → Lesen → Schreiben):
- Integrität von Speichern und Wiederherstellung:
- Formate, Versionen, Fremdsysteme:

---

## 7. Known limitations

Jede bekannte Einschränkung, die den Nutzer oder den Betreiber betrifft —
hier und nicht nur im Kleingedruckten.

| ID | Einschränkung | Wirkung | Wo nachverfolgt |
|---|---|---|---|
| | | | |

---

## 8. Entscheidung

**angenommen / abgelehnt / angenommen mit dokumentierter Einschränkung**

Begründung, Auflagen, offene Punkte mit Owner und Datum. Was nach der
Entscheidung passiert (Folge-Ticket, nächster Meilenstein, Anforderungs-IDs).
