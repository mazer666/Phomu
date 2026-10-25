# Konformitätswerkzeuge — der Abgleich der Web-Shell mit der Rust-Basis

> **Zweck:** Der Nachweis, dass die Rust-Basis **dasselbe Spiel** spielt wie
> die Web-Shell. Das Werkzeug besteht aus drei Teilen:
>
> 1. dem **Runner der TypeScript-Seite** (`run-ts-conformance.ts`) — er fährt
>    die gemeinsamen Vektoren gegen die bestehende Web-Shell,
> 2. dem **Runner der Rust-Seite**
>    (`core/phomu-conformance/src/bin/phomu-conformance-runner.rs`) — er
>    fährt dieselben Vektoren gegen `core/phomu-core`,
> 3. dem **Vergleich** (`compare-conformance.mjs`) — er vergleicht beide
>    Ergebnisdateien feldweise und schreibt einen Bericht.
>
> Die Vektoren liegen in
> [`core/phomu-conformance/vectors/web-shell/`](../../core/phomu-conformance/vectors/web-shell/README.md).

## 1. Ausführen

```bash
# 1. Die Referenz messen
npx tsx tools/conformance/run-ts-conformance.ts --out tmp/conformance-ts.json

# 2. Die Rust-Basis messen
cargo run --bin phomu-conformance-runner -- --out tmp/conformance-rust.json

# 3. Vergleichen (Exit-Code 1, wenn ein portabler Vektor abweicht)
node tools/conformance/compare-conformance.mjs \
  --ts tmp/conformance-ts.json \
  --rust tmp/conformance-rust.json \
  --out tmp/conformance-report.txt
```

Ohne `--rust` misst der Vergleich nur die Referenzseite gegen die
Erwartung der Vektoren — das ist der Selbsttest des Korpus.

## 2. Der TypeScript-Runner

Der Runner ruft **die vorhandene Implementierung** auf, nicht eine
Nachbildung:

- die Zustandsänderungen laufen über die Aktionen des Zustandspeichers
  (`src/stores/game-store.ts`) — `startGame`, `drawSong`, `advancePhase`,
  `submitAnswer`, `awardPoints`, `nextRound`, `endGame`, `skipBrokenSong`,
  `initTimeline`, `addTimelineYear`, `removeTimelineYear`,
  `assignPlayerToTeam`, `removeTeam`, `resetScores`, `setConfig`;
- die Modusregeln laufen über die reine Logik in
  [`src/utils/mode-rules.ts`](../../src/utils/mode-rules.ts) — dieselben
  Funktionen, die die React-Komponenten benutzen;
- die Zensur läuft über `censorHint` (`src/utils/censor-utils.ts`), die
  Katalogauswahl über `filterSongs` (`src/utils/song-picker.ts`).

**Wie das ohne React geht:** Die Harness ruft den Zustandsspeicher direkt
auf (`useGameStore.getState()`). Das ist ein öffentlicher Zustand, kein
Rendern — die Komponenten werden nicht gebraucht, weil die Regel, um die
es geht, inzwischen in reinen Funktionen liegt.

**Die deterministische Umgebung:** Der Runner setzt einen
speicherinternen `localStorage` (die Persist-Middleware des Speichers
schreibt bei jedem Zustandswechsel) und eine steuerbare Uhr (die
Bedingung `time` liest `Date.now()`). Beides geschieht **im Harness**, nicht
in der Referenz.

## 3. Der Rust-Runner

Der Runner ist ein eigenständiges Binärziel des Crates
`core/phomu-conformance` und benutzt das Modell des Crates **nicht** — er
liest dasselbe JSON mit einem eigenen Modell. Grund: das Crate wird
parallel von einem zweiten Worker gebaut und bringt ein eigenes
Vektorformat mit (siehe
[`vectors/README.md` § 5](../../core/phomu-conformance/vectors/README.md)).

**Der Kern wird über seine Kommandos gesteuert.** Der Kern ist ein
Kommandoprozessor: sein Zustand ändert sich nur über die Fassade. Ein
Vektor, dessen Situation oder dessen Eingabe die Fassade nicht erreichen
kann, wird **nicht** vorgetäuscht — der Runner meldet
`STATE_NOT_REACHABLE` bzw. `OP_NOT_EXPRESSIBLE` mit dem konkreten Grund,
und der Vergleich zählt ihn als _nicht vergleichbar_.

## 4. Der Vergleich

Der Vergleich kennt vier Ergebnisse:

| Ergebnis         | Bedeutung                                                                             |
| ---------------- | ------------------------------------------------------------------------------------- |
| `matching`       | Beide Seiten haben die Erwartung des Vektors erfüllt.                                 |
| `deviating`      | Eine Seite weicht ab — der Bericht nennt **Feld, erwarteten und tatsächlichen Wert**. |
| `not comparable` | Die Rust-Seite konnte den Vektor nicht ausführen (mit Grund).                         |
| `missing`        | Der Vektor fehlt auf einer Seite.                                                     |

Ein Vektor mit `portable: false` wird als **dokumentierte Abweichung**
berichtet, nicht als Fehler gewertet.

**Exit-Code 1**, sobald ein portabler Vektor abweicht, fehlt oder nicht
verglichen werden konnte.

## 5. Dateien

| Datei                     | Inhalt                                                      |
| ------------------------- | ----------------------------------------------------------- |
| `run-ts-conformance.ts`   | Der Runner der TypeScript-Seite (Kommandozeile)             |
| `lib/types.ts`            | Das Datenmodell des Formats (gemeinsam mit dem Rust-Runner) |
| `lib/loader.ts`           | Liest `index.json` und die Vektordateien                    |
| `lib/harness.ts`          | Die dünne Test-Harness über dem Zustandsspeicher            |
| `lib/environment.ts`      | `localStorage` und Uhr des Runners                          |
| `compare-conformance.mjs` | Der Vergleich und der Bericht                               |
