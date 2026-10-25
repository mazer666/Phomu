# Security & Privacy Policy

Aktualisiert: 2. April 2026

## 1) Grundprinzipien
- Privacy by default
- Data minimization
- Secure-by-design
- Least privilege

## 2) Was wir vermeiden
- Keine API-Keys im Sourcecode
- Keine unnötige Speicherung personenbezogener Daten
- Keine versteckten Tracking-Skripte

## 3) Mindest-Sicherheitsanforderungen (Engineering)

## 3.1 Plattform
- Security Header (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Strikte Trennung zwischen öffentlichen und Admin-Endpunkten

## 3.2 Applikation
- Input-Validierung für alle Request-Payloads
- Defensives Error-Handling ohne sensible Leaks
- Rate-Limits und Abuse-Schutz für öffentliche Endpunkte

## 3.3 Daten & Secrets
- Secrets nur via Environment/Secret-Manager
- Kein Persistieren von Access-Tokens im Klartext
- PATs/Access-Tokens niemals in Chat/Issues/Commits posten; bei Leak sofort widerrufen
- Regelmäßige Dependency-Audits


## 3.4 Bereits umgesetzt (Stabilisierung + Security-Baseline)
- Admin-Cover-APIs sind per `x-admin-token` + `ADMIN_API_TOKEN` geschützt (401/503 bei fehlender Auth/Config).
- `ADMIN_API_TOKEN` wird serverseitig auf Mindestlänge geprüft (Fehlkonfiguration führt zu 503).
- Strikte Input-Validation für `artist`, `title`, `songId` und `imageUrl`.
- Nur HTTPS und Allowlist für externe Cover-Hosts (`mzstatic.com`, `dzcdn.net`).
- Externe Requests mit Timeout, Response-Typ-Prüfung und Bildgrößenlimit (5 MB).

## 3.5 Token-Rotation (Admin API)
- Rotation mindestens monatlich oder sofort bei Leak-Verdacht.
- Neuen Token lokal erzeugen mit:
  - `npm run security:rotate-admin-token`
- Token nur im Secret-Store/Deployment-Environment setzen (`ADMIN_API_TOKEN`), nie committen.
- Nach Rotation alten Token invalidieren und Admin-Clients aktualisieren.

## 4) Security-Verifikation
- CI-Pflichtchecks:
  - `npm audit --omit=dev --audit-level=moderate`
  - Secret-Scanning
  - (optional) SAST (z. B. CodeQL/Semgrep)
- Geplante Erweiterung: regelmäßige Threat-Model-Reviews

## 5) Responsible Disclosure
Bitte melde Security-Probleme verantwortungsvoll und nicht öffentlich mit Exploit-Details.

Empfohlener Inhalt einer Meldung:
- betroffene Route/Komponente
- reproduzierbare Schritte
- Impact
- ggf. Mitigation-Vorschlag
