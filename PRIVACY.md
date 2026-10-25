# Datenschutzerklärung (Privacy Policy)

**Projekt:** Phomu — hybrides Musik-Partyspiel
**Repository:** <https://github.com/mazer666/Phomu>
**Stand:** 2026-10-25
**Gilt für:** die Web-App unter `/Phomu` (Version 0.1.0, `package.json`)

Diese Erklärung beschreibt, welche Daten Phomu **tatsächlich** verarbeitet.
Jede Aussage ist am Code belegt. Was nicht belegbar war, steht in
Abschnitt 8 („Was in dieser Erklärung nicht belegbar war").

---

## 1. Der kurze Satz

Phomu ist eine **Browser-Anwendung ohne Server**. Es gibt:

- **keine** Benutzerkonten,
- **keine** Analytics, **kein** Tracking, **keine** Telemetrie,
- **keine** Server-Sessions, **keine** Cookies, **keinen** zentralen
  Spielstand,
- **keinen** Phomu-Server, an den Daten gehen.

Der Spielstand liegt im `localStorage` des Browsers. Die einzigen
Netzwerkverbindungen, die der Browser aufbaut, gehen an **Drittanbieter**
(YouTube, Spotify, Amazon Music) — nicht an Phomu.

---

## 2. Null Telemetrie — geprüft, nicht behauptet

Die Zusage „keine Telemetrie" ist nur dann etwas wert, wenn sie nachprüfbar
ist. Die folgenden Prüfungen wurden am 2026-10-25 gegen den Repository-Stand
ausgeführt:

| Prüfung | Kommando | Ergebnis |
|---|---|---|
| Kein Analytics-/Tracking-SDK in den Abhängigkeiten | `grep -nE "analytics\|sentry\|posthog\|mixpanel\|amplitude\|hotjar\|gtag" package.json` | **0 Treffer** |
| Kein Analytics-/Tracking-Code im Quelltext | `grep -rniE "google-analytics\|gtag\|googletagmanager\|sentry\|datadog\|hotjar\|matomo\|plausible\|mixpanel\|segment\.io\|posthog\|amplitude\|clarity\.ms\|fbq" src/` | **0 Treffer** in Code (die einzigen Treffer sind Songtexte in `src/data/songs/J1.json` und `src/data/songs/W2.json`, die „Facebook“ bzw. „Twitter“ im Liedtext erwähnen) |
| Keine externen Requests aus dem Browser-Code | `grep -rn "fetch(" src --include='*.ts' --include='*.tsx'` | **0 Treffer** außerhalb von `src/admin-api/**` (serverseitig) |
| Keine externen Schriftarten | `grep -rn "next/font\|fonts.googleapis\|fonts.gstatic" src/` | **0 Treffer**; in `src/app/globals.css` steht nur `@import "tailwindcss"` — die Schrift wird mitgeliefert |
| Keine externen `<script>`-Tags im JSX | `grep -rn "<script" src --include='*.tsx'` | **0 Treffer**; das einzige externe Skript lädt die App zur Laufzeit selbst: das YouTube-IFrame-API-Skript (`src/components/game/MusicPlayer.tsx`, `loadApi()`) |
| Keine Cookies | `grep -rn "document.cookie\|setCookie\|sendBeacon" src/` | **0 Treffer** |
| Kein `sessionStorage` | `grep -rn "sessionStorage" src/` | **0 Treffer** |
| Kein Service Worker | `grep -rn "serviceWorker" src/` | **0 Treffer** |
| Kein `dangerouslySetInnerHTML` | `grep -rn "dangerouslySetInnerHTML" src/` | **0 Treffer** |

**Was daraus folgt:** Die App sendet von sich aus nichts an einen Phomu-Server.
Es gibt keinen, der etwas annehmen würde. Was der Browser von sich aus tut,
ist in Abschnitt 3 beschrieben.

---

## 3. Welche Daten fließen

### 3.1 Musik-Wiedergabe — die Requests gehen an die Drittanbieter

Phomu stellt **keine** Musikdateien bereit. Die Wiedergabe läuft über die
offiziellen Einbettungen der Streaming-Anbieter. Die Anfrage geht dabei vom
Browser **direkt an den Anbieter**; Phomu ist weder Empfänger noch sieht
Phomu diese Daten.

| Anbieter | Was geladen wird | Fundstelle | Was der Anbieter sieht |
|---|---|---|---|
| **YouTube** | IFrame-API-Skript `https://www.youtube.com/iframe_api` | `src/components/game/MusicPlayer.tsx`, `loadApi()` | IP-Adresse, Cookies, ggf. eingeloggt der Google-/YouTube-Account |
| **YouTube** | Embed-Frame `https://www.youtube.com/embed/<id>` | `src/components/game/MusicPlayer.tsx`, `new window.YT.Player(…, { playerVars: { host: https://${activeDomain} } })`; `src/components/browse/SongCard.tsx`, `src={`https://www.youtube.com/embed/${song.links.youtube}…`}` | dito, zusätzlich das Abspielverhalten |
| **YouTube Music** | alternatives Player-Frame `https://music.youtube.com/embed/<id>` | `src/components/game/MusicPlayer.tsx`, State `activeDomain` + `toggleDomain()` | dito |
| **Spotify** | Embed-Frame `https://open.spotify.com/embed/track/<id>` | `src/components/game/MusicPlayer.tsx`, `src={`https://open.spotify.com/embed/track/${spotifyTrackId}…`}` | IP-Adresse, Cookies, ggf. der Spotify-Account |
| **Spotify** | Preview-Audio `https://p.scdn.co/mp3-preview/…` (7 Einträge im Katalog) | `src/components/game/MusicPlayer.tsx`, `<audio src={spotifyFreePreview}>`; Katalog z. B. `src/data/songs/E4.json` | IP-Adresse, Cookies |
| **Amazon Music** | Embed-Frame `https://music.amazon.com/embed/track/<id>` | `src/components/game/MusicPlayer.tsx`, `src={`https://music.amazon.com/embed/track/${amazonTrackId}…`}` | IP-Adresse, Cookies, ggf. der Amazon-Account |
| **Amazon Prime** | Preview-Audio (`<audio src=…>`), Host variabel | `src/components/game/MusicPlayer.tsx`, `<audio src={amazonPrimePreview}>` | IP-Adresse, Cookies |
| **Apple Music** | **nur ein Link**, kein Embed | `src/types/song.ts` (`links.appleMusic`), `src/config/game-config.ts` (`'apple-music'` mit dem Kommentar „Future: requires Apple Developer Account“) | Beim Anklicken: der normale Besuch der Apple-Music-Seite |

Diese Datenflüsse werden durch die **Content-Security-Policy** in
`next.config.ts:35-42` auf genau diese Origins begrenzt (siehe
`SECURITY.md`, Abschnitt 6). Einschränkung: Die Header werden beim statischen
Export derzeit **nicht** ausgeliefert (`SECURITY.md`, Abschnitt 4.6).

Die Datenschutzerklärungen der Anbieter gelten für diese Flüsse, nicht für
Phomu: <https://policies.google.com/privacy> (YouTube),
<https://www.spotify.com/privacy/> (Spotify),
<https://www.amazon.com/privacy> (Amazon).

### 3.2 Lokale Daten (`localStorage`)

Alles, was Phomu speichert, steht im `localStorage` des Browsers. Es verlässt
das Gerät nicht, außer der Nutzer überträgt es selbst (Export im Admin-Tool,
Abschnitt 3.4).

| Schlüssel | Was darin steht | Fundstelle |
|---|---|---|
| `phomu-game-state` | Spielernamen und -punkte, Teams, Spielkonfiguration, Session-ID, XP, bevorzugter Player-Typ und Musik-Provider, Audio- und SFX-Einstellungen, Rundenzahl, Timeline-Jahre, Startzeitpunkt | `src/stores/game-store.ts:618-637` |
| `phomu-admin-songs` | Im Admin-Tool bearbeitete Songdatensätze (Titel, Interpret, Jahr, Links, Hints, Lyrics) | `src/app/admin/songs/page.tsx` und `src/app/browse/page.tsx`, Konstante `STORAGE_KEY` |
| `phomu-review-edits` | Review-Änderungen an Songdatensätzen | `src/app/admin/review/page.tsx`, Konstante `STORAGE_KEY` |
| `phomu-theme` | das gewählte Design (jackbox, spotify, youtube, musicwall) | `src/contexts/ThemeContext.tsx`, Konstante `STORAGE_KEY` |
| `phomu-device-id` | eine zufällige UUID, die nur für die Meldefunktion erzeugt wird | `src/components/game/MusicPlayer.tsx`, Konstante `DEVICE_KEY` |
| `phomu-missing-report-state-v1` | Zeitstempel und Song-IDs bereits gemeldeter Links (max. 5 Meldungen je Stunde und Gerät) | `src/components/game/MusicPlayer.tsx`, Konstante `REPORT_KEY` |
| `i18nextLng` | die gewählte Sprache (`de` oder `en`) | `src/i18n/config.ts`, `detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] }`; Standardschlüssel des Sprachdetektors `i18next-browser-languagedetector` |

**Nicht** gespeichert werden: `currentSong`, `currentAnswers` und
`roundHistory` — sie stehen nicht in `partialize`
(`src/stores/game-store.ts`). Der Anti-Spoiler-Schutz lässt sich deshalb nicht
über einen Neustart hinweg aushebeln.

### 3.3 Admin-API

Die Admin-API (`src/admin-api/**`) ist die einzige Stelle, an der Phomu
Daten auf einem Server verarbeitet — und sie hat derzeit **keinen
Konsumenten** und keinen erreichbaren Endpunkt (siehe `SECURITY.md`,
Abschnitt 5, Punkt 1). Für den Fall, dass sie später aktiviert wird:

- Sie fragt **nur** mit gültigem Token (`x-admin-token`) ab.
- Sie ruft bei der Cover-Suche `https://itunes.apple.com/search` und
  `https://api.deezer.com/search` ab (`src/admin-api/admin/covers/search/route.ts`,
  `itunesUrl` / `deezerUrl`). Dabei gehen **Artist und Titel des gesuchten
  Songs** an Apple und Deezer — an keinen Phomu-Server.
- Sie lädt ein Cover von einer festen Allowlist
  (`mzstatic.com`, `is1-ssl.mzstatic.com`, `cdn-images.dzcdn.net`,
  `dzcdn.net`, Konstante `ALLOWED_IMAGE_HOSTS` in
  `src/admin-api/admin/covers/save/route.ts`) und legt es unter
  `public/covers/` ab.
- Der Admin-Token selbst ist eine Server-Umgebungsvariable und wird **nie**
  an den Browser ausgeliefert.

### 3.4 „Fehlenden Link melden“ — eine Nutzeraktion, die Daten nach außen gibt

Wenn ein Song nicht abgespielt werden kann, bietet die Oberfläche die
Schaltfläche „Report Missing" an. Der Nutzer löst das **bewusst** aus. Die App
baut dabei einen JSON-Payload (`issuePayload` in
`src/components/game/MusicPlayer.tsx`) mit:

- Song-ID, Titel, Interpret, Pack,
- der bevorzugten Provider-Auswahl und den booleschen Angaben, welche
  Links vorhanden sind,
- **Zeitzone**, **Locale** und **Region** (aus `navigator.language`),
- einer **Geräte-ID** (`phomu-device-id`, eine zufällige UUID),
- einem Zeitstempel.

Dieser Payload geht **nicht** an einen Phomu-Server. Ist
`NEXT_PUBLIC_GITHUB_ISSUE_URL` gesetzt (`src/components/game/MusicPlayer.tsx`),
öffnet die App ein vorbefülltes GitHub-Issue in einem neuen Tab
(`window.open(issueUrl…)`) — der Nutzer muss es dort abschicken. Ist die
Variable nicht gesetzt, landet der Payload in der Zwischenablage
(`navigator.clipboard.writeText(…)`).

Das ist die einzige Stelle, an der **Spieldaten** das Gerät verlassen. Die
Media-Embeds übertragen ohnehin IP-Adresse und Cookies an ihre Anbieter
(Abschnitt 3.1) — das ist vom Nutzer nicht abschaltbar.

### 3.5 Export der eigenen Daten

Im Admin-Tool (`/admin/songs`) gibt es einen JSON-Export der bearbeiteten
Songs (`handleExport()` in `src/app/admin/songs/page.tsx`). Der Export entsteht
im Browser über ein `Blob` und einen Download — es wird nichts hochgeladen.

---

## 4. Was **nicht** fließt

| Nicht vorhanden | Beleg |
|---|---|
| Keine Benutzerkonten, keine Anmeldung, keine Registrierung | `grep -rniE "signIn\|signUp\|logIn\|login" src/` → keine Anmeldefunktion; die einzigen Treffer sind der Kommentar „Players are anonymous by default — no login required“ (`src/types/player.ts`) und ein Test-Fixture. Die einzige Auth im Projekt ist der Admin-Token (`src/admin-api/_lib/security.ts:61`). |
| Keine Analytics, kein Tracking, keine Telemetrie | Abschnitt 2 |
| Keine Server-Sessions, keine Cookies, kein `sessionStorage` | Abschnitt 2 |
| Kein zentraler Spielstand, keine Server-Datenbank | Der Store ist ein reiner Browser-Store (`src/stores/game-store.ts`) |
| Keine Werbung, kein Third-Party-Tracking | `package.json` enthält keine Werbe- oder Tracking-Abhängigkeit |
| Keine Geolokalisierung | In der App wird die Geolokalisierung nicht benutzt; `Permissions-Policy` schaltet sie ab (`next.config.ts:55-57`). Der einzige Treffer für „geolocation“ in `src/` ist der eigene Test der Header (`src/admin-api/security-headers.test.ts:58`). |
| Keine Mikrofonaufnahme | `Permissions-Policy: microphone=()` (`next.config.ts:56`) |
| Keine Push-Benachrichtigungen, kein Service Worker | `grep -rn "serviceWorker\|PushManager" src/` → 0 Treffer |
| Keine Kontaktaufnahme durch den Betreiber | Es gibt keinen Server, keine Adressliste, keinen Newsletter |
| Keine personenbezogene Auswertung von Spielverläufen | Es gibt keine Auswertung; es gibt keine Daten, die ausgewertet werden könnten |

---

## 5. Wie man die lokalen Daten löscht

Phomu hat **keinen** Server, deshalb gibt es auch kein „Konto löschen". Die
Daten liegen im Browser und werden dort gelöscht.

| Was löschen | Wie |
|---|---|
| **Alles** (Spielstand, Theme, Sprache, Admin-Bearbeitungen, Geräte-ID, Meldehistorie) | In den Browser-Einstellungen die **Websitedaten / Site-Daten** für die Herkunft löschen. Alternativ in der Browser-Konsole: `localStorage.clear()` und die Seite neu laden. |
| **Nur den Spielstand** | `localStorage.removeItem('phomu-game-state')` und die Seite neu laden. |
| **Nur den Admin-Stand** | Im Admin-Tool `/admin/songs` die Schaltfläche zum Zurücksetzen benutzen (`handleReset` in `src/app/admin/songs/page.tsx`) — das entfernt `phomu-admin-songs`. |
| **Nur die XP** | In den Einstellungen unter „Konto" die Zurücksetzen-Schaltfläche (`resetProgress()` in `src/app/settings/account/page.tsx`). **Achtung:** Das setzt **nur** den XP-Zähler zurück, nicht den ganzen Spielstand. |
| **Nur Theme und Sprache** | `localStorage.removeItem('phomu-theme')` bzw. `localStorage.removeItem('i18nextLng')`. |

Nach dem Löschen ist der nächste Start eine frische Sitzung: keine Spieler,
keine Punkte, keine XP.

**Rechtliche Lage:** Da Phomu keine personenbezogenen Daten auf einem Server
speichert, gibt es keine Daten, die der Betreiber löschen könnte. Die
Löschung nach Art. 17 DSGVO ist eine Sache des Geräts — und damit eine Sache
von dir. Weil die Daten ausschließlich lokal liegen, ist diese Erklärung
zugleich die vollständige Antwort auf eine Auskunftsanfrage: Die Daten, die
über dich gespeichert sind, stehen auf deinem Gerät.

---

## 6. Karten — was die App von einer physischen Karte speichert

Phomu-Karten sind 59 × 91 mm mit 3 mm Beschnitt (`src/config/game-config.ts`,
`docs/guides/PRINTING-GUIDE.md`). Auf der **Rückseite** steht ein QR-Code.
Der Scanner versteht genau drei Formate (`src/utils/qr-intent.ts`):

| QR-Inhalt | Was die App damit macht | Was gespeichert wird |
|---|---|---|
| `@Anna` | legt „Anna" als Spieler in der Lobby an | der **Spielername** im Spielstand (`phomu-game-state` → `players[].name`) |
| `…?pack=Rock Anthemes` | wählt das Pack in der Lobby aus | die **Pack-ID** (ein Katalogbezeichner, keine Personendaten) in `config.selectedPacks` |
| `…?session=123456` | wird erkannt, aber **nicht** ausgeführt (eine Sitzung läuft heute nur auf einem Gerät) | nichts |
| `…?id=<Song-ID>` | wird ausdrücklich als **nicht unterstützt** abgelehnt | nichts |

Der Karteninhalt selbst — Songtitel, Interpret, Cover, Pack-Zuordnung — ist
**Druckdaten**, kein Nutzerdatum. Der QR-Code enthält den Pack-Kontext, nicht
den Song (`docs/guides/PRINTING-GUIDE.md`, Abschnitt 4).

**Wichtig:** Ein QR-Code kann beliebigen Text enthalten. Wird eine fremde
Karte gescannt, kann ein beliebiger Name als Spielername in die Lobby
eingetragen werden. Der Name landet dann im lokalen Spielstand — er verlässt
das Gerät nur, wenn der Nutzer ihn selbst exportiert.

---

## 7. Der Admin-Token

`ADMIN_API_TOKEN` ist ein **Server-Geheimnis**, keine Nutzerdaten.

- Es ist eine Umgebungsvariable des Betreibers, keine `NEXT_PUBLIC_*`-Variable
  (`grep -rn "NEXT_PUBLIC" src` → nur die Issue-URL in
  `src/components/game/MusicPlayer.tsx`).
- Es wird nie an den Browser ausgeliefert, nie geloggt und nie in eine
  Fehlermeldung geschrieben (`src/admin-api/_lib/security.ts:84-100`;
  Test: `src/admin-api/admin-token-guard.test.ts` → „haelt den Tokenwert aus
  Antwort und Log heraus“).
- Es muss mindestens 32 Zeichen lang sein, sonst antwortet die API mit 503
  (`src/admin-api/_lib/security.ts:66-68`).
- Erzeugen: `npm run security:rotate-admin-token`
  (`scripts/generate-admin-token.js`) — der Token wird auf der Konsole
  ausgegeben und gehört danach in den Secret-Store des Betreibers, **nicht**
  ins Repository.
- Der Token gehört dem Betreiber, nicht der Spielerin. Er wird nie
  erhoben, nie an Dritte übertragen und nie in den lokalen Daten gespeichert.

Details zur Härtung der Admin-API stehen in `SECURITY.md`.

---

## 8. Kontakt für Datenschutzanfragen

Phomu wird von einem einzelnen Maintainer gepflegt. Für eine
Datenschutzanfrage gibt es zwei Wege:

1. **Issue im Repository** — <https://github.com/mazer666/Phomu/issues>.
   Öffentlich, transparent, für alles, was nicht vertraulich ist. Für
   Datenschutzanfragen ist das der normale Weg.
2. **Private Nachricht an den Owner** über das Repository
   (<https://github.com/mazer666/Phomu>) — für Anfragen, die nicht öffentlich
   sein sollen.

Für Meldungen mit Sicherheitsbezug gilt zusätzlich der Meldeweg aus
`SECURITY.md`, Abschnitt 7.

---

## 9. Was in dieser Erklärung **nicht** belegbar war

Ehrliche Liste der Grenzen dieser Erklärung:

1. **Die Drittanbieter-Datenflüsse sind nicht kontrollierbar.** Was YouTube,
   Spotify und Amazon mit IP-Adresse und Cookies machen, ist außerhalb des
   Projekts. Belegbar ist nur, *dass* Phomu diese Anbieter aufruft und an
   wen.
2. **Die tatsächliche Auslieferung der Security-Header ist nicht belegbar.**
   Die Header sind in `next.config.ts` konfiguriert, werden beim statischen
   Export aber nicht ausgeliefert (`SECURITY.md`, Abschnitt 4.6). Deshalb
   steht in Abschnitt 3.1 „begrenzt“ mit dem Verweis auf die Einschränkung,
   nicht „blockt“.
3. **Über die Vergangenheit des Projekts gibt es keine Daten.** Diese
   Erklärung beschreibt den Stand vom 2026-10-25. Ob es in der Vergangenheit
   eine Phase mit Serverbetrieb gab, ist aus dem Repository nicht
   belegbar — es gibt keine Datenbank, keine Migration und kein
   Nutzerverzeichnis im Repository.
4. **Die GitHub-Issues enthalten Nutzerinhalte.** Ein gemeldeter
   fehlender Link landet in einem öffentlichen Repository-Issue. Wer
   „Fehlenden Link melden" benutzt, veröffentlicht damit die in Abschnitt 3.4
   aufgeführten Angaben — inklusive Zeitzone, Locale, Region und Geräte-ID.
   Das ist eine bewusste Entscheidung des Nutzers, aber sie ist nicht
   rückgängig zu machen, wenn das Issue einmal erstellt ist.
5. **Die Zugriffe der Drittanbieter sind nicht messbar.** Wie viele Nutzer
   Phomu benutzen, wie lange sie spielen und welche Songs sie wählen, ist
   **nicht** messbar — genau weil es keine Telemetrie gibt. Das ist kein
   Mangel, sondern der gewählte Zustand.

---

## 10. Änderungen dieser Erklärung

Jede Änderung dieser Erklärung ist eine Änderung am Repository, mit Datum im
Kopf dieser Datei. Die Version im Browser (`/privacy`) und die Version im
Repository können kurzfristig auseinanderlaufen; **maßgeblich ist die Datei
`PRIVACY.md` im Repository**, weil die Browser-Fassung nur einen Auszug
darstellt.

## 11. Weiterführende Dokumente

- `SECURITY.md` — Bedrohungsmodell, Härtungsstand, Meldeweg.
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` — die Fassung, die die
  Nutzerin im Browser liest.
- `docs/guides/PRINTING-GUIDE.md` — das Format der QR-Codes auf den Karten.
