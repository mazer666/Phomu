# Druck-Guide — eigene Phomu-Karten

Phomu-Karten sind **59 × 91 mm** groß (Standard-Kartenformat) mit **3 mm Beschnitt**
rundum. Auf der Rückseite steht ein QR-Code, mit dem die Karte in der Lobby
eingescannt wird.

**Was heute existiert:** die Kartenmaße, die QR-Inhalte, die der Scanner versteht —
und ein Dokument. **Was noch nicht existiert:** ein Export-Werkzeug in der App, das
fertige Kartenvorlagen erzeugt. Wer Karten drucken will, erzeugt die Grafik heute
selbst nach den Vorgaben unten.

---

## 1. Das Format

| Angabe | Wert |
|---|---|
| Endgröße (Trim) | **59 × 91 mm** |
| Beschnitt (Bleed) | **3 mm** rundum |
| Gesamtfläche mit Beschnitt | **65 × 97 mm** |
| Sicherheitsabstand (Safe Area) | mindestens **3 mm** vom Rand |
| Karten je Set | höchstens **110** |

Die Werte stehen in `src/config/game-config.ts`:

```ts
CARD_WIDTH_MM: 59,
CARD_HEIGHT_MM: 91,
CARD_BLEED_MM: 3,
MAX_CARDS_PER_SET: 110,
```

**Beschnitt** heißt: Die Grafik muss auf 65 × 97 mm angelegt werden. Die äußeren
3 mm werden beim Schneiden weggeschnitten. Das ist der Puffer, damit der Drucker
nicht genau an der Kante schneidet — ohne Beschnitt entstehen weiße Ränder.

**Sicherheitsabstand** heißt: Alles, was wichtig ist (Text, QR-Code), muss mindestens
3 mm innerhalb der Schnittkante liegen. Sonst wird es angeschnitten.

---

## 2. Auflösung (DPI)

Für den Druck gilt **300 dpi**. Das ist die Auflösung, bei der Text scharf bleibt
und ein QR-Code zuverlässig scanbar ist.

Rechnung: 1 mm entspricht bei 300 dpi rund **11,81 Pixeln** (300 / 25,4).

| Fläche | Größe | Pixel bei 300 dpi |
|---|---|---|
| Endgröße | 59 × 91 mm | **697 × 1075 px** |
| Mit Beschnitt | 65 × 97 mm | **768 × 1146 px** |

**Empfehlung:** Lege die Datei in **1146 × 768 px** an (also mit Beschnitt) und
setze eine Schnittmarke bei 59 × 91 mm. Damit passt sie auf eine 300-dpi-Druckdatei.

**Nicht unter 300 dpi.** 150 dpi (halbe Auflösung) liefert 349 × 537 px — das sieht
am Bildschirm noch brauchbar aus, aber der QR-Code wird beim Druck unzuverlässig.
Der QR-Code braucht außerdem einen **Mindestkontrast**: schwarz auf weiß, nicht
hellgrau auf hellgrau.

---

## 3. Was auf die Karte gehört

Vorschlag für das Kartenlayout — die Vorgaben stammen aus dem, was die App
tatsächlich verarbeiten kann:

| Element | Inhalt |
|---|---|
| **Titel** | Der Songtitel, groß. |
| **Interpret** | Der Name des Interpreten. |
| **Cover** | Das Albumcover, wenn vorhanden. Im Browse-Bereich gibt es eine Admin-Sicht mit Cover-Suche über iTunes und Deezer. |
| **QR-Code** | Auf der **Rückseite** (siehe Abschnitt 4). |
| **Pack** | Welches Pack die Karte gehört — als Text, damit man sie auch ohne Kamera zuordnen kann. |
| **Modus-Hinweis** | Optional: ein Stichwort zum Spielmodus, z. B. „Timeline" oder „Cover Confusion". |

Der Cover-Abruf über die Admin-Oberfläche (`/Phomu/admin/review` beziehungsweise
`/Phomu/admin/songs`) ist der gangbare Weg, an Albumcover zu kommen — die
Coverbilder liegen danach in `public/covers/`.

---

## 4. Welcher QR-Code auf die Karte kommt

Der Scanner in der Lobby versteht genau drei Formate. Alles andere wird
abgelehnt.

| QR-Inhalt | Wirkung beim Scannen | Geeignet für die Kartenrückseite? |
|---|---|---|
| `@Anna` | Legt „Anna" als Spieler in der Lobby an. | nein — gehören auf **Beitrittskarten**, nicht auf die Songkarte |
| `…?pack=Rock Anthems` | Wählt das Pack „Rock Anthems" in der Lobby aus. | **ja** — so kennzeichnet man ein Pack |
| `…?session=123456` | Wird erkannt, aber noch nicht ausgeführt: eine Sitzung läuft heute nur auf einem Gerät. | nein |
| `…?id=<Song-ID>` | Wird ausdrücklich **nicht** unterstützt (`unsupported-song-link`). | **nein** |

**Konsequenz für die Gestaltung:** Ein QR-Code, der den Song direkt öffnen soll,
funktioniert heute **nicht**. Der Scanner kann den Song nicht starten. Auf der
Songkarte trägt der QR-Code deshalb den **Pack-Kontext** (`?pack=…`), und der
Song selbst steht als Text auf der Karte.

Der Basis-Pfad der Anwendung muss in der Adresse enthalten sein: Die App wird
unter `…/Phomu` ausgeliefert. Ein Link auf `…/play?id=…` gibt es nicht — diese
Route existiert nicht, und der Parameter `id` wird vom Scanner als nicht
unterstützt eingestuft.

Der Pack-Key im QR-Code muss **exakt** dem Key aus `PHOMU_CONFIG.SONG_PACKS`
entsprechen (zum Beispiel `Rock Anthems`, nicht `rock-anthem`). Ein unbekannter
Key wird in der Lobby mit „Pack nicht gefunden" abgelehnt. Alte Kurzformen wie
`global-hits` werden zwar per Alias abgebildet, für neue Karten sollte aber der
aktuelle Key verwendet werden.

---

## 5. Drucken

### Variante A — Professionell

1. Kartengrafiken mit Beschnitt als **PNG** (300 dpi, 1146 × 768 px) exportieren.
2. Beim Druckdienstleister angeben: Endformat 59 × 91 mm, Beschnitt 3 mm, umlaufend,
   **kein** Beschnitt vom Dienstleister ergänzen lassen (sonst doppelt).
3. Auf **mindestens 300 g/m²** Karton drucken. Dünneres Papier saugt die Farbe und
   der QR-Code verliert an Kontrast.
4. Nach dem Schneiden die Karten **laminieren** oder in Sleeves stecken. Das
   schützt vor Fingerabrieb am QR-Code.

### Variante B — Zu Hause

1. Einen **Bogen** im Format A4 drucken, nicht einzelne Karten. Der Drucker
   kann 59 × 91 mm meist nicht randlos.
2. Die Grafiken gleichmäßig auf dem Bogen platzieren, mit **3 mm** Beschnitt
   angedruckt — der dient als Schnittmarke.
3. Auf 300-g/m²-Karton drucken. Auf Normalpapier funktioniert der QR-Code
   zwar, ist aber deutlich empfindlicher gegen Falten und Feuchtigkeit.
4. Entlang der Marken schneiden. Ein guillotine Cutter oder eine **Schneidematte**
   mit einem festen Kartenraster spart Ärger.

---

## 6. Der Testausdruck — nicht überspringen

**Immer zuerst ein einzelnes Blatt drucken**, bevor 110 Karten in Auftrag gehen.
Der Test kostet eine Minute und spart 110 schlechte Karten.

### Checkliste für den Testbogen

| # | Prüfung | Erwartetes Ergebnis |
|---|---|---|
| 1 | **QR-Code scannen** | Die Kamera des Handys erkennt den Code **sofort**, ohne zoomen zu müssen. |
| 2 | **In der Lobby scannen** | Der Code wird gescannt und die erwartete Wirkung tritt ein (z. B. das Pack wird ausgewählt). |
| 3 | **Kontast** | Der QR-Code ist klar schwarz auf weiß, ohne graue Ränder. |
| 4 | **Schneidkante** | Nach dem Schneiden umschließt der Beschnitt das Motiv vollständig — kein weißer Rand. |
| 5 | **Sicherheitsabstand** | Text und QR-Code liegen mindestens 3 mm von der Schnittkante entfernt, nichts ist angeschnitten. |
| 6 | **Farbe** | Cover und Text wirken kräftig, nicht blass. |
| 7 | **Material** | Der QR-Code ist nicht verwischt und lässt sich mit dem Daumen nicht wegwischen. |
| 8 | **Größe** | Ein Testkarte passt in eine Standard-Kartenhülle (59 × 91 mm). |

**Test 2 ist der wichtigste.** Ein QR-Code, den die Handykamera schön scharf
zeigt, kann trotzdem an der App scheitern — wenn er ein Format enthält, das die
Anwendung nicht unterstützt.

---

## 7. Checkliste für den Druckauftrag

- [ ] Endgröße 59 × 91 mm, Beschnitt 3 mm umlaufend
- [ ] 300 dpi, PNG (verlustfrei)
- [ ] Farbmodus CMYK, wenn der Dienstleister danach fragt
- [ ] Karton mindestens 300 g/m²
- [ ] QR-Code schwarz auf weiß, kein Graustufen-Logo
- [ ] Keine Texte im Beschnittbereich
- [ ] Testbogen geprüft (Abschnitt 6)

---

## 8. Weiterführend

- Wie die Kamera in der Lobby benutzt wird:
  [Nutzer-Guide, Abschnitt 5](../user-guide/USER-GUIDE.de.md) ·
  [User guide, section 5](../user-guide/USER-GUIDE.en.md)
- Wenn der Scanner nichts findet:
  [Fehlerbehebung](TROUBLESHOOTING.md)
- Wo die Kartenmaße im Code stehen: `src/config/game-config.ts`
- Wo die QR-Inhalte ausgewertet werden: `src/utils/qr-intent.ts`
