# Sicherheitsrichtlinie (Security Policy)

**Projekt:** Phomu — hybrides Musik-Partyspiel
**Repository:** <https://github.com/mazer666/Phomu>
**Stand:** 2026-10-25
**Gilt für:** den Stand im Branch `feature/vocument-style-docs-and-i18n`

Dieses Dokument beschreibt, **was Phomu tatsächlich absichert** und **was es
nicht absichert**. Jede Aussage unter „Was bereits abgesichert ist" ist an
einer Datei und Zeile im Repository belegt. Was nicht belegt werden konnte,
steht unter „Was nicht abgesichert ist" — das ist kein Makel, das ist die
Aussage.

**Zu den Zeilenangaben:** Sie beziehen sich auf den Repository-Stand vom
2026-10-25. In Dateien, die parallel bearbeitet werden
(`src/components/game/**`, `src/components/browse/**`, `src/app/**`), steht
deshalb zusätzlich das Symbol (Variablenname, Funktionsname, URL), damit die
Fundstelle auch nach einer Zeilenverschiebung auffindbar bleibt.

---

## 1. Was Phomu ist

Phomu ist ein reines Browser-Spiel: eine Next.js-App, die als statischer
Export (`output: 'export'`, `next.config.ts:64`) auf GitHub Pages unter dem
Pfad `/Phomu` liegt. Es gibt **keinen Phomu-Server**, keine Accounts, keine
Synchronisation zwischen Geräten. Die Spiellogik, der Katalog und der
Spielzustand laufen vollständig im Browser.

Aus dieser Architektur folgt der wichtigste Satz dieses Dokuments:

> Phomu ist eine **Client-Anwendung ohne Autoritätsserver**. Jede Grenze, die
> nur im Browser gezogen wird, ist eine Grenze, die ein Benutzer mit
> Developer-Tools aufheben kann.

Die einzige serverseitige Grenze im Projekt ist die Admin-API
(`src/admin-api/**`). Sie wird nicht vom Spiel benutzt und ist derzeit nicht
erreichbar (siehe Abschnitt 5, Punkt 1).

---

## 2. Trust Boundaries

| # | Grenze | Was auf der einen Seite liegt | Was auf der anderen Seite liegt |
|---|---|---|---|
| **TB-1** | Admin-API gegen das Internet | Der Admin-Token (`ADMIN_API_TOKEN`), die Allowlist der Cover-Hosts, das Dateisystem des Servers | Eingehende Requests aus dem Netz |
| **TB-2** | Katalog- und Cover-Daten gegen den Admin | Die JSON-Packs unter `src/data/songs/`, die Cover unter `public/covers/` | Der Admin-Import (iTunes-/Deezer-Antworten, Cover-URLs) |
| **TB-3** | Client gegen manipulierten localStorage-Stand | Der Browser des Benutzers | `localStorage`: Spielstand, Punkte, Spieler, Konfiguration |
| **TB-4** | Fremde URLs als SSRF-/Tracking-Vektor | Der Server der Admin-API, der Browser | YouTube, Spotify, Amazon Music, Apple Music, `p.scdn.co` |
| **TB-5** | QR-Scan-Eingaben | Der Scanner (`src/utils/qr-intent.ts`) | Der Inhalt eines beliebigen QR-Codes, den jemand auf ein Poster druckt |

### TB-1 — Admin-API gegen das Internet

Die Admin-API ist die einzige Stelle, an der Phomu Daten *verändert*. Sie
kommt über den Header `x-admin-token` gegen die Umgebungsvariable
`ADMIN_API_TOKEN` geschützt (`src/admin-api/_lib/security.ts:61-79`).

### TB-2 — Katalog- und Cover-Daten gegen den Admin

Der Admin darf Cover-URLs angeben. Diese URL wird vom Server abgerufen und
als Datei abgelegt. Das ist ein klassischer SSRF-Vektor, wenn die Prüfung nur
die erste URL betrachtet. Die Prüfung erfolgt deshalb pro Hop
(`src/admin-api/_lib/security.ts:280-310`).

### TB-3 — Client gegen manipulierten localStorage-Stand

Der Spielstand liegt in `localStorage` unter dem Schlüssel `phomu-game-state`
(`src/stores/game-store.ts:619`). Wer diesen Wert bearbeitet, bearbeitet
Punkte, Spielernamen und Spielregeln. Das ist eine bewusste Designentscheidung
(siehe Abschnitt 5, Punkt 3).

### TB-4 — Fremde URLs als SSRF-/Tracking-Vektor

Drei verschiedene Zugriffe auf Dritte gibt es:

1. **Der Browser lädt die Media-Embeds.** YouTube (IFrame-API-Skript und
   Embed-Frame), Spotify (Embed-Frame, Preview-Audio), Amazon Music
   (Embed-Frame). Dabei sieht der Anbieter IP-Adresse und Cookies. Phomu hat
   darauf keinen Einfluss und erhebt diese Daten auch nicht selbst.
2. **Der Admin-API-Server ruft iTunes und Deezer ab**
   (`src/admin-api/admin/covers/search/route.ts:77`, `:95`) — nur bei
   angemessenem Token.
3. **Der Nutzer meldet einen fehlenden Link.** Der Nutzer löst das selbst aus;
   der Payload geht an GitHub, nicht an Phomu (siehe `PRIVACY.md`, Abschnitt 4).

### TB-5 — QR-Scan-Eingaben

`parseQrIntent` (`src/utils/qr-intent.ts`) liest beliebige Strings aus der
Kamera. Es werden vier Formate erkannt: `@Name`, `?session=…`, `?pack=…` und
`?id=…` (das letzte ausdrücklich als *nicht unterstützt*).

---

## 3. Bedrohungsmodell

| Angriffsfläche | Angreifer | Eintrittspunkt | Schadenspotenzial | Gegenmaßnahme | Status |
|---|---|---|---|---|---|
| Admin-API: Token-Brute-Force (**F-04**) | Unbefugter im Internet | `x-admin-token` an jeder Admin-Route | Vollzugriff auf Cover-Import und Katalogmutation | Token-Vergleich in konstanter Zeit (`security.ts:47-51`), Mindestlänge 32 (`security.ts:7`, `:66`), Fehlversuche werden pro Client und global gezählt (`security.ts:84-100`) | **abgesichert (Rate-Limit nur pro Instanz)** |
| Admin-API: SSRF über Cover-URL (**F-02**) | Angreifer mit gültigem Token oder kompromittiertem Cover-Host | `imageUrl` in `POST /admin/covers/save` | Zugriff auf interne Dienste (Metadaten-Endpoint, interne APIs) des Admin-Servers | HTTPS-Pflicht, Host-Allowlist, **Prüfung jedes Redirect-Hops**, maximal 3 Hops (`security.ts:280-310`) | **abgesichert** (vorher nur die erste URL geprüft) |
| Admin-API: DoS durch große Datei (**F-03**) | Angreifer mit gültigem Token | Cover-Download | Speicher- und Plattenfüllung des Servers | Streamendes Lesen mit harter Grenze 5 MB (`security.ts:211-250`), JSON-Antworten auf 512 KB begrenzt (`search/route.ts:77`, `:95`) | **abgesichert** |
| Admin-API: Lock-Festststellung (**F-11**) | Absturz des Prozesses während eines Speichervorgangs | `.covers-save.lock` | Cover-Speicherung dauerhaft blockiert (503) | Veraltete Sperre (älter als 120 s) wird erkannt und aufgehoben (`save/route.ts:31`, `:69-77`) | **abgesichert** |
| Admin-API: Fehlerinformationen (**F-10**) | Angreifer mit gültigem Token | Fehlerantworten der Routen | Offenlegung interner Pfade, Dateinamen, Stackanteile | Unerwartete Fehler werden serverseitig geloggt und ohne Detailantwort beantwortet (`save/route.ts:165-167`, `search/route.ts:121-123`) | **abgesichert** |
| Browser: XSS über Katalog- oder Spielerdaten (**F-12**) | Angreiber, der Daten in den Katalog oder in den lokalen Stand bringt | Song-Titel, Spielernamen, Hints | Ausführung von Skripten im Kontext des Benutzers | React escaped alle Textausgaben; `object-src 'none'` in der CSP; keine `dangerouslySetInnerHTML` im Projekt (`grep -rn "dangerouslySetInnerHTML" src` → 0 Treffer) | **teilweise abgesichert** (siehe Abschnitt 4) |
| Browser: manipulierter Spielstand (**F-15**) | Teilnehmer einer Partysession | `localStorage["phomu-game-state"]` | Punkte, Spieler, Spielmodus, XP manipulieren | Keine. Der Server kennt den Spielstand nicht. | **nicht abgesichert (Design)** |
| Browser: QR-Code eines Angreifers | Person mit Zugang zur Kamera | `parseQrIntent` | Unbegrenzt lange Strings in die Oberfläche; Pack-Auswahl | Keine Längenbegrenzung in `parseQrIntent` vorhanden | **nicht abgesichert** (Finding **F-06**) |
| Browser: Datenspur bei Drittanbietern | YouTube, Spotify, Amazon | Media-Embeds | IP-Adresse, Cookies, Abspielverhalten beim Anbieter | Keine. Phomu hat keinen Einfluss auf die Embeds. | **nicht abgesichert (extern)** |
| Datenschutz: Geräte-Fingerprint im Fehlerreport | Nutzer, der „Fehlenden Link melden" klickt | `src/components/game/MusicPlayer.tsx` (Schlüssel `DEVICE_KEY`, `REPORT_KEY`, Payload `issuePayload`) | Geräte-ID, Zeitzone, Locale und Region verlassen das Gerät (über GitHub) | Keine. Der Nutzer löst den Vorgang selbst aus. | **nicht abgesichert** (Finding **F-07**) |
| Lieferkette: GitHub Actions | Kompromittierter Maintainer-Zugang oder manipulierte Dependency | `.github/workflows/deploy.yml` | Ausführung beliebigen Codes im Build | `permissions` sind auf `contents: read` reduziert, `concurrency` verhindert Parallel-Deploys | **teilweise abgesichert** (Actions sind nicht per SHA gepinnt, Finding **F-08**) |
| Abhängigkeiten | Angreifer über eine transitive Dependency | `npm install` | Ausführung im Build oder im Browser | `npm audit --omit=dev --audit-level=moderate` → **0 Schwachstellen** (gemessen 2026-10-25). Mit Dev-Abhängigkeiten: 14 Meldungen (9 high), alle in `vite`/`launch-editor`/`zod`. | **teilweise abgesichert** (Finding **F-09**) |
| Auslieferung: fehlende Security-Header (**F-05**) | Angreifer, der eine Schwachstelle in der App findet | HTTP-Header der ausgelieferten Dateien | Fehlende Härtung gegen Clickjacking, MIME-Sniffing, Referrer-Leaks | Header sind in `next.config.ts:24-59` definiert — **werden beim statischen Export aber nicht ausgeliefert** | **nicht wirksam** (Finding **F-05**) |

### 3.1 Übersicht der Findings

Die vollständige Beschreibung mit Angriffspfad, Schadenspotenzial, Fix und
Testname steht in der Übergabe an den Owner. Hier nur die Zuordnung:

| ID | Kurztitel | Schwere | Stand |
|---|---|---|---|
| **F-01** | Admin-API ist nicht erreichbar (kein wirksamer Token-Schutz) | High | offen, bewusst nicht behoben |
| **F-02** | SSRF über Redirect beim Cover-Download | Medium | **behoben** |
| **F-03** | DoS durch ungebremsten Download-Body | Medium | **behoben** |
| **F-04** | Kein Rate-Limiting an der Admin-API | Medium | **behoben** (nur pro Instanz wirksam) |
| **F-05** | Security-Header werden beim statischen Export nicht ausgeliefert | Medium | Konfiguration steht, Auslieferung offen |
| **F-06** | QR-Eingaben ohne Längen- oder Formatgrenze | Low | offen, Datei außerhalb des Arbeitsbereichs |
| **F-07** | Geräte-ID, Zeitzone und Locale im Fehlerreport | Low | offen, Datei außerhalb des Arbeitsbereichs |
| **F-08** | GitHub Actions nicht per SHA gepinnt | Low | offen |
| **F-09** | 14 Schwachstellen in den Dev-Abhängigkeiten | Low | offen (Produktion ist sauber) |
| **F-10** | Interne Fehlerdetails in der API-Antwort | Low | **behoben** |
| **F-11** | Verwaiste Sperrdatei blockiert alle Cover-Speicherungen | Low | **behoben** |
| **F-12** | Keine harten Grenzwerte in den Song-Validatoren | Low | **behoben** |
| **F-13** | CI führt keine Security-Checks aus | Medium | offen |
| **F-14** | Admin-Token wird bei der Erzeugung auf stdout ausgegeben | Info | bewusst so, mit Hinweis |
| **F-15** | Spielstand ist vom Benutzer manipulierbar | Info | Designentscheidung |
| **F-16** | Veralteter Katalog-Prüfbericht (`specifications/catalog_issues_report.json`) | Info | offen, Datei außerhalb des Arbeitsbereichs |

---

## 4. Was bereits abgesichert ist

Alle Angaben mit Datei und Zeile. Die negativen Tests sind unter
`src/admin-api/*.test.ts` und `src/utils/validate-song-limits.test.ts` zu finden.

### 4.1 Token-Gate der Admin-API

| Maßnahme | Ort | Negativer Test |
|---|---|---|
| Fehlender Token → **401** | `src/admin-api/_lib/security.ts:71-74` | `src/admin-api/admin-token-guard.test.ts` → „weist einen Request ohne Token ab (401)“ |
| Falscher Token → **401** | `src/admin-api/_lib/security.ts:71-74` | `src/admin-api/admin-token-guard.test.ts` → „weist einen Request mit falschem Token ab (401)“ |
| Nicht konfiguriert → **503** (fail closed) | `src/admin-api/_lib/security.ts:62-64` | `src/admin-api/admin-token-guard.test.ts` → „fail-closed: ohne konfigurierte Env-Variable antwortet die API mit 503“ |
| Token kürzer als 32 Zeichen → **503** | `src/admin-api/_lib/security.ts:66-68` | `src/admin-api/admin-token-guard.test.ts` → „fail-closed: ein zu kurzer Token antwortet mit 503“ |
| Vergleich in konstanter Zeit (`crypto.timingSafeEqual` über SHA-256-Digests, damit die Puffer immer gleich lang sind) | `src/admin-api/_lib/security.ts:47-51` | `src/admin-api/admin-token-guard.test.ts` → „vergleicht den Token ohne timingSafeEqual nicht mit ===“ und „weist einen Token ab, der nur ein Zeichen korrekt hat (401)“ |
| **Kein Token im Log und keine Tokenwerte in Fehlermeldungen** | `src/admin-api/_lib/security.ts:84-100` (Meldung enthält weder Token noch IP) | `src/admin-api/admin-token-guard.test.ts` → „haelt den Tokenwert aus Antwort und Log heraus“ |
| Token nur als Server-Env-Variable, **kein** `NEXT_PUBLIC_*` | `src/admin-api/_lib/security.ts:62` | `grep -rn "NEXT_PUBLIC" src` → nur `MusicPlayer.tsx` (`NEXT_PUBLIC_GITHUB_ISSUE_URL`, Issue-URL, kein Token) |
| Token-Erzeugung mit 32 Zufallsbytes, Mindestlänge 16 Bytes | `scripts/generate-admin-token.js:4-10` | — |

> **Hinweis zum `.env.example`:** Der Platzhalter
> `ADMIN_API_TOKEN=replace-with-long-random-token` ist **30 Zeichen** lang und
> damit kürzer als die Mindestlänge 32. Wird die Datei unverändert übernommen,
> antwortet die API mit **503** und nicht mit einem offenen Zugang. Das ist
> beabsichtigt (fail closed).

### 4.2 Rate-Limiting der Admin-API

| Maßnahme | Ort | Negativer Test |
|---|---|---|
| Fehlversuche pro Client: 10 je 5 Minuten | `src/admin-api/_lib/security.ts:19`, `:85` | `src/admin-api/admin-token-guard.test.ts` → „begrenzt Brute-Force-Versuche pro Client (429 nach 10 Fehlversuchen)“ |
| Fehlversuche global je Instanz: 100 je 5 Minuten — nicht durch gefälschte `x-forwarded-for`-Header umgehbar | `src/admin-api/_lib/security.ts:25`, `:86` | `src/admin-api/admin-token-guard.test.ts` → „begrenzt Brute-Force-Versuche auch dann, wenn x-forwarded-for gefaelscht wird“ |
| Cover-Suche: 30 Anfragen je Minute und Client | `src/admin-api/admin/covers/search/route.ts:43`, `:59` | `src/admin-api/admin-routes-hardening.test.ts` → „antwortet bei zu vielen Suchanfragen mit 429“ |
| Cover-Speicherung: 10 Anfragen je Minute und Client | `src/admin-api/admin/covers/save/route.ts:34`, `:121` | `src/admin-api/admin-routes-hardening.test.ts` → „antwortet bei zu vielen Speicheranfragen mit 429“ |
| Die Zahl der gespeicherten Buckets ist begrenzt (10 000), ein Angreifer kann den Speicher nicht unbegrenzt aufblähen | `src/admin-api/_lib/rate-limit.ts:43`, `:65-77` | `src/admin-api/admin-rate-limit.test.ts` → „begrenzt die Zahl der gespeicherten Keys (kein unbegrenztes Wachstum)“ |
| Antwort mit `Retry-After` | `src/admin-api/_lib/security.ts:96-100`, `:104-117` | `src/admin-api/admin-rate-limit.test.ts` → „antwortet mit 429 und Retry-After, wenn die Grenze ueberschritten ist“ |

### 4.3 Eingabevalidierung der Admin-API

| Maßnahme | Ort | Negativer Test |
|---|---|---|
| `songId`: nur Buchstaben, Ziffern, `-`, `_`; 3–120 Zeichen — **kein `.`, kein `/`**, damit keine Pfad-Traversal möglich ist | `src/admin-api/_lib/security.ts:125-130` | `src/admin-api/admin-routes-hardening.test.ts` → „lehnt eine songId mit Pfadanteilen ab“ |
| Cover-URL: nur `https:` | `src/admin-api/_lib/security.ts:155` | `src/admin-api/cover-fetch-guard.test.ts` → „lehnt eine URL mit einem anderen Schema ab (file:, data:, javascript:)“, `src/admin-api/admin-routes-hardening.test.ts` → „lehnt eine Klartext-URL ab“ |
| Cover-URL: keine eingebetteten Zugangsdaten (`user:pass@…`) | `src/admin-api/_lib/security.ts:157` | `src/admin-api/cover-fetch-guard.test.ts` → „lehnt eingebettete Zugangsdaten ab“ |
| Cover-URL: Host-Allowlist (`mzstatic.com`, `is1-ssl.mzstatic.com`, `cdn-images.dzcdn.net`, `dzcdn.net`) inklusive Subdomains | `src/admin-api/_lib/security.ts:136-143`, `src/admin-api/admin/covers/save/route.ts:18` | `src/admin-api/cover-fetch-guard.test.ts` → „lehnt eine URL mit einem nicht erlaubten Host ab“, „lehnt eine URL mit einem Host ab, der nur als Endung passt“ |
| Interne Adressen (`localhost`, `127.0.0.1`, `169.254.169.254`, `[::1]`) sind nicht auf der Allowlist | `src/admin-api/_lib/security.ts:136-143` | `src/admin-api/cover-fetch-guard.test.ts` → „lehnt localhost und interne Adressen ab“ |
| **Redirects werden manuell verfolgt, jeder Hop wird neu geprüft**, maximal 3 Hops | `src/admin-api/_lib/security.ts:280-310` | `src/admin-api/cover-fetch-guard.test.ts` → „bricht einen Redirect in das interne Netz ab (SSRF)“, „bricht einen Redirect auf einen nicht erlaubten Host ab“, „bricht einen Redirect auf Klartext-HTTP ab“, „folgt einem Redirect innerhalb der Allowlist“, „bricht eine Redirect-Schleife nach der Hop-Grenze ab“ |
| Antwort muss `image/*` sein | `src/admin-api/_lib/security.ts:311-314` | `src/admin-api/cover-fetch-guard.test.ts` → „lehnt eine Antwort ab, die kein Bild ist“ |
| Harte Größengrenze 5 MB, **streamend** geprüft (auch ohne `content-length`) | `src/admin-api/_lib/security.ts:13`, `:211-250` | `src/admin-api/cover-fetch-guard.test.ts` → „lehnt eine zu grosse Datei ab, die ihre Groesse selbst nennt“, „lehnt eine zu grosse Datei ab, die keine content-length schickt“ |
| JSON-Antworten der Such-API auf 512 KB begrenzt | `src/admin-api/_lib/security.ts:16`, `search/route.ts:77`, `:95` | — (der Mechanismus ist derselbe wie beim Bild, getestet in `cover-fetch-guard.test.ts`) |
| Suchbegriffe auf 120 Zeichen begrenzt, Pflichtfelder geprüft | `src/admin-api/_lib/security.ts:118-123`, `search/route.ts:64-73` | `src/admin-api/admin-routes-hardening.test.ts` → „lehnt ein fehlendes Suchfeld mit 400 ab“, „lehnt ein ueberlanges Suchfeld mit 400 ab“ |
| **Unerwartete Fehler** werden ohne Detailantwort beantwortet (500, generischer Text), Details nur im Serverlog | `src/admin-api/admin/covers/save/route.ts:159-168`, `src/admin-api/admin/covers/search/route.ts:114-124` | — (kein Test; die Routen antworten in den obigen Tests mit 400/401/429 und geben keine internen Pfade preis) |
| Mutationen am Katalog werden über eine Dateisperre serialisiert; eine verwaiste Sperre (älter als 120 s) wird aufgehoben | `src/admin-api/admin/covers/save/route.ts:31`, `:69-77` | — |

### 4.4 Harte Grenzwerte im Song-Katalog

Der Katalog ist keine vertrauenswürdige Eingabe: er wird gepflegt, importiert
und über die Admin-Oberfläche bearbeitet. `src/utils/validate-song-limits.ts`
definiert harte Obergrenzen je Feld; `src/utils/validate-song-data.ts:107-112`
reicht sie als **Fehler** (nicht als Warnung) in das Ergebnis ein.

| Maßnahme | Ort | Negativer Test |
|---|---|---|
| `id` ≤ 120, `title` ≤ 200, `artist` ≤ 200, `genre` ≤ 80 Zeichen | `src/utils/validate-song-limits.ts:29-48` | `src/utils/validate-song-limits.test.ts` → „meldet ein zu langes Feld“, „meldet eine zu lange id“ |
| `mood` ≤ 20 Einträge, je ≤ 60 Zeichen; `packs` ≤ 50 Einträge, je ≤ 100 Zeichen | `src/utils/validate-song-limits.ts:35-38` | `src/utils/validate-song-limits.test.ts` → „meldet zu viele Eintraege in einem Array“, „meldet einen zu langen Array-Eintrag“ |
| `hints` je ≤ 600, `hintEvidence` je ≤ 500 Zeichen | `src/utils/validate-song-limits.ts:136, :143` | `src/utils/validate-song-limits.test.ts` → „meldet einen zu langen Hinweis“ |
| Liedzeilen je ≤ 200, Fake-Lyrics ≤ 200 Zeichen | `src/utils/validate-song-limits.ts:153, :156` | `src/utils/validate-song-limits.test.ts` → „meldet eine zu lange Liedzeile“ |
| Links ≤ 500 Zeichen, `youtubeAlternatives` ≤ 10 Einträge | `src/utils/validate-song-limits.ts:163, :167` | `src/utils/validate-song-limits.test.ts` → „meldet einen zu langen Link“ |
| `supportedModes`: nur bekannte Modi, ≤ 20 Einträge | `src/utils/validate-song-limits.ts:175-186` | `src/utils/validate-song-limits.test.ts` → „meldet einen unbekannten Spielmodus“ |
| Eine Verletzung ist ein **Fehler**, keine Warnung — der Validator failt nicht offen | `src/utils/validate-song-data.ts:107-112` | `src/utils/validate-song-limits.test.ts` → „meldet eine Verletzung als Fehler, nicht als Warnung“ |
| Der bestehende Katalog (1 615 Songs) bleibt unter diesen Grenzen gültig | — | `src/utils/validate-song-limits.test.ts` → „laesst den aktuellen Katalog gueltig“ (geprüft über alle 135 Packs) |

Gegenprobe: `npm run validate-catalog` meldet **0 Schema-Fehler**, 0
Duplicate-Gruppen, 0 fehlende Jahre.

### 4.5 Security-Header (Konfiguration vorhanden — siehe Einschränkung in 4.6)

In `next.config.ts:24-59` sind definiert:

`Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
`Permissions-Policy` (Kamera nur für den eigenen Origin),
`Strict-Transport-Security`, `Cross-Origin-Opener-Policy`,
`X-DNS-Prefetch-Control`.

Die CSP erlaubt genau die Origins, die der Code benutzt (Herleitung in
Abschnitt 6). Geprüft in `src/admin-api/security-headers.test.ts`:
„setzt die Mindest-Header-Baseline“, „setzt eine CSP mit allen erwarteten
Direktiven“, „laesst genau die im Code belegten Media-Origins zu“,
„enthält keine Wildcard und kein unsicheres object-src“.

### 4.6 Was die Security-Header **nicht** leisten (wichtig)

Der Projektstand ist ein **statischer Export** (`next.config.ts:64`
`output: 'export'`), der auf GitHub Pages liegt. Next.js wendet in diesem
Modus `headers()` **nicht** an. Das ist keine Vermutung, sondern eine Warnung
von Next.js selbst. Der Build (`npx next build`, Next.js 16.4.3) liefert
zweimal den Beleg:

```
▲ Next.js 16.4.3 (Turbopack)
⚠ Specified "headers" will not automatically work with "output: export".
  See more info here: https://nextjs.org/docs/messages/export-no-custom-routes
...
  Finalizing page optimization ...
⚠ rewrites, redirects, and headers are not applied when exporting your
  application, detected (headers).
  See more info here: https://nextjs.org/docs/messages/export-no-custom-routes
```

Im Quelltext der installierten Version steht dieselbe Warnung:

```
node_modules/next/dist/server/config.js:477
_log.warn('Specified "headers" will not automatically work with "output: export".
  See more info here: https://nextjs.org/docs/messages/export-no-custom-routes');
```

**Konsequenz:** Die Header in `next.config.ts` sind heute **nicht wirksam**.
Sie werden erst wirksam, wenn

1. die App mit `next start` (Next-Server) ausgeliefert wird, oder
2. der Host die Header selbst setzt (z. B. Netlify, Cloudflare Pages, ein
   Reverse Proxy, ein CDN in front of GitHub Pages).

Zusätzlich kann GitHub Pages **keine** eigenen Header ausliefern. Für den
aktuellen Betrieb ist der wirksame Schutz also der Codex selbst (Token-Gate,
Allowlist, Validierung) — nicht der HTTP-Header.

---

## 5. Was **nicht** abgesichert ist

Diese Liste ist die ehrliche Gegenseite von Abschnitt 4.

1. **Die Admin-API ist derzeit nicht erreichbar (F-01).** `src/admin-api/**` liegt
   außerhalb von `src/app/`. Next.js registriert Route Handler nur unterhalb
   des App-Router-Verzeichnisses; zusätzlich schließt `output: 'export'`
   Route Handler generell aus. Der Produktionsbuild listet 21 statische
   Routen auf — **keine** davon ist eine Admin-API-Route:

   ```
   Route (app)
   ┌ ○ /
   ├ ○ /_not-found
   ├ ○ /admin/review
   ├ ○ /admin/songs
   ├ ○ /browse
   ├ ○ /game
   ├ ○ /game-over
   ├ ○ /guide
   ├ ○ /lobby
   ├ ○ /privacy
   ├ ○ /projector
   ├ ○ /settings
   …
   └ ○ /terms
   ```

   Es existiert also **kein** erreichbarer Endpunkt, an dem das Token-Gate
   greifen könnte. Dasselbe steht bereits in `ARCHITECTURE.md` (§6.1,
   „A4 — `admin-api/` hat keinen Konsumenten“).
   *Konsequenz:* Das Token-Gate ist implementiert und getestet, aber es
   schützt derzeit nichts, weil es keine Route gibt, die es erreicht. Wer den
   Katalog heute ändert, tut das über Dateien im Repository — dort greift
   **kein** Token, sondern die Schreibberechtigung im Repository.

2. **Die Header werden nicht ausgeliefert (F-05).** Siehe 4.6.

3. **Der Spielstand ist vom Benutzer manipulierbar (F-15).** `localStorage` gehört
   dem Benutzer. Punkte, Spielernamen, XP, Spielmodus und Rundenzahl können
   frei gesetzt werden. Ein Server, der den Stand validiert, existiert nicht
   — das wäre ein Server und damit ein anderes Produkt.
   *Nicht persistiert* sind dagegen `currentSong`, `currentAnswers` und
   `roundHistory` (siehe `partialize` in `src/stores/game-store.ts:620-637`),
   der Anti-Spoiler-Schutz lässt sich also **nicht** über einen Neustart
   hinweg aushebeln.

4. **Die QR-Eingaben sind nicht begrenzt (F-06).** `parseQrIntent` gibt
   Session-Code, Pack-ID und Spielernamen ungefiltert weiter; es gibt keine
   Längengrenze und keine Formatprüfung für `?session=` und `?pack=`.
   *Bewusst nicht behoben:* Die Datei `src/utils/qr-intent.ts` lag in diesem
   Arbeitsauftrag außerhalb des freigegebenen Bereichs. Der Fix ist klein
   (Längengrenzen in `parseQrIntent`), aber er gehört in denselben Commit wie
   die Änderung, die den Scanner aufruft.

5. **Die Meldefunktion überträgt Gerätedaten (F-07).** „Fehlenden Link melden“
   schreibt eine zufällige Geräte-ID (`phomu-device-id`) in `localStorage` und
   baut einen Payload aus Song-ID, Titel, Interpret, Pack, Provider,
   Zeitzone, Locale, Region und Geräte-ID
   (`src/components/game/MusicPlayer.tsx`, Schlüssel `DEVICE_KEY` und
   `REPORT_KEY`, Payload `issuePayload`). Dieser Payload geht an
   GitHub (Issue-Formular), nicht an einen Phomu-Server. Es ist eine vom
   Nutzer ausgelöste Übertragung, aber sie enthält mehr als die im
   Datenschutzhinweis genannten „technischen Metadaten“. Der
   Datenschutzhinweis wurde deshalb entsprechend präzisiert.

6. **Die Abhängigkeiten der Entwicklungsumgebung sind nicht sauber (F-09).**
   `npm audit --omit=dev` meldet 0 Schwachstellen — die ausgelieferte App ist
   damit sauber. Mit Dev-Abhängigkeiten meldet `npm audit` 14 Meldungen
   (9 high) in `vite`, `launch-editor` und `zod`. Diese Werkzeuge laufen nur
   auf dem Rechner des Entwicklers, nicht in der ausgelieferten App.

7. **Die CI prüft die Security-Grenzen nicht (F-13).** `.github/workflows/deploy.yml`
   baut und deployt, führt aber weder `npm test`, `npm run lint`,
   `npm run typecheck` noch `npm audit` aus. Die frühere Fassung dieses
   Dokuments nannte „CI-Pflichtchecks: `npm audit`, Secret-Scanning, SAST“ —
   das war zum Messzeitpunkt **nicht** durch das Repository gedeckt und ist
   hier entfernt worden.

8. **Der Token wird lokal auf der Konsole ausgegeben (F-14).**
   `scripts/generate-admin-token.js:11-12` schreibt den neuen Token nach
   `stdout`. Das ist der vorgesehene Weg (der Token soll in den Secret-Store
   des Betreibers), aber wer das Kommando in einer geteilten Shell oder in
   einem CI-Log ausführt, hat den Token im Log.

9. **Es gibt keine Authentifizierung, keine Autorisierung und keine
   Mandantenfähigkeit** — für ein lokales Partyspiel ohne Server auch nicht
   nötig. Der einzige geheime Wert im Projekt ist der Admin-Token.

10. **Die Header sind nicht an ein Gate gebunden.** Der Test
    `src/admin-api/security-headers.test.ts` beweist die *Konfiguration*,
    nicht die *Auslieferung*. Erst wenn der Betrieb auf einen Next-Server
    oder einen Header-fähigen Host wechselt, wird daraus eine wirksame
    Maßnahme.

---

## 6. Abgeleitete CSP-Origins

Die Liste ist **aus dem Code abgeleitet**, nicht aus dem Gedächtnis. Jede
Zeile nennt die Fundstelle.

| Origin | Zweck | Fundstelle |
|---|---|---|
| `https://www.youtube.com` | IFrame-API-Skript (`https://www.youtube.com/iframe_api`) | `src/components/game/MusicPlayer.tsx`, `loadApi()` (`tag.src`) |
| `https://www.youtube.com` | Embed-Frame in der Browse-Liste | `src/components/browse/SongCard.tsx`, `src={`https://www.youtube.com/embed/${song.links.youtube}…`} |
| `https://www.youtube.com` | vom IFrame-API erzeugtes Player-Frame | `src/components/game/MusicPlayer.tsx`, `new window.YT.Player(…, { playerVars: { host: … } })` |
| `https://music.youtube.com` | alternative Player-Domain (Umschalter „Music“) | `src/components/game/MusicPlayer.tsx`, State `activeDomain` + `toggleDomain()` |
| `https://open.spotify.com` | Spotify-Embed-Frame | `src/components/game/MusicPlayer.tsx`, `src={`https://open.spotify.com/embed/track/${spotifyTrackId}…`}` |
| `https://music.amazon.com` | Amazon-Music-Embed-Frame | `src/components/game/MusicPlayer.tsx`, `src={`https://music.amazon.com/embed/track/${amazonTrackId}…`}` |
| `https://p.scdn.co` | Spotify-Preview-Audio (`<audio src=…>`) | `src/components/game/MusicPlayer.tsx`, `<audio src={spotifyFreePreview}>`; Host aus dem Katalog, z. B. `src/data/songs/E4.json` |
| `https://music.amazon.com` | Amazon-Prime-Preview-Audio (`<audio src=…>`) | `src/components/game/MusicPlayer.tsx`, `<audio src={amazonPrimePreview}>` |
| `https://itunes.apple.com` | Cover-Suche (nur **serverseitig**, in der Admin-API) | `src/admin-api/admin/covers/search/route.ts:75` |
| `https://api.deezer.com` | Cover-Suche (nur **serverseitig**, in der Admin-API) | `src/admin-api/admin/covers/search/route.ts:92` |

**Bewusst nicht enthalten:**

- `https://music.apple.com` — Apple Music ist im Katalog nur ein **Link**
  (`links.appleMusic`, z. B. `src/data/songs/*.json`), es gibt keinen
  Apple-Embed im Code (`src/config/game-config.ts:26` führt `'apple-music'`
  als „Future“). Für `frame-src` ist die Origin deshalb nicht nötig. Wird der
  Apple-Embed nachgerüstet, **muss** die CSP erweitert werden.
- `https://github.com` — nur als Ziel des vom Nutzer ausgelösten Melde- und
  Issue-Links (`src/components/game/MusicPlayer.tsx`, `window.open(issueUrl…)`),
  kein Request der Seite selbst.
- `'unsafe-eval'` — wird nirgends gebraucht.
- `*` — an keiner Stelle.

**Warum `script-src 'unsafe-inline'`:** Next.js injiziert beim statischen
Export Inline-Skripte für den RSC-Payload (`out/*.html`, `<script id="_R_">`).
Ein statischer Export kann keine pro-Anfrage-Nonces ausliefern. Der Inline-
Anteil der CSP lässt sich deshalb nicht vermeiden. Der Schutz gegen XSS
macht in dieser App **React** (alle Textausgaben werden escaped), nicht die
CSP. Das ist eine ehrliche Einordnung, keine Beschönigung.

---

## 7. Meldung einer Schwachstelle

Bitte **keine** Exploit-Details in einem öffentlichen Issue veröffentlichen.
Zwei Wege sind möglich:

1. **Private Nachricht an den Owner** über das Repository
   (<https://github.com/mazer666/Phomu>) — für Schwachstellen, die vor der
   Veröffentlichung behoben werden sollen.
2. **Issue im Repository**
   (<https://github.com/mazer666/Phomu/issues>) — für alles, was nicht
   vertraulich ist: Fehler in der Validierung, Lücken in der Dokumentation,
   Verbesserungsvorschläge. Issues sind öffentlich.

Ein sinnvoller Bericht enthält:

- betroffene Route oder Komponente (mit Datei und Zeile),
- reproduzierbare Schritte,
- welche Trust Boundary verletzt wird (siehe Abschnitt 2),
- Auswirkung,
- Vorschlag zur Mitigation, wenn vorhanden.

Für Datenschutzanfragen siehe `PRIVACY.md`, Abschnitt 8.

---

## 8. Unterstützte Versionen und Patchpolitik

Phomu ist im Versionsstand `0.1.0` (`package.json`) und noch nichtreleased.

| Stand | Status |
|---|---|
| `main` / aktueller Release-Stand | Wird gepflegt |
| Ältere Stände, Branches, Forks | Werden **nicht** gepflegt |

**Patchpolitik**

- **Sicherheitslücken in der Admin-API** werden priorisiert behandelt: Der
  Token wird sofort per `npm run security:rotate-admin-token`
  (`scripts/generate-admin-token.js`) neu erzeugt und in der Deployment-
  Umgebung gesetzt.
- **Sicherheitslücken mit Auswirkung auf ausgelieferte Daten** (Katalog,
  Spielstand) werden vor Feature-Arbeit behoben.
- **Dokumentationslücken** (dieses Dokument, `PRIVACY.md`) werden mit dem
  nächsten Release korrigiert.
- Es gibt **keine** LTS-Zusage und **keinen** öffentlichen Support-Vertrag —
  das Projekt ist ein Open-Source-Prototyp ohne Betreiber-SLA.

**Abhängigkeiten**

`npm audit --omit=dev --audit-level=moderate` ist Teil von
`scripts/local-ci.sh` (Schritt 8) und war am 2026-10-25 grün (0 Befunde).
Die CI in `.github/workflows/deploy.yml` führt den Audit **nicht** aus — das
ist eine offene Lücke (Abschnitt 5, Punkt 7).

---

## 9. Harte Grenzen der Härtung — was ein Gate **nicht** beweist

| Gate | Was es **nicht** beweist |
|---|---|
| Token-Gate der Admin-API | Dass es überhaupt eine erreichbare Admin-API gibt. Siehe Abschnitt 5, Punkt 1. |
| `crypto.timingSafeEqual` | Dass der Token nicht an anderer Stelle offengelegt wird (Log, Issue, Umgebungsvariable des Hosts). Der Vergleich schützt nur gegen ein zeitliches Erraten des Vergleichs. |
| Rate-Limiter | Keinen Schutz gegen verteilte Angriffe, keine Wirkung über Instanzgrenzen hinweg, keine Wirkung hinter einem Proxy, der `x-forwarded-for` nicht überschreibt. Er ist ein **Missbrauchsbremse pro Instanz**, kein DDoS-Schutz. |
| Host-Allowlist | Keinen Schutz gegen einen kompromittierten Allowlist-Host, der selbst auf interne Ziele weiterleitet. Gegen SSRF *über* die Allowlist hilft nur die Hop-für-Hop-Prüfung. |
| Größenlimit 5 MB | Keinen Schutz gegen viele kleine Anfragen — dafür ist das Rate-Limit zuständig, mit derselben Einschränkung. |
| Security-Header in `next.config.ts` | Dass die Header **ausgeliefert** werden. Bei `output: 'export'` werden sie es nicht. Siehe Abschnitt 4.6. |
| Harte Grenzwerte im Validator | Keine Prüfung der **inhaltlichen** Richtigkeit eines Songs (Titel, Lyrics, Links). Der Validator prüft Form und Größe, nicht die Wahrheit. |
| `npm audit --omit=dev` | Keine Aussage über die Dev-Abhängigkeiten (dort liegen 14 Meldungen). |
| Tests der Admin-API | Keine Aussage darüber, dass die Routen im Betrieb erreichbar oder richtig konfiguriert sind — die Tests rufen die Handler direkt auf. |

---

## 10. Weiterführende Dokumente

- `PRIVACY.md` — welche Daten fließen, wo sie liegen, wie man sie löscht.
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` — die Fassung, die die
  Nutzerin im Browser liest.
- `ARCHITECTURE.md` §6.1 — die Admin-API-Grenze und ihre (fehlende) Erreichbarkeit.
- `specifications/archive/full_audit_2026-04-02_archivstand_2026-10-25.md` §5 —
  der Sicherheits-Audit, aus dem die offenen Punkte stammen.
