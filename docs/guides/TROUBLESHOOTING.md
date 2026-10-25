# Fehlerbehebung für Spielerinnen und Spieler

Die Probleme, die beim Spielen wirklich auftreten — und was in jedem Fall zu tun
ist. Kein Fall von „das ist halt so".

**Kurzfassung:** Der häufigste Fall ist ein **404** (Adresse ohne `/Phomu`), der
zweithäufigste ein **blockierter Ton**. Beide stehen ganz unten.

---

## 1. Der Ton bleibt stumm

**Symptom:** Die Karte wird gezogen, der Countdown läuft, aber es ist nichts zu
hören. Der Punktestand funktioniert, das Spiel läuft.

**Ursache:** Browser starten Audiowiedergabe nur nach einer Nutzergeste. Die App
zählt drei Sekunden vor, damit der Ton freigegeben wird — reicht das nicht, muss
einmal geklickt werden.

**Lösung, in dieser Reihenfolge:**

1. **Lautstärke prüfen.** Unter *Einstellungen → Audio & Provider* stehen die
   Schalter „Hintergrundmusik" und „Soundeffekte". Beide müssen auf „an" stehen.
   Beide Regler sind **unabhängig** voneinander — es kann sein, dass die Musik aus
   ist, die Effekte aber an.
2. **Einmal klicken.** Ein beliebiger Klick auf die Seite genügt. Danach läuft der
   Ton.
3. **Autoplay erlauben.** In Chrome und Safari über das Symbol neben der
   Adresszeile → „Website-Einstellungen" → „Automatische Wiedergabe" erlauben.
   In Firefox: `about:config` → `media.autoplay.default` → `0`.
4. **System-Mixer prüfen.** Läuft gerade ein Video im Vollbild, ein anderer Tab
   mit Ton, oder ist ein Bluetooth-Headset verbunden? Der Browser mischt mit dem
   System-Mixer — das Gerät kann stummgeschaltet sein, während die App korrekt
   spielt.
5. **Auf YouTube wechseln.** Unter *Audio & Provider* ist **YouTube** die
   Voreinstellung und braucht kein Konto. **Spotify Free** und **Amazon Music**
   spielen nur eine 30-Sekunden-Vorschau; die ist regional nicht überall
   verfügbar. Wer dort nichts hört, hat kein Geräteproblem, sondern eine
   fehlende Vorschau.
6. **Den Song überspringen.** Ist das Video regional gesperrt oder fehlerhaft, gibt
   es im Spiel den Knopf **🎲 Video kaputt? Neu würfeln**. Es wird ein anderer Song
   gezogen, der Rundenzähler läuft normal weiter.
7. **Provider-Modus prüfen.** Unter *Audio & Provider* gibt es „YouTube Player
   Modus" mit **Standard** und **Music**. „Music" ist die YouTube-Music-Variante
   und liefert je nach Region ein anderes Ergebnis. Im Zweifel auf **Standard**
   stellen.

---

## 2. Die Kamera findet keinen Code

**Symptom:** Der Scanner öffnet sich, aber der Code wird nicht erkannt. Oder das
Scanner-Bild bleibt schwarz.

**Ursache und Lösung:**

| Ursache | Was zu tun ist |
|---|---|
| Die Kameraerlaubnis fehlt | In den Browser-Einstellungen die Kamera für diese Seite erlauben. Das Symbol neben der Adresszeile öffnet die Einstellungen. Danach den Scanner neu öffnen. |
| Es gibt keine Kamera / sie ist belegt | Andere Anwendung schließen, die die Kamera nutzt (Video-Call, Kamera-App). |
| Der Code ist zu klein oder zu weit weg | Die Karte näher heranhalten und den QR-Code in den Rahmen in der Bildmitte bringen. |
| Der Code ist spiegelverkehrt oder zu schief | Die Karte gerade halten. |
| Der Code ist zu dunkel | Besseres Licht. Nachts reicht die Bildschirmhelligkeit oft nicht. |
| Der Code ist **abgedeckt** (etwa durch einen Aufkleber) | Der QR-Code muss vollständig frei liegen. |
| Der Code zeigt auf eine nicht unterstützte Adresse | Siehe unten. |

**Wichtiger Hinweis zu den QR-Inhalten:** Der Scanner versteht drei Formate:

- `@Anna` — legt einen Spieler an,
- `…?pack=Rock Anthems` — wählt ein Pack aus,
- `…?session=123456` — wird erkannt, aber noch nicht ausgeführt.

Ein Code der Form `…?id=<Song-ID>` wird **nicht** unterstützt. Wird eine solche
Karte gescannt, passiert sichtbar nichts — das ist kein Defekt der Kamera, sondern
eine noch nicht umgesetzte Funktion.

**Wenn gar nichts hilft:** Der Spielername steht als Text auf der Karte. Trage ihn
in Schritt 1 der Lobby von Hand ein. Für den Pack gilt dasselbe: in Schritt 3
auswählen.

---

## 3. Die Sitzung ist verloren

**Symptom:** Nach einem Neuladen (oder einem Tab-Wechsel auf dem Handy) ist die
Lobby leer oder der Spielstand steht am Anfang.

**Was tatsächlich erhalten bleibt:** Alles, was in der Lobby eingestellt wurde —
Spieler, Teams, Modi, Packs, Endbedingung, Audio- und Designwahl. Das liegt im
Speicher des Browsers und wird beim Neuladen wiederhergestellt. Auch der
Gesamt-XP bleibt.

**Was verloren geht:** Der **laufende Spielstand**: die bereits vergebenen Punkte
der aktuellen Runde und die Reihenfolge der Züge.

**Lösung:**

| Ich will … | Dann … |
|---|---|
| mit derselben Lobby weiterspielen | einfach in der Lobby auf **🚀 JETZT STARTEN!** tippen — die Einstellungen stehen noch |
| nur die Punkte zurücksetzen | nach dem Spiel **Nochmal spielen** wählen: die Lobby bleibt, nur die Punkte gehen auf null |
| alles zurücksetzen | in der Lobby auf **Reset ↺** tippen. Achtung: Das löscht auch Spieler, Teams und alle Einstellungen. |
| den XP zurücksetzen | *Einstellungen → Legal & Konto* → „Gefahrzone" → **XP zurücksetzen** |

**Wenn die Lobby beim Neuladen leer ist:** Dann wurde entweder ein anderer Browser
oder ein privates Fenster benutzt, oder die Browserdaten wurden gelöscht. Der
Spielstand liegt ausschließlich lokal — es gibt keine Serverkopie, und das ist
Absicht: Phomu ist ein Zero-Telemetrie-Projekt.

---

## 4. Ein Cover fehlt oder passt nicht

**Symptom:** In der Bibliothek (`Browse`) ist ein Bild leer, zeigt einen Platzhalter
oder passt nicht zum Song.

**Lösung:**

1. **Leeres Cover:** Der Song hat in den Daten keine Bild-URL. Das Spiel funktioniert
   trotzdem — der Cover-Abruf ist nur für die Karten nötig.
2. **Falsches Cover:** Im Browse-Bereich oben auf **🔓 Admin an** schalten, den
   Song über **Bearbeiten** öffnen und im Cover-Tab ein passendes Bild wählen.
   Gesucht werden kann über iTunes und Deezer.
3. **Alle Cover neu holen:** Über die Admin-Oberfläche unter `/Phomu/admin/review`
   (Delta-Export: nur die geänderten Songs) oder `/Phomu/admin/songs`
   (Vollexport eines Packs).
4. **Änderungen merken:** Änderungen im Admin-Modus bleiben nur in diesem Browser.
   Erst der Export macht sie dauerhaft.

**Für gedruckte Karten:** Siehe den
[Druck-Guide](PRINTING-GUIDE.md) — dort steht, welche Auflösung und welches
Material nötig sind, damit ein QR-Code zuverlässig scanbar bleibt.

---

## 5. Ein Song fehlt im Katalog

**Symptom:** Ein bestimmter Song erscheint in der Bibliothek nicht, oder er wird
im Spiel nie gezogen.

**Lösung, in dieser Reihenfolge:**

1. **Filter zurücksetzen.** In der Bibliothek auf **ALLES ZURÜCKSETZEN ↺** tippen.
   Jeder gesetzte Filter blendet Songs aus: Jahrzehnt, Stimmung, Genre,
   Schwierigkeit, „QR-Kompatibel", „One-Hit Wonders" und „Mit Songtexten".
2. **Pack prüfen.** Der Zieher sucht **ausschließlich** in den in Schritt 3 der
   Lobby ausgewählten Packs. Öffne Schritt 3 und wähle das Pack aus, in dem der
   Song liegt.
3. **Modus prüfen.** Jeder Song nennt die Modi, die er unterstützt. Ein Song ohne
   eingetragenen Songtext wird im **Lyrics Labyrinth** nicht gezogen — dort greift
   der Bonus-Modus, in dem der Song laut genannt wird.
4. **Schwierigkeit und QR-Filter.** Beide werden ignoriert, wenn sie zu nichts
   führen — es sei denn, der Modus „Lyrics" verlangt zwingend einen Song mit
   Songtext.
5. **Schon gespielt?** Bereits gespielte Songs werden bevorzugt vermieden. Wenn
   alle Songs des Packs schon liefen, wird wieder einer davon gezogen — dann aber
   aus den zuletzt gespielten.
6. **Der Song fehlt wirklich?** Dann ist er nicht im Katalog. Unter
   `/Phomu/admin/review` lässt sich prüfen, ob ein Eintrag existiert, und unter
   `/Phomu/admin/songs` kann er angelegt werden.

**Zusatzhinweis:** Wenn in der Lobby **„Keine Songs verfügbar. Bitte prüfe dein
Song-Pack."** steht, passt die Auswahl der Packs nicht zum Katalog. Das kommt vor,
wenn eine alte Pack-Kennung aus einer früheren Version gespeichert ist. Abhilfe:
in Schritt 3 alle Packs ab- und wieder anwählen, oder in der Lobby **Reset ↺**
tippen.

---

## 6. Die Seite zeigt „404"

**Symptom:** Nach dem Öffnen der Adresse erscheint eine Fehlerseite.

**Ursache:** Die Adresse stimmt nicht. Phomu wird mit einem Basis-Pfad ausgeliefert.

| Richtig | Falsch |
|---|---|
| `…/Phomu` | `…/` |
| `…/Phomu/lobby` | `…/lobby` |
| `…/Phomu/browse` | `…/browse` |
| `…/Phomu/projector` | `…/projector` |

**Hinweis:** Der Knopf **📺 Projector-Modus öffnen** im Spielmenü öffnet die
Adresse derzeit **ohne** den Basis-Pfad und landet deshalb auf einer Fehlerseite.
Für den Beamer die Adresse bitte von Hand aufrufen.

---

## 7. Das Spiel startet nicht

| Symptom | Ursache und Lösung |
|---|---|
| „Bitte wählen..." statt „Weiter" | In Schritt 1 fehlt ein Spieler, in Schritt 2 ein Modus oder in Schritt 3 ein Pack. |
| Der Knopf „JETZT STARTEN!" fehlt | Es ist noch kein Spieler angelegt. Der Knopf erscheint in Schritt 6. |
| Das Spiel springt sofort zur Lobby | Es läuft keine Partie. Die Seite `/Phomu/game` leitet ohne laufendes Spiel zur Lobby um. |
| Der Song bleibt hängen | Der Zieher fand nichts Passendes. Siehe Abschnitt 5. |
| „🎲 Video kaputt? Neu würfeln" hilft nicht | Dann ist der Fehler nicht am Video, sondern an der Internetverbindung. YouTube-Videos brauchen Verbindung. |

---

## 8. Wenn gar nichts hilft

1. **Seite neu laden.** Manchmal genügt das — der Zustand wird korrekt
   wiederhergestellt.
2. **Anderen Browser probieren.** Der Spielstand liegt im Browser-Speicher; ein
   anderer Browser bringt ihn nicht mit.
3. **Ohne privates Fenster arbeiten.** Im privaten Modus wird der Speicher beim
   Schließen des Fensters gelöscht.
4. **Admin-Seiten prüfen.** Unter `/Phomu/admin/review` steht, ob der Katalog
   vollständig geladen wurde.

Technische Umgebung, Server-Adressen und Fehlerbilder auf der Kommandozeile:
[Erste Schritte](../GETTING-STARTED.md).
