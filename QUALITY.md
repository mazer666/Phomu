# Phomu Qualitäts- und Abnahmemodell

Eine Phomu-Funktion ist nicht „fertig", weil der Happy Path einmal funktioniert hat.

Jede wesentliche Funktion wird über **acht Dimensionen** abgenommen. Das Modell ist
an das Vocument-Haus angelehnt, aber an die Realität einer Web-App angepasst: es gibt
keine native Bridge, dafür aber Browser-Autoplay, Client-Zustand und eine Admin-API.

---

## 1. Funktionale Abnahme

Fragen:

- Tut die Funktion, was die Anforderung sagt?
- Sind Preset-, Optional- und Later-Verhalten korrekt?
- Sind die Randfälle definiert? (leerer Katalog, leere Spielerliste, abgebrochene
  Runde, Timeout, einzelnes Gerät als Spielertreiber)
- Stimmt die Punktevergabe? Stimmt die Gewinnbedingung?
- Bleibt der Anti-Spoiler-Schutz in **jeder** Phase intakt?

Evidenz:

- Abnahmeszenarien
- automatisierte Tests (Vitest, Playwright)
- manuelle Testnotizen, wo Automatisierung untauglich ist

Belege, die **nicht** zählen:

- „Der Button ist da"
- ein Screenshot ohne beschriebenen Ablauf
- ein Test, der die Funktion nachahmt statt sie auszuführen

---

## 2. Technische Abnahme

Fragen:

- Werden die Modulgrenzen aus [`ARCHITECTURE.md`](ARCHITECTURE.md) eingehalten?
- Steht jede Konstante an genau einer Stelle (`src/config/`)?
- Ist TypeScript strict eingehalten — ohne `any`, ohne `@ts-ignore`?
- Ist jede neue Datei kürzer als 400 Zeilen (hart: 550)?
- Ist die Funktion echt implementiert und nicht simuliert (`QA-003`)?
- Bleiben die generierten Bindungen generiert (hier: die Bindings sind Next.js —
  es gilt: keine handgepflegten Kopien von Bibliothekscode)?
- Bleibt der Zustand nach einem Reload korrekt — und bleibt er **nicht** korrekt,
  wo er das nicht sein darf (Anti-Spoiler-Zustand)?

Evidenz:

- Architekturprüfung
- Tests, die die echten Abläufe ausführen
- Statische Analyse (`npm run typecheck`, `npm run lint`)
- Ausgabe der Gates (`npm run check:i18n`, `npm run check:doc-links`, `npm run check:file-size`)

---

## 3. Performance-Abnahme

Fragen:

- Ist der Start der App innerhalb des Budgets?
- Ist der Übergang zwischen den Rundenphasen spürbar schnell?
- Bleibt die Oberfläche bei 24 Spielern und einem großen Katalog responsiv?
- Bleibt der Speicherbedarf begrenzt (Bilder, Audio, Katalog im Bundle)?
- Werden große Datenmengen (Katalog, Cover) nicht ungeprüft in den Client geladen?

Evidenz:

- reproduzierbare Messung
- Referenzgerät und Bezugsmenge
- das Ergebnis wird mit dem Meilenstein abgelegt

**Niemals „schnell" ohne Messung schreiben.** Ohne Messung steht dort „nicht gemessen".

---

## 4. Usability-Abnahme

Fragen:

- Findet ein neuer Spieler den Common Path ohne Tutorial?
- Ist der Standard ruhig und nicht überladen?
- Ist die Rolle des Gerätetreibers (Pilot) klar?
- Ist der Weg aus jeder Sackgasse sichtbar (Abbrechen, Zurück, Spielende)?
- Sind die Spielmodi unterscheidbar, ohne die Anleitung zu lesen?
- Funktioniert die Bedienung auf einem Telefon, nicht nur auf einem Desktop?

Evidenz:

- Aufgaben-Durchlauf mit Schrittzahl
- visuelle Prüfung in allen vier Themes
- Prüfung auf 360 / 768 / 1920 px Breite
- Barrierefreiheitsprüfung (Kontrast, Fokus, Bewegung, Screenreader-Namen)

---

## 5. Security-/Privacy-Abnahme

Fragen:

- Erzeugt die Funktion neue Netzwerkzugriffe?
- Legt die Funktion neue Nutzerdaten an — und wo bleiben sie?
- Sind die Admin-Endpunkte geschützt, mit **harten** Grenzwerten und ohne
  „fail open"?
- Werden Eingaben und externe URLs geprüft?
- Werden Geheimnisse niemals in den Client, in ein Log oder in einen Commit geschrieben?
- Ist die Datenspur beschrieben, inklusive der Angabe, wie man sie löscht?

Evidenz:

- **negative Tests**, die den Angriff ausführen (fehlender/falscher Token,
  manipulierte URL, zu große Datei, Rate-Limit überschritten)
- das Bedrohungsmodell in [`SECURITY.md`](SECURITY.md)
- die Datenschutzseite [`PRIVACY.md`](PRIVACY.md)

---

## 6. Internationalisierungs-Abnahme

Fragen:

- Ist jeder sichtbare Text aus der Übersetzung bezogen?
- Sind `de.json` und `en.json` vollständig parallel?
- Sind die englischen Werte **echte** englische Texte?
- Werden Zahlen und Daten in der aktiven Sprache formatiert?
- Sind Pluralformen in beiden Sprachen vorhanden?

Evidenz:

- `npm run check:i18n` (grün)
- der Negativtest des Gates: ein absichtlich gelöschter Schlüssel macht es rot

---

## 7. Interoperabilitäts-Abnahme

Fragen:

- Funktioniert die Seite ohne Cookies, ohne Konto, ohne Cloud?
- Funktionieren die externen Medienquellen (YouTube, Spotify, Amazon, Apple) mit
  defekten oder gesperrten Links — mit Rückfall auf die nächste Quelle?
- Funktioniert das Drucklayout mit dem Referenzdrucker und in der Referenzauflösung?
- Funktioniert die QR-Karte außerhalb der eigenen App (als gedrucktes Medium)?

Evidenz:

- Test mit deaktiviertem Drittanbieter
- dokumentierter Rückfallpfad je Modus
- Testdruckbogen

---

## 8. Dokumentations-Abnahme

Fragen:

- Ist die Anforderung in [`REQUIREMENTS.md`](REQUIREMENTS.md) mit ID, Begründung,
  Akzeptanz und Verifikation erfasst?
- Ist die Doku im selben Commit aktualisiert worden?
- Stimmen die Zahlen in der Doku mit dem Code überein?
- Löst jeder relative Link auf?

Evidenz:

- `npm run check:doc-links` (grün)
- der Diff der Doku im selben Commit

---

## 9. Die Abnahmeentscheidung

Am Ende steht genau eine Entscheidung, mit Begründung:

| Entscheidung | Bedeutung |
|---|---|
| `ACCEPTED` | Alle Gates der Dimensionen 1–8 sind erfüllt und belegt |
| `ACCEPTED WITH LIMITS` | erfüllt, aber mit benannten, akzeptierten Grenzen |
| `NOT ACCEPTED` | mindestens ein Gate nicht erfüllt — mit Begründung und offener Lücke |

Eine Entscheidung ohne Beleg ist keine Entscheidung.

---

## 10. Die harten Grenzen

Diese Regeln sind nicht verhandelbar:

1. **Keine Abnahme auf Basis von Stubs, Mock-Simulationen oder Dummy-Rückgabewerten.**
   (`QA-003`, Vocument CR-0002.) Eine Funktion, die nur so tut, als existierte sie,
   ist nicht abgenommen — sie ist nicht implementiert.
2. **Keine abgeschwächten Abnahmekriterien.** Was nicht erfüllbar ist, wird als
   „nicht erfüllt" mit Begründung dokumentiert, nicht wegkürzer.
3. **Kein `skip`, kein `@Ignore`, kein auskommentierter Test**, um ein Gate grün zu
   machen.
4. **Keine erfundenen Zahlen.** Eine Testanzahl ohne Testlauf, ein Messwert ohne
   Kommando, ein Kontrastwert ohne Rechnung — alles ungültig.
5. **Ein unvollständiger Bericht ist ein Fehler**, nicht ein Teilerfolg. Wenn ein
   Teil der Prüfung nicht stattfinden konnte, ist das Ergebnis „nicht abgenommen".
6. **Ein grünes Gate beweist nur das, was es prüft.** Jedes Gate hat seinen
   Negativtest.
