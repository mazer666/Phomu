# Phomu Test Strategy (aktualisiert: 1. April 2026)

## 1) Quality Gates (CI)
Pflicht in der Pipeline:
1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`
4. `npm run validate-songs`
5. `npm run validate-catalog`
6. `npm run build`
7. `npm audit --omit=dev --audit-level=moderate`

Nicht-blockierend in der Baseline-Phase:
- `npm run format:check` (wird als sichtbarer Warnkanal geführt, bis Repo-weit formatiert ist)

Optional bei gesetztem Secret:
- `npm run audit-youtube-official`

## 2) Testpyramide
- **Unit Tests:** Parser/Queue/Helper (`src/utils/*.test.ts`)
- **Static Analysis:** TypeScript + ESLint
- **Data Quality:** Song-/Katalog-Validierung inkl. Duplicate- und Coverage-Prüfung
- **Build Verification:** Produktionsbuild muss grün sein
- **Security Verification:** Dependency-Audit, später Header/Secrets/SAST

## 3) Datenschutz- und Security-Checks
- Data minimization prüfen: nur erforderliche Daten speichern.
- Keine API-Keys im Repo.
- KI-Workflows: kleine Requests, Queue+Retry, Pending-Status statt aggressiver Bursts.
- Hints: spoilerarm, evidenzbasiert und nachvollziehbar.

## 4) Katalog-/Content-Qualität
- Duplicate-Policy: global strikt für neue/aktualisierte Songs.
- Mindestens ein Song pro Jahr (1950-heute) als Langfristziel.
- Hint-Evidence Pflicht für neue Admin-Einträge.

## 5) Release-Readiness
Ein Release gilt als "vertrauenswürdig", wenn:
- alle blockierenden Gates grün sind,
- keine Security-Audits auf `moderate+` offen sind,
- keine Regression gegenüber Quality-Baseline vorliegt.
