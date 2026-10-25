# ADR-0002 — Zustand: Store vs. Server vs. URL

**Status:** Accepted
**Datum:** 2026-10-25
**Owner-Rolle:** Chief Architect
**Bezugene Anforderungs-IDs:** LOBBY-001 (Sitzung), GAME-002 (Punkte), NFR-002 (Persistenz)

---

## Kontext

Phomu ist ein Hybrid: physische QR-Karten und eine Web-App. Daraus folgt eine
Grundspannung, die sich in drei Fragen zeigt.

**Frage 1 — Wo liegt der Spielzustand?** Eine Partysitzung umfasst Spieler,
Teams, Config, Runde, Phase, Punkte, Antworten und XP. Heute liegt sie in
`src/stores/game-store.ts` (Zustand, 640 Zeilen) mit `persist`-Middleware und
localStorage-Key `'phomu-game-state'` (`src/stores/game-store.ts:619`).

**Frage 2 — Wo liegt der Zustand *außerhalb* des Browsers?** Der Beamer-Tab
(`/projector`) soll denselben Punktestand zeigen wie das Smartphone. Heute
realisiert über einen **Polling-Trick**: der Beamer liest denselben
localStorage-Eintrag, aber nur, weil beide Tabs auf demselben Gerät laufen
(`src/app/projector/page.tsx:41-44` pollt alle 2 s, weil localStorage-Events
zwar innerhalb einer Origin feuern, aber die Zustände asynchron
zusammenlaufen). Ein zweites Gerät im selben WLAN bekommt **nichts**.
`src/types/game-state.ts:5-7` nennt als Plan „in multi-device mode it syncs via
Supabase Realtime", und `DeviceMode` in `src/types/game-state.ts:23-26` kennt
`'multi-device'` mit „Each player uses their own device (via session code)".
Der Plan existiert, der Code nicht.

**Frage 3 — Was gehört in die URL?** `src/utils/qr-intent.ts` parst eine
QR-Deep-Link-URL mit den Parametern `session`, `pack` und `id`
(`src/utils/qr-intent.ts:28-38`) — der QR-Code trägt also eine **URL**, und die
URL trägt den **Spielkontext**. Parallel nutzt `src/components/game/QRScannerModal.tsx`
den Kamera-Scanner. Der Session-Code ist also bereits ein Adressierkonzept,
aber noch kein URL-Zustand.

Zusätzlich existieren **zwei weitere** localStorage-Wahrheiten neben dem Store:
`'phomu-admin-songs'` (`src/app/admin/songs/page.tsx:33` **und**
`src/app/browse/page.tsx:14` — derselbe Key an zwei Orten) und
`'phomu-review-edits'` (`src/app/admin/review/page.tsx:28`). Beide liegen
**außerhalb** des Stores und sind damit ein zweiter, nicht kontrollierter
Zustandspfad.

Und noch eine Beobachtung zum Persistenz-Umfang: `partialize`
(`src/stores/game-store.ts:621-637`) speichert `players`, `teams`, `config`,
`sessionId`, `totalXP`, `preferredPlayer`, `preferredMusicProvider`,
`musicEnabled`, `musicVolume`, `sfxEnabled`, `sfxVolume`, `currentRound`,
`isGameOver`, `timelineYears`, `gameStartTime`. **Nicht** gespeichert werden
`currentSong`, `currentAnswers`, `roundPhase`, `roundHistory`, `currentMode`,
`playedSongIds`, `winnerId`. Ein Reload mitten in der Runde setzt die Sitzung
also auf `drawing` ohne Song zurück.

---

## Entscheidung

### 1. Der Store ist die einzige Wahrheit des Spielzustands

`src/stores/game-store.ts` ist der **einzige** Ort, an dem Spielzustand
geschrieben wird. Komponenten lesen über `useGameStore()`, schreiben aber nur
über die Actions des Stores (`drawSong`, `submitAnswer`, `awardPoints`,
`advancePhase`, `nextRound`, `endGame`, …). Keine Komponente baut Zustand
selbst.

**Konsequenz:** Auch der Admin-Bereich wird in diese Regel überführt. Die
beiden localStorage-Wahrheiten (`'phomu-admin-songs'`, `'phomu-review-edits'`)
werden entweder in **eigene, benannte Stores** (`useAdminSongStore`,
`useReviewStore`) überführt oder als bewusste Ausnahme dokumentiert — mit
**einem** Ort für den Key, nicht zwei.

### 2. Persistenz: getrennte Slices mit dokumentierter Zweckbestimmung

`persist.partialize` wird in drei benannte Gruppen aufgeteilt:

| Gruppe | Inhalt | Persistiert | Begründung |
|---|---|---|---|
| `session` | `sessionId`, `players`, `teams`, `config`, `currentRound`, `isGameOver` | ja | Reload darf die Lobby-Konfiguration nicht verlieren (`src/stores/game-store.ts:5-7`) |
| `progression` | `totalXP`, `preferredPlayer`, `preferredMusicProvider` | ja | Geräteübergreifende Fortschrittsdaten |
| `preferences` | `musicEnabled`, `musicVolume`, `sfxEnabled`, `sfxVolume` | ja | Geräteeinstellungen |
| `round` | `currentSong`, `currentAnswers`, `roundPhase`, `currentMode`, `playedSongIds`, `roundHistory` | **nein** | Ein persistierter Song + ein persistierter Reveal-Zustand ist ein Spoiler-Vektor (siehe ADR-0003) |

Diese Trennung ist **keine** neue Entscheidung, sondern eine explizite
Festlegung des heute schon vorhandenen Verhaltens.

### 3. Server: derzeit keiner — und das ist eine Entscheidung, kein Versehen

Phomu wird mit `output: 'export'` gebaut (`next.config.ts:4`). Es gibt
**keine** Server-Route: `find src/app -name "route.ts"` liefert **0** Treffer.
Der Spielablauf läuft zu 100 % im Client.

**Entscheidung:** Der Spielzustand bleibt clientseitig. Ein Server kommt
**nicht** in dieser Runde. Vorbehalt: Ein Server ist **zwingend**, sobald eines
der folgenden gilt:

1. `DeviceMode 'multi-device'` wird ausgeliefert (d. h. echter Session-Code
   über Gerätegrenzen hinweg).
2. Punktestände sollen zwischen Geräten synchronisiert werden.
3. Der Admin-API wird tatsächlich erreichbar (heute hat er 0 Konsumenten und
   keine Route, siehe ADR-0001 §3.3 A4).

Bis dahin wird `sessionId` in `src/types/game-state.ts:143` als „used for
multi-device sync" dokumentiert, aber **nicht** befüllt mit Multi-Device-
Semantik.

### 4. URL: nur der **Einstiegskontext**, nie der Spielzustand

Die URL darf tragen, was **vor** der Sitzung entschieden wird:

| In der URL | Zweck | heute |
|---|---|---|
| `?session=<code>` | Session-Code (QR-Deep-Link) | `src/utils/qr-intent.ts:28` |
| `?pack=<id>` | Pack-Vorauswahl | `src/utils/qr-intent.ts:33` |
| `?id=<songId>` | Direktstart eines Songs (Quick Play) | `src/utils/qr-intent.ts:38` |

Die URL darf **nicht** tragen: Punkte, Phase, Antworten, Spielerlisten. Grund:
Die URL ist teilbar, landet im Verlauf und in Logs. Ein Punktestand in der URL
ist ein Cheat-Vektor und bricht das Anti-Spoiler-Versprechen (ADR-0003).

**Entscheidung:** Beim Betreten einer Seite mit diesen Parametern wird der
Parameter **einmal** in den Store überführt (`setConfig` bzw.
`startQuickGame`) und danach **aus der URL entfernt** (History-Replace), damit
ein Reload nicht erneut anwendet.

### 5. Session- und Admin-Zustand erhalten **je einen** Storage-Key

Jeder persistierte Zustand hat genau einen Schlüssel, definiert an genau einer
Stelle. Für die heute existierenden Keys heißt das: `'phomu-admin-songs'` wird
an einer Stelle definiert und von beiden Nutzern (`/browse` und `/admin/songs`)
importiert.

---

## Konsequenzen

### Positiv

- Es gibt genau eine Antwort auf „wo ist der Spielzustand?":
  `useGameStore`. Kein Kontext, kein `localStorage`, kein URL-Parameter.
- Die Anti-Spoiler-Zusage wird persistenztechnisch abgesichert: `currentSong`
  und `currentAnswers` werden **nicht** persistiert, ein Reload startet die
  Runde neu statt die Lösung preiszugeben.
- Der lokale Betrieb bleibt vollständig offline und ohne Backend — passend zu
  `output: 'export'` und zum Party-Szenario (Funkloch im Garten).
- Die Multi-Device-Frage wird nicht mit einer halben Implementierung
  beantwortet, sondern sauber als Decision-Record festgehalten: sie ist
  **Server + Realtime**, und der Server kommt mit einer eigenen ADR.

### Negative / Trade-offs

- **Kein Cross-Device-Sync.** Zwei Geräte im selben Raum sind zwei
  unabhängige Sitzungen. Der `/projector`-Modus funktioniert nur bei
  Beamer und Handy **auf demselben Gerät** (oder derselben Origin mit
  geteiltem localStorage). Das ist eine bewusste Einschränkung, die im
  Produkt sichtbar kommuniziert werden muss.
- **Ein Datenverlust beim Reload in der Runde.** Punkte der laufenden Runde und
  der Fortschritt der Runden-Historie gehen verloren; `currentRound` bleibt
  erhalten. Für ein Partyspiel im WLAN ist das vertretbar, für eine
  Turnier-Szene nicht.
- **Die Admin-Wahrheiten wandern.** Zwei localStorage-Zustände müssen in
  Stores überführt werden — Aufwand ohne Nutzen für das Spiel, aber nötig für
  die Eindeutigkeit der Zustandshalter.
- **Die URL-Bereinigung** braucht einen Router-Aufruf (`router.replace`) und
  muss mit der Hydration-Race Condition von Next.js 16 abgewogen werden.

### Was die Entscheidung unmöglich macht

- Der Spielzustand kann nicht ohne Server repliziert werden.
- Ein Punktestand kann nicht in einer URL stehen.
- Ein laufender Song kann keinen Reload überleben.
- `DeviceMode 'multi-device'` ist bis zur Server-ADR nicht implementierbar.

---

## Alternativen (verworfen)

- **Alles in localStorage ohne Store.** *Verworfen:* Der Store existiert bereits,
  bietet `partialize`, typisierte Actions und eine einzige Schreibstelle.
  localStorage-Felder über Komponenten zu verteilen verletzt die
  Store-Regel und erzeugt die heutige Doppelschreibung von
  `'phomu-admin-songs'`.
- **Alles in der URL (Shareable State).** *Verworfen:* Punkte und Phase in der
  URL sind ein Spoiler- und Cheat-Vektor; die URL wird in Verlauf und
  geteilt und ist zu lang für Punktestände.
- **Session-Zustand auf dem Server ab jetzt (Supabase Realtime).** *Verworfen
  für diese Runde:* `output: 'export'` schließt Server-Routen aus, ein
  Realtime-Kanal bräuchte Keys und Betrieb, und die Spielsitzung ist
  netzwerkfehleranfällig — bei einer Party im WLAN ist ein lokaler Zustand
  robuster. Der Plan in `src/types/game-state.ts:5-7` bleibt als Folgestep.
- **Persistenz von `currentSong` und `currentAnswers`.** *Verworfen:* Ein
  persistierter Reveal-Zustand macht die Anti-Spoiler-Grenze von der
  Disziplin der Nutzer abhängig (siehe ADR-0003).
- **Zustand pro Bildschirm (Page-Local-State).** *Verworfen:* `players`,
  `teams` und `config` werden in `src/app/lobby/page.tsx:61-65`, in
  `src/app/game/page.tsx:47-71` und in `src/app/projector/page.tsx:26-34`
  gebraucht — drei Seiten brauchen denselben Zustand.

---

## Verifikation

| Prüfung | Kommando / Ort |
|---|---|
| Store ist einzige Schreibstelle | `grep -rn "useGameStore(" src/components src/app` → nur Lesezugriffe und Action-Aufrufe, keine `setState`-Umgehung |
| Persistenzumfang | `src/stores/game-store.ts:621-637` — `partialize` enthält **kein** `currentSong`, `currentAnswers`, `roundPhase` |
| Kein Zustand in der URL | `grep -rn "useSearchParams\|searchParams" src/app` → keine Punkte/Phase-Parameter |
| Storage-Keys eindeutig | `grep -rn "localStorage.getItem\|localStorage.setItem" src` → je Schlüssel genau eine Definitionsstelle |
| Store-Schichtregel | ADR-0001 §2.2 — `components → stores` ist erlaubt, `data → stores` ist es nicht |
