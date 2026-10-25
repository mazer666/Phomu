# Erste Schritte — vom Klon zum spielbaren Zustand

Dieses Dokument führt von einem leeren Verzeichnis bis zu einem Spiel, das auf dem
Handy läuft. Alle Kommandos sind kopierbar, alle Ausgaben sind im Repo belegt.

Wenn du nicht nur spielen, sondern **ändern** willst, lies zuerst
[`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md).

---

## 1. Voraussetzungen

| Was | Version | Beleg |
|---|---|---|
| Node.js | **20** | in `.github/workflows/deploy.yml` als `node-version: "20"` gepinnt |
| npm | mit Node 20 ausgeliefert (≥ 10) | `package-lock.json` ist Lockfile-Version 3 |
| Git | jede aktuelle Version | `package-lock.json`, `.git/` |
| Browser | Chromium für den E2E-Test | `playwright.config.ts`, `npm run test:e2e:install` |

`package.json` enthält **kein** `engines`-Feld. Die Version 20 ist deshalb aus der
CI-Workflow-Datei abgeleitet, nicht aus einer Paket-Deklaration.

Prüfen:

```bash
node --version
npm --version
```

---

## 2. Klonen und Abhängigkeiten installieren

```bash
git clone https://github.com/mazer666/Phomu.git
cd Phomu
npm ci
```

`npm ci` installiert exakt die Versionen aus `package-lock.json` — anders als
`npm install` verändert es die Lockdatei nicht. Das ist der Grund, warum die CI
`npm ci` verwendet.

**Nebenwirkung:** `npm ci` ruft `postinstall` auf. Das Skript
`scripts/setup-git-hooks.js` legt einen **Git-Hook `pre-push`** an, der vor jedem
Push `npm run local-ci` ausführt. Im Repo-Verzeichnis wird der Hook also still
installiert; entfernen lässt er sich mit
`rm .git/hooks/pre-push`. Ohne `.git`-Verzeichnis (zum Beispiel in einem
Container) überspringt das Skript die Installation mit einer Warnung.

---

## 3. Starten

```bash
npm run dev
```

Ausgabe:

```text
▲ Next.js 16.4.3 (Turbopack)
- Local:         http://localhost:3000
✓ Ready in 1632ms
```

**Wichtig:** Die App liegt **nicht** auf `http://localhost:3000`, sondern auf
**`http://localhost:3000/Phomu`**. Grund ist die Zeile `basePath: '/Phomu'` in
`next.config.ts`. Die Wurzel `/` liefert einen **404** — das ist kein Fehler, das
ist der Base-Path.

| URL | Ergebnis |
|---|---|
| `http://localhost:3000/Phomu` | Startseite, HTTP 200 |
| `http://localhost:3000/Phomu/lobby` | Lobby, HTTP 200 |
| `http://localhost:3000/` | HTTP 404 |
| `http://localhost:3000/lobby` | HTTP 404 |

Der Dev-Server bindet zusätzlich auf die Netzwerk-Adresse des Rechners
(`http://<LAN-IP>:3000/Phomu`) — damit kann ein zweites Gerät im selben WLAN
mitmachen.

---

## 4. Das Spiel starten

1. `http://localhost:3000/Phomu` öffnen.
2. **Lobby** → Schritt 1 „Wer spielt mit?" → mindestens einen Spieler anlegen.
3. Schritt 2 „Wie wird gespielt?" → mindestens einen Modus wählen.
4. Schritt 3 „Was hören wir?" → mindestens ein Pack wählen.
5. Schritt 4 „Wann ist Schluss?" → Gewinnbedingung und Zielwert.
6. Schritt 5 „Feintuning" → optional: Schwierigkeit, Zeitlimit, QR-Karten-Modus,
   Zeitabzug, No-Cheat-Modus.
7. Schritt 6 „Wer gegen wen?" → Team-Modus.
8. **„JETZT STARTEN!"** → das Spiel beginnt.

Der komplette Ablauf steht im Nutzer-Guide:
[`user-guide/USER-GUIDE.de.md`](user-guide/USER-GUIDE.de.md) (deutsch) und
[`user-guide/USER-GUIDE.en.md`](user-guide/USER-GUIDE.en.md) (englisch).

---

## 5. Umgebungsvariablen: `.env.local` und `ADMIN_API_TOKEN`

Die Admin-API (`/admin/covers/search`, `/admin/covers/save`) ist mit einem Token
geschützt. Für das **Spielen** wird der Token **nicht** gebraucht — nur für die
Katalogpflege.

```bash
cp .env.example .env.local
```

`.env.example` enthält genau eine Zeile:

```text
ADMIN_API_TOKEN=replace-with-long-random-token
```

Dann einen echten Token erzeugen:

```bash
npm run security:rotate-admin-token
```

Ausgabe:

```text
New ADMIN_API_TOKEN (store securely, do not commit):
<64 Hex-Zeichen>
```

**Das Skript schreibt den Token nicht in die Datei** — es gibt ihn auf der
Konsole aus. Du musst ihn selbst nach `.env.local` eintragen:

```text
ADMIN_API_TOKEN=<der ausgegebene Hex-String>
```

Alternativ von Hand:

```bash
openssl rand -hex 32
```

Regeln:

- Der Token muss **mindestens 32 Zeichen** lang sein
  (`MIN_ADMIN_TOKEN_LENGTH` in `src/admin-api/_lib/security.ts`). Kürzer →
  die API antwortet mit **503**.
- `.env.local` ist über `.gitignore` (`*.env*.local`) von der Versionsverwaltung
  ausgenommen. **Ein Token gehört nie ins Repository.**
- Ohne `ADMIN_API_TOKEN` antwortet die Admin-API mit **503** („Admin API not
  configured"), mit einem falschen Token mit **401**.

---

## 6. Prüfungen

### Schnell

```bash
npm run typecheck          # TypeScript strict, ohne Emit
npm run lint               # ESLint
npm run test               # Vitest mit Coverage
```

### Katalog

```bash
npm run validate-songs     # Schema und Pflichtfelder — prüft standardmäßig src/data/songs/A1.json
npm run validate-catalog   # Katalog-Gate über alle Dateien
```

`npm run validate-songs` prüft **eine** Datei. Für eine andere:

```bash
npx tsx src/utils/validate-song-data.ts src/data/songs/B1.json
```

Gemessene Ausgabe von `npm run validate-catalog` (Stand dieser Doku):

```text
Packs: 135
Songs: 1615
Schema-Fehler: 0
Schema-Warnungen: 126
Duplicate-Gruppen: 0
Erlaubte Dubletten (Allowlist): 4
Ignorierte Secondary-Dubletten: 0
Fehlende Jahre (1950-2026): 0
```

### Build

```bash
npm run build
```

Der Build ist ein **statischer Export** (`output: 'export'` in `next.config.ts`).
Das Ergebnis liegt in `out/` und wird mit dem Base-Path `/Phomu` erzeugt.

### E2E

```bash
npm run test:e2e:install          # Chromium für Playwright (einmalig)
npm run test:e2e:install:linux    # nur Linux: fehlende Systembibliotheken
npm run test:e2e:smoke            # der Smoke-Test
```

Der Playwright-Runner startet selbst einen Dev-Server (`playwright.config.ts`,
`webServer.command = 'npm run dev'`, Port 3000) und beendet ihn danach. Läuft auf
Port 3000 schon etwas, setze `E2E_BASE_URL` auf die vorhandene Instanz:

```bash
E2E_BASE_URL=http://127.0.0.1:3000/Phomu npm run test:e2e:smoke
```

### Struktur-Gates

```bash
npm run check:all          # i18n-Vollständigkeit, Doku-Linkcheck, Dateigröße
npm run check:i18n         # DE/EN parallel, kein Literaltext im JSX
npm run check:doc-links    # jeder relative Markdown-Link löst auf
npm run check:file-size    # keine Quelldatei über 550 Zeilen
```

### Alles zusammen

```bash
npm run local-ci
```

`scripts/local-ci.sh` führt in dieser Reihenfolge aus: Typecheck → Lint →
Unit-Tests → Format-Check (nicht blockierend) → `validate-songs` →
`validate-catalog` → Build → `npm audit --omit=dev --audit-level=moderate`. Der
YouTube-Link-Audit läuft nur, wenn `YOUTUBE_API_KEY` gesetzt ist.

---

## 7. Fehlerbehebung

### „Port 3000 ist bereits belegt"

```text
Error: listen EADDRINUSE: address already in use :::3000
```

Entweder läuft bereits ein Dev-Server, oder ein anderer Prozess belegt den Port.

```bash
# Belegenden Prozess finden
lsof -i :3000

# Anderen Port verwenden
npm run dev -- --port 3001     # dann ist die App unter http://localhost:3001/Phomu
```

Für den E2E-Test muss die Basis-URL dann mitziehen:

```bash
E2E_BASE_URL=http://127.0.0.1:3001/Phomu npm run test:e2e:smoke
```

### „Executable doesn't exist at …/chrome-linux/chrome"

```text
Error: browserType.launch: Executable doesn't exist at …
```

Die Playwright-Browser fehlen. einmalig installieren:

```bash
npm run test:e2e:install
```

### „Host system is missing dependencies to run browsers" (nur Linux)

```text
Error: ║ Host system is missing dependencies to run browsers. ║
```

Die Systembibliotheken fehlen. Dafür gibt es ein eigenes Kommando, das **Root**
braucht:

```bash
sudo npm run test:e2e:install:linux
```

### „Admin API not configured" (HTTP 503)

Die Admin-API wurde ohne `ADMIN_API_TOKEN` aufgerufen. Der Token fehlt in der
Umgebung oder ist kürzer als 32 Zeichen.

```bash
# prüfen, ob der Token gesetzt ist (nur die Länge ausgeben, nicht den Wert)
node -e "console.log((process.env.ADMIN_API_TOKEN||'').length)"

# Token neu erzeugen und in .env.local eintragen
npm run security:rotate-admin-token
```

Nach dem Eintragen **Dev-Server neu starten** — die Umgebung wird beim Start
gelesen, nicht bei jedem Request.

### „Unauthorized" (HTTP 401)

Der Token stimmt nicht mit `ADMIN_API_TOKEN` überein. Häufigste Ursache: Der Token
wurde mit Anführungszeichen oder mit Leerzeichen am Ende eingetragen. Der Vergleich
ist zeitkonstant und case-sensitiv.

### „Der Ton wird vom Browser blockiert"

Browser starten Audiowiedergabe nur nach einer Nutzergeste. Phomu nutzt dafür den
Countdown von `PHOMU_CONFIG.COUNTDOWN_SECONDS` (3 Sekunden) vor dem Start des
Players. Wenn trotzdem nichts zu hören ist:

1. **Prüfen, ob die Seite überhaupt Ton hat.** In den Einstellungen
   (`/Phomu/settings/audio`) den Regler „Hintergrundmusik" und „Soundeffekte"
   prüfen — beide Schalter stehen per Voreinstellung auf „an".
2. **Prüfen, ob ein anderes Programm den Ton belegt** (Video im Vollbild, anderer
   Tab, Bluetooth-Headset). Der Browser mischt mit dem System-Mixer.3. **Autoplay im Browser erlauben.** In Chrome und Safari die Berechtigung für
   automatische Wiedergabe für die Seite setzen. In Firefox: `about:config` →
   `media.autoplay.default` → `0`.
4. **Einmal klicken.** Der erste Klick auf einen beliebigen Button der Seite
   genügt; danach ist die Audiowiedergabe freigegeben.
5. **Provider prüfen.** YouTube ist der Standard und braucht keine Zugangsdaten.
   Spotify Free und Amazon Music nutzen eine 30-Sekunden-Vorschau, die regional
   eingeschränkt sein kann — dann auf YouTube wechseln
   (`/Phomu/settings/audio`).
6. **YouTube-Wiedergabe prüfen.** Videos, die regional gesperrt sind, liefern
   keinen Ton. Es gibt eine Fallback-Kette auf alternative IDs; hilft sie nicht,
   den Song im Browse-Bereich überspringen
   (`/Phomu/settings/game-rules` → im Spiel: „🎲 Video kaputt? Neu würfeln").

### „Keine Songs verfügbar. Bitte prüfe dein Song-Pack."

Der Pack-Filter hat nichts gefunden. Ursache ist fast immer eine veraltete
Pack-ID aus einer älteren Spielstand-Version. Die alten IDs sind in
`PHOMU_CONFIG.PACK_ALIASES` auf die aktuellen Keys abgebildet. Abhilfe: in der
Lobby **Schritt 3** öffnen, alle Packs ab- und wieder anwählen, oder in der Lobby
**„Reset ↺"** drücken.

### Die Seite ist leer oder zeigt „404"

Fast immer der fehlende Base-Path. Die App liegt unter `/Phomu`:

```text
richtig:   http://localhost:3000/Phomu
falsch:    http://localhost:3000
```

### „Cannot find module" oder „Module not found" nach dem Klon

`node_modules` ist unvollständig. Neu installieren:

```bash
rm -rf node_modules
npm ci
```

### „npm ci" bricht mit einem Lockfile-Fehler ab

```text
npm ci can only install packages when your package.json and package-lock.json … are in sync
```

`package.json` und `package-lock.json` wurden auseinanderbearbeitet. Korrigiere
das mit:

```bash
npm install
git diff package-lock.json      # die Änderung prüfen und mit committen
```

---

## 8. Nächste Schritte

| Ich will … | Dann lies |
|---|---|
| das Spiel verstehen | [`user-guide/USER-GUIDE.de.md`](user-guide/USER-GUIDE.de.md) |
| etwas ändern | [`../WHERE_TO_CHANGE.md`](../WHERE_TO_CHANGE.md) |
| die Regeln kennen | [`../REQUIREMENTS.md`](../REQUIREMENTS.md) |
| die Architektur verstehen | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| einen Begriff nachschlagen | [`../GLOSSARY.md`](../GLOSSARY.md) |
| beitragen | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) |
| Fehler beim Spielen | [`guides/TROUBLESHOOTING.md`](guides/TROUBLESHOOTING.md) |
