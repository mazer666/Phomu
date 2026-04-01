# Contributing to Phomu

Danke fürs Mitbauen an Phomu 🎵

## Qualitätsstandard (Pflicht vor Merge)
Jeder PR muss diese Checks bestehen:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`
4. `npm run format:check`
5. `npm run validate-songs`
6. `npm run validate-catalog`
7. `npm run build`

Optional (falls API-Key/Netzwerk verfügbar):
- `npm run audit-youtube-official`

## Testphilosophie
Wir sichern Qualität über mehrere Ebenen:
- **Unit Tests**: Utilities/Parsing/Queue-Logik
- **Static Quality**: TypeScript + ESLint + Prettier
- **Data Quality**: Song- und Katalogvalidierung
- **Build Quality**: Produktionsbuild muss grün sein
- **Security Quality**: Dependency-Audit (`npm audit --omit=dev`)

## Datenschutz & Security (nicht verhandelbar)
- **Data minimization first**: Speichere nur, was für Spielbarkeit erforderlich ist.
- Keine API-Keys im Repo, keine Key-Persistenz im Backend ohne explizite Security-Freigabe.
- Keine Tracking- oder Profiling-Daten ohne dokumentierten Zweck und Opt-in.
- Bei KI-gestützten Inhalten:
  - kleine Requests (fair use),
  - Retry/Queue statt Burst,
  - nachvollziehbare Evidenz für Hints,
  - keine Spoiler in Hints.

## Content-Regeln
- Keine Duplikate (global strict) für neue/aktualisierte Songs.
- Hints müssen überprüfbar sein (`hintEvidence`) und dürfen keine Artist-/Titel-Spoiler enthalten.
- Bei Unsicherheit: `manual-review` statt blindem Auto-Publish.

## PR-Checkliste
- [ ] Tests/Checks lokal ausgeführt
- [ ] Keine Secrets eingecheckt
- [ ] Doku bei Verhalten/Config-Änderungen aktualisiert
- [ ] UX bleibt party-tauglich (kein unnötiger Frust, kein unnötiger Dialog-Overhead)
