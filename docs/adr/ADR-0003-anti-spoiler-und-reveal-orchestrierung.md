# ADR-0003 — Anti-Spoiler- und Reveal-Orchestrierung

**Status:** Accepted
**Datum:** 2026-10-25
**Owner-Rolle:** Chief Architect
**Bezugene Anforderungs-IDs:** MEDIA-001 (Anti-Spoiler), GAME-003 (Reveal), GAME-004 (Punkte), UI-002 (Projektor)

---

## Kontext

Anti-Spoiler ist bei Phomu kein Komfortmerkmal, sondern das Produktversprechen:
In einer Runde läuft Musik, der Pilot muss den Song erraten, und **niemand**
anderes darf die Lösung sehen. Das betrifft vier Stellen gleichzeitig:

1. **Der Musik-Player.** `src/components/game/MusicPlayer.tsx` kennt die
   Prop `blurred` (`:28`). Bei `blurred=true` rendert der Wrapper mit
   `blur-[60px] scale-125` (`:424`) und darüber liegt ein Overlay mit dem Text
   „Musik läuft" und dem Hinweis „Swipe zum Aufdecken" (`:462`), das per
   Drag-Geste aufgelöst wird (`:466-476`). Die Metadaten (`song.title`,
   `song.artist`) sind aber **im Client-Speicher und im React-Baum**.
2. **Der Fragemodus.** `src/components/game/QuestionPhase.tsx` selbst rendert im
   Frage-Modus **keinen** Titel und **keinen** Künstler — die Auflösungstexte
   der Runden-Auflösung existieren ausschließlich in
   `src/components/game/RevealPhase.tsx` (`:240`, `:248`, `:297`, `:434`).
   Die Modus-Widgets folgen dem für fünf von sechs Modi ebenfalls; die
   gemessene Ausnahme ist `vibe-check` (siehe Entscheidung 3).
3. **Die Hinweise.** `src/utils/censor-utils.ts:11` (`censorHint`) ersetzt
   Titel- und Artist-Token in Hinweisen durch `[XXX]`. Die Schwellen stehen in
   `src/config/spoiler-config.ts` (`MIN_LENGTH: 4`, `EXCEPTIONS`, `IGNORE_WORDS`).
   Aufgerufen in `src/components/game/modes/HintMasterMode.tsx:156`.
4. **Der Beamer.** `src/app/projector/page.tsx:1-9` hält fest: „Kein Artist,
   kein Titel, kein Album-Art — nichts das die Frage verrät."

Die Reveal-Orchestrierung läuft über `RoundPhase`
(`src/types/game-state.ts:28-33`): `'drawing' | 'question' | 'locked-in' |
'reveal' | 'scoring'`. `src/app/game/page.tsx:404-462` hält `QuestionPhase`
während des Reveals **gemountet** (`display: none`), damit der YouTube-Iframe
nicht neu startet — ein bewusster, im Kommentar (`:404-407`) dokumentierter
Eingriff in den Renderbaum.

### Der gemessene Bruch

Die Phase wird ausschließlich über `advancePhase(phase)` gesetzt
(`src/stores/game-store.ts:439-441`):

```ts
advancePhase(phase) {
  set({ roundPhase: phase });
},
```

Der Übergang ist **ungeprüft**: jede Komponente kann in jede Phase wechseln.
Es gibt **kein** `answersLocked`-Flag im Code (`grep -rn "answersLocked" src` →
0 Treffer), und die Phase `'locked-in'` wird **nirgends gesetzt** — sie steht
nur im Typ (`src/types/game-state.ts:31`) und in der Typ-Liste des Audio-Hooks
(`src/hooks/useGameAudioCues.ts:9`).

Der Reveal hängt damit am Klick des Piloten („Alle fertig → Reveal",
`src/components/game/QuestionPhase.tsx:86-101`) bzw. am Timer-Notfall
(`handleTimeUp`, `src/app/game/page.tsx:232-236`), **nicht** daran, dass alle
Antworten abgegeben sind. Zusätzlich zeigt
`src/components/game/modes/SurvivorMode.tsx:195` den Text „Wartet auf das
Reveal …", obwohl die Phase selbst nie auf `'locked-in'` wechselt.

---

## Entscheidung

### 1. Anti-Spoiler ist eine **Phasen-Eigenschaft**, kein Feature-Schalter

Der Store kennt die Reihenfolge der Phasen. Ein Reveal ist nur zulässig, wenn
die Runde vorher den Zustand „alle Antworten sind abgegeben" durchlaufen hat.
Dafür wird der bestehende, aber ungenutzte Typ `'locked-in'` aktiviert:

```text
drawing ──drawSong()──▶ question ──submitAnswer() (für jeden Piloten)──▶ locked-in
                            │                                                    │
                            │◀──────────── advancePhase('reveal') ──────────────┘
                            ▼
                          reveal ──nextRound()──▶ drawing (nächste Runde)
```

### 2. `advancePhase` wird zu einem **zustandsbehafteten** Übergang

`advancePhase` prüft die Zielphase gegen die erlaubte Übergangsmenge. Ein
Übergang, der nicht erlaubt ist, wird **abgelehnt** (No-op) und nicht
stillschweigend ausgeführt. Die Prüfung liegt **im Store**, damit sie nicht
von einer Komponente umgangen werden kann.

Die konkrete Regel:

| Von | Nach | Bedingung |
|---|---|---|
| `drawing` | `question` | `currentSong !== null` |
| `question` | `locked-in` | Für jeden Piloten in `turnOrder` existiert eine Antwort in `currentAnswers` |
| `locked-in` | `reveal` | immer (der Pilot löst aus) |
| `reveal` | `drawing` | immer, via `nextRound()` |
| beliebig | `scoring` | nur via `endGame()` |

Ein **Timer-Notfall** (`handleTimeUp`, `src/app/game/page.tsx:232-236`) darf
weiterhin direkt nach `reveal` wechseln — der Timer ist ein Ausgang, kein
Fehlerfall. Er umgeht die Antwortpflicht bewusst.

### 3. Die Metadaten-Sichtbarkeit ist eine **Prop-Konvention**

Die Anti-Spoiler-Grenze der Darstellung wird an einer Stelle definiert und
von allen Modus-Widgets eingehalten:

- `MusicPlayer` bekommt `blurred` als **Pflicht-Prop** im Frage-Modus. Die
  bisherige Form `blurred = false` als Default (`src/components/game/MusicPlayer.tsx:135`)
  wird zu `blurred: boolean` (ohne Default) — der Compiler erzwingt dann, dass
  jeder Aufrufer die Entscheidung trifft.
- Das Freigeben des Videos bleibt **lokal** im `MusicPlayer` (`videoRevealed`,
  `src/components/game/MusicPlayer.tsx:141`) und ist nicht mit der Phase
  gekoppelt: der Pilot darf jederzeit aufdecken, aber der **Text** (Titel,
  Künstler) erscheint erst in der Reveal-Phase.

**Gemessener Ist-Stand des Blur-Verhaltens je Modus** (`grep -n "blurred"
src/components/game/modes/*.tsx`):

| Modus | `blurred`-Prop | Zeigt Titel/Künstler im Frage-Modus? | Fundstelle |
|---|---|---|---|
| `survivor` | `!answered && !cheatUsed` | nein — Platzhalter `???` | `SurvivorMode.tsx:69`, `:100-103` |
| `timeline` | `!isRevealed` | nein — erst nach Slot-Auflösung | `TimelineMode.tsx:281`, `:516-519` |
| `lyrics` | `!isRevealing` | nein — erst im Reveal-Block | `LyricsMode.tsx:121`, `:132-133` |
| `cover-confusion` | `phase !== 'done'` | nein — erst in `self-assess` | `CoverConfusionMode.tsx:114`, `:205-207` |
| `hint-master` | `!isRevealed` | nein — erst nach „LÖSUNG ZEIGEN" | `HintMasterMode.tsx:133`, `:202-203` |
| `vibe-check` | **`false`** (immer ungeblurt) | **ja — `song.artist` und `song.title` stehen dauerhaft im Frage-Bildschirm** | `VibeCheckMode.tsx:99`, `:116-118` |

> **Gemessene Ausnahme:** `vibe-check` blendet weder das Video noch die
> Metadaten. Das ist im Modus sachlich vertretbar (die gesuchte Antwort ist die
> Stimmung, nicht der Song), bedeutet aber: **in einem Vibe-Check-Runde ist der
> Songtitel für alle sichtbar.** Die Regel lautet deshalb: die Metadaten-Sichtbarkeit
> ist **eine Entscheidung pro Modus**, keine Eigenschaft der Phase — und sie wird
> ab jetzt explizit dokumentiert statt implizit vorausgesetzt.

### 4. Hinweis-Zensur bleibt eine reine Funktion

`censorHint` (`src/utils/censor-utils.ts:11`) bleibt eine reine Funktion ohne
React- und ohne Store-Zugriff. Die Schwellen kommen **ausschließlich** aus
`src/config/spoiler-config.ts`. Die heute hartkodierten `4` in
`src/utils/validate-song-data.ts:195-196`,
`src/app/admin/songs/page.tsx:84-85` und `src/utils/censor-utils.ts:50` werden
durch `SPOILER_CONFIG.MIN_LENGTH` ersetzt (ADR-0001 §5).

### 5. Der Beamer bleibt eine eigene, spoilerfreie Projektion

`/projector` rendert Modus, Punktestand, aktiven Piloten und Timer — **keinen**
Titel, **keinen** Künstler, **kein** Cover. Das ist keine Konvention, sondern
der Zweck der Seite; sie liest aus demselben Store und zeigt bewusst eine
Auszug der Felder.

---

## Konsequenzen

### Positiv

- Der Reveal wird vom Klick des Piloten entkoppelt: „alle Antworten abgegeben"
  wird ein **Zustand des Stores** und damit prüfbar und testbar.
- Die Phase `'locked-in'` wird vom Typ zum gelebten Konzept — kein toter
  Enum-Wert mehr.
- Ein fehlgeschlagener oder vergessener Aufruf von `advancePhase('reveal')`
  kann nicht mehr stillschweigend die Lösung freigeben.
- Die Anti-Spoiler-Regeln sind an **drei** Stellen dokumentiert (Store-Übergang,
  `MusicPlayer`-Prop, Projektor-Seite) und damit beim Review sichtbar.

### Negative / Trade-offs

- **Mehr Zustand im Store.** `locked-in` muss von `submitAnswer` gesetzt
  werden, nicht nur von `advancePhase`. Der Store wächst um eine Bedingung.
- **Ein Timer-Fall bleibt.** `handleTimeUp` überspringt die Antwortpflicht.
  Das ist gewollt, aber es bedeutet: der Reveal ist **nicht** in jedem Fall an
  „alle Antworten abgegeben" gekoppelt. Die Regel ist „Antwortpflicht, außer
  der Timer läuft ab".
- **Pflicht-Prop `blurred`** erzwingt Änderungen an allen Aufrufern des
  `MusicPlayer` (6 Modus-Widgets + `LyricsMode`-Bonusrunde).
- **Ein Test fehlt heute.** Es gibt keinen Test, der beweist, dass der Reveal
  erst nach der Antwortpflicht erfolgt. `src/components/game/QuestionPhase.test.tsx`
  existiert **nicht** (im Repo liegen nur `src/utils/*.test.ts` und
  `src/components/game/MusicPlayer.test.ts`).

### Was die Entscheidung unmöglich macht

- Eine Komponente kann nicht mehr per `advancePhase('reveal')` die Lösung
  erzwingen, ohne die Antwortpflicht zu umgehen.
- `'locked-in'` kann nicht mehr entfernt werden, ohne die Antwortpflicht
  aufzugeben.
- Der `MusicPlayer` kann nicht mehr ohne Entscheidung über den Blur-Zustand
  aufgerufen werden.

---

## Alternativen (verworfen)

- **Reveal-Freigabe allein über den Pilot-Klick (Status quo).** *Verworfen:*
  Der Pilot ist ein Spieler und damit kein verlässlicher Wächter. Ein
  versehentlicher Klick auf „Alle fertig → Reveal" gibt die Lösung preis, bevor
  die Runde gespielt wurde.
- **Serverseitige Geheimhaltung (Song-Titel nie an den Client senden).**
  *Verworfen:* `output: 'export'` (`next.config.ts:4`) erlaubt keine
  Server-Routen, und die QR-Karten brauchen den Song-Datensatz ohnehin im
  Client, um das Video abzuspielen. Eine serverseitige Lösung wäre ein
  Server-Projekt — das kommt mit ADR-0002 (Server), nicht hier.
- **Meta-Daten im Client verschlüsseln.** *Verworfen:* Der Schlüssel läge im
  Client. Das wäre Security-theater ohne kryptografischen Nutzen.
- **Ein globaler `spoilerFree`-Schalter in der Config.** *Verworfen:* Der
  Zustand ist **phasenabhängig**, nicht global. Ein Schalter würde die
  Phasenlogik nicht abbilden und würde die Wege verzweigen.
- **Die Anti-Spoiler-Prüfung in die Komponenten verlagern.** *Verworfen:*
  Jede Komponente wäre einzeln prüfbar und einzeln übergehbar — die Regel wäre
  nicht mehr an einer Stelle erzwingbar.

---

## Verifikation

| Prüfung | Kommando / Ort |
|---|---|
| Übergangsprüfung im Store | `src/stores/game-store.ts` — `advancePhase` muss die erlaubte Menge prüfen |
| `'locked-in'` wird gesetzt | `grep -rn "locked-in" src` →mindestens eine Setzstelle im Store |
| Kein `answersLocked` als zweiter Wahrheit | `grep -rn "answersLocked" src` → 0 Treffer |
| Kein Metadaten-Leak im Fragemodus | `grep -n "song.title\|song.artist" src/components/game/modes/*.tsx` — je Modus nur in dessen Reveal-Pfad; `vibe-check` ist die dokumentierte Ausnahme (§ Entscheidung 3) |
| Zensur-Schwelle aus der Config | `grep -rn "length >= 4\|length < 4" src` → 0 Treffer außer `src/config/spoiler-config.ts` |
| Projektor bleibt spoilerfrei | `grep -n "song.title\|song.artist\|coverUrl" src/app/projector/page.tsx` → 0 Treffer |
| Negativtest | Neuer Test `src/stores/game-store.test.ts`: `advancePhase('reveal')` aus `question` ohne Antworten bleibt ein No-op |
