# Phomu Glossar

Die Begriffe, die in Phomu **eine eigene Bedeutung** haben — also nicht allgemein
deutsch oder englisch, sondern im Code festgelegt sind. Jeder Eintrag nennt die
Definition in einem Satz und die Datei, in der der Begriff implementiert ist.

Wer nach Zahlen sucht, findet sie nicht hier, sondern in
[`src/config/game-config.ts`](src/config/game-config.ts). Zahlen zu stehen an genau
einer Stelle; dieses Glossar erklärt nur, *was* die Dinge sind.

---

**Admin-API** — Die interne HTTP-Schnittstelle für Katalogpflege und Cover-Verwaltung,  
*Anforderung:* SEC-001 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
geschützt durch den Header `x-admin-token`, dessen Wert mit `ADMIN_API_TOKEN` aus der
Umgebung verglichen wird.
*Implementierung:* `src/admin-api/_lib/security.ts`, `src/admin-api/admin/covers/search/route.ts`,
`src/admin-api/admin/covers/save/route.ts`

**Anti-Spoiler** — Die Eigenschaft des Spielablaufs, dass vor der Auflösung weder  
*Anforderung:* CORE-005, GAME-002, MEDIA-015, UI-006 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
Titel noch Interpret noch Albumcover der gesuchten Karte in der Oberfläche sichtbar
oder hörbar sind; jeder Modus blendet seine Lösung deshalb bis zum Reveal aus.
*Implementierung:* `src/components/game/MusicPlayer.tsx` (Prop `blurred`),
`src/components/game/modes/*.tsx` (Gating über `isRevealed` / `answered`),
`src/app/projector/page.tsx` (spoilerfreie Beamer-Ansicht)

**Cover-Version** — Ein Song-Eintrag, der eine fremde Aufnahme desselben Werks  
*Anforderung:* CAT-014, GAME-034 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
referenziert; sie trägt den Cover-Link in `links.coverLink` und die Beziehung im
Feld `coverMode`.
*Implementierung:* `src/types/song.ts` (`CoverModeMetadata`),
`src/components/game/modes/CoverConfusionMode.tsx`

**Gewinnbedingung** — Die im Lobby festgelegte Regel, nach der das Spiel endet:  
*Anforderung:* GAME-008, GAME-009, LOBBY-013 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
`points` (ein Spieler oder Team erreicht die Zielpunktzahl), `rounds` (eine feste Zahl
Runden je Teilnehmer) oder `time` (die Spielzeit läuft ab).
*Implementierung:* `src/types/game-state.ts` (`GameEndingCondition`, `GameConfig.targetPoints`,
`targetRounds`, `targetTimeMinutes`), geprüft in `src/stores/game-store.ts` (`nextRound()`)

**Hint-Level** — Die Stufe eines Hinweises im Hint-Master-Modus; Level 1 ist das  
*Anforderung:* GAME-023, GAME-026, CAT-011 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
schwierigste und bringt 5 Punkte, Level 5 das leichteste mit 1 Punkt. Die Stufenzahl
ist die Anzahl der im Song hinterlegten Hinweise, höchstens fünf.
*Implementierung:* `src/config/game-config.ts` (`HINT_MASTER_POINTS: [5, 4, 3, 2, 1]`),
`src/components/game/modes/HintMasterMode.tsx`, Datenfeld `hints` in `src/types/song.ts`

**Katalog** — Die Gesamtheit aller spielbaren Song-Datensätze, aus der der Zieher  
*Anforderung:* CAT-001, CAT-002, CAT-005 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
wählt; er umfasst 1.615 Songs in 135 JSON-Dateien unter `src/data/songs/`.
*Implementierung:* `src/data/songs/index.ts` (`ALL_SONGS`),
geprüft durch `src/utils/validate-song-catalog.ts`

**Pack** — Eine benannte Themengruppe von Songs, aus der in der Lobby gezogen wird;  
*Anforderung:* CAT-003, CAT-004, LOBBY-017 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
ein Song kann in mehreren Packs liegen. In der Oberfläche wählbar sind 27 Packs.
*Implementierung:* `src/config/game-config.ts` (`SONG_PACKS`, `PACK_ALIASES`),
`src/components/lobby/PackSelector.tsx`, Datenfeld `packs` in `src/types/song.ts`

**Phase** — Die Stufe, in der sich eine Runde befindet: `drawing` (Karte ziehen),  
*Anforderung:* GAME-001 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
`question` (die Frage läuft), `locked-in` (alle Antworten sind abgegeben, es wartet auf
das Reveal), `reveal` (die Lösung wird gezeigt) und `scoring` (Punkte sind vergeben,
das Spiel geht zu Ende).
*Implementierung:* `src/types/game-state.ts` (`RoundPhase`),
`src/stores/game-store.ts` (`advancePhase()`), `src/app/game/page.tsx`

**Pilot** — Die Person, die das Gerät hält und den Spielablauf führt; sie entscheidet  
*Anforderung:* GAME-004, LOBBY-005, GAME-025 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
im Hint-Master-Modus über die Antwort und löst die Runde aus. In jeder Runde ist genau
eine Person an der Reihe, im Team-Modus das Team.
*Implementierung:* `src/types/player.ts` (`Player.isPilot`),
`src/stores/game-store.ts` (`turnOrder`, `currentTurnIndex`), `src/app/game/page.tsx`

**Projektor-Modus** — Die Beamer-Ansicht unter `/projector`, die Modus, Runde, Phase,  
*Anforderung:* UI-006, UI-007, UI-008 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
Punktestand und aktiven Piloten zeigt, aber bewusst keinen Titel, keinen Interpreten
und kein Cover preisgibt.
*Implementierung:* `src/app/projector/page.tsx`

**Punktedeckelung** — Die Obergrenze der Punkte, die ein Modus je richtiger Antwort  
*Anforderung:* GAME-016 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
vergibt; im Timeline-Modus ist das `timelineMaxPoints` (Vorgabe 5), die Punktzahl wächst
mit der Zahl bereits liegender Jahreszahlen, wird aber hart gedeckelt.
*Implementierung:* `src/config/game-config.ts` (`DEFAULT_TIMELINE_MAX_POINTS`),
`src/components/game/modes/TimelineMode.tsx` (`Math.min(timelineYears.length + 1, config.timelineMaxPoints)`)

**QR-Karte** — Die gedruckte Spielkarte im Format 59 × 91 mm mit 3 mm Beschnitt, die  
*Anforderung:* LOBBY-018, LOBBY-019 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
über einen QR-Code den zugehörigen Song öffnet; ein Song trägt das Merkmal
`isQRCompatible`, wenn er auf einer physischen Karte liegt.
*Implementierung:* `src/config/game-config.ts` (`CARD_WIDTH_MM`, `CARD_HEIGHT_MM`,
`CARD_BLEED_MM`, `MAX_CARDS_PER_SET`), `src/components/game/QRScannerModal.tsx`,
`src/utils/qr-intent.ts`, Datenfeld `isQRCompatible` in `src/types/song.ts`

**Reveal** — Die Phase, in der die Lösung der Runde sichtbar wird: die Karte wird  
*Anforderung:* GAME-002, MEDIA-017 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
aufgedeckt, die modusspezifische Auflösung erscheint und die Punkte der Runde werden
aufgeschlüsselt.
*Implementierung:* `src/components/game/RevealPhase.tsx`, Phase `reveal` in
`src/types/game-state.ts`, ausgelöst über `advancePhase('reveal')` in `src/app/game/page.tsx`

**Runde** — Ein Zug: ein Song, ein aktiver Pilot, eine Frage und eine Auflösung. Der  
*Anforderung:* GAME-004, GAME-005 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
Rundenzähler `currentRound` zählt jeden Zug, nicht jede Runde für alle Spieler; bei
Teams läuft eine Runde über alle Teams.
*Implementierung:* `src/types/game-state.ts` (`currentRound`, `GameRound`),
`src/stores/game-store.ts` (`nextRound()`)

**Session-Code** — Die geplante Kurznummer, mit der sich weitere Geräte einer  
*Anforderung:* LOBBY-020, LOBBY-021 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
Mitmach-Sitzung anschließen; der QR-Parser erkennt sie bereits, die Synchronisation
zwischen den Geräten ist jedoch noch nicht implementiert.
*Implementierung:* `src/types/session.ts` (`MultiDeviceSession.code`),
`src/utils/qr-intent.ts` (`kind: 'session'`), `src/types/game-state.ts` (`DeviceMode`)

**Sperren der Antworten** — Der Moment, in dem die Runde für Eingaben geschlossen wird  
*Anforderung:* GAME-001, GAME-002 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
und die Lösung freigegeben werden kann. Im aktuellen Code existiert dafür die Phase
`locked-in`; sie wird in der Oberfläche behandelt, aber von keinem Ablauf gesetzt —
gesperrt wird faktisch durch das Reveal, das der Pilot auslöst oder das der Timer
auslöst.
*Implementierung:* `src/types/game-state.ts` (Phase `locked-in`),
`src/app/game/page.tsx` (`advancePhase('reveal')`, `handleTimeUp()`)

**Team-Modus** — Die Art, wie die Punkte verteilt werden: `individual` (jeder für  
*Anforderung:* LOBBY-006, GAME-007, GAME-010 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
sich), `fixed` (feste Teams über das ganze Spiel) oder `shifting` (die Teams werden
jede Runde neu gemischt).
*Implementierung:* `src/config/game-config.ts` (`TeamMode`), `src/types/player.ts`,
`src/app/lobby/page.tsx` (Schritt 6), `src/stores/game-store.ts` (`nextRound()`)

**Time-Decay** — Der optionale Punkteabzug für langsamere Antworten: nach einer  
*Anforderung:* GAME-038, GAME-039 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
Schonfrist wird je Schritt ein Punkt abgezogen, mindestens bleibt ein Punkt für eine
richtige Antwort.
*Implementierung:* `src/config/game-config.ts` (`DEFAULT_TIME_DECAY_*`,
`DEFAULT_MIN_POINTS_PER_CORRECT`), angewendet in `src/app/game/page.tsx` (`handleAnswered()`)

**Tausch** — Der Wechsel eines Spielers von einem Team in ein anderes; er findet in der  
*Anforderung:* LOBBY-010 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
Lobby statt und ändert die Zuordnung, nicht die Punkte.
*Implementierung:* `src/stores/game-store.ts` (`assignPlayerToTeam()`),
`src/app/lobby/page.tsx` (Team-Zuweisung in Schritt 6)

**Vibe** — Die Stimmungsangabe eines Songs, gespeichert als Liste von Stimmungsnamen in  
*Anforderung:* GAME-030, GAME-031 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
`mood`; im Vibe-Check-Modus muss mindestens eine davon gewählt werden, damit die
Antwort als richtig zählt.
*Implementierung:* `src/types/song.ts` (Feld `mood`),
`src/components/game/modes/VibeCheckMode.tsx`, Stimmungsliste `ALL_MOODS`

**wechselnde Teams** — Der Team-Modus `shifting`: zu Beginn jeder Runde werden die  
*Anforderung:* LOBBY-006, LOBBY-007 in [`REQUIREMENTS.md`](REQUIREMENTS.md)
Spieler neu auf die vorhandenen Teams verteilt, die Teams selbst bleiben bestehen.
*Implementierung:* `src/stores/game-store.ts` (`nextRound()`, Block „Bei Shifting-Teams"),
`src/app/lobby/page.tsx` (Option „Mix-Teams")

---

## Nicht in diesem Glossar

Begriffe, die keine eigene Projektbedeutung haben, stehen hier bewusst nicht:
*Server*, *Komponente*, *State*, *Route*, *Bundle*, *Commit*. Sie stehen in
[`ARCHITECTURE.md`](ARCHITECTURE.md) und in
[`docs/DOCUMENTATION_POLICY.md`](docs/DOCUMENTATION_POLICY.md).
