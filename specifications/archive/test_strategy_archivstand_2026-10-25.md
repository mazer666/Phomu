# Phomu Teststrategie (aktualisiert: 2. April 2026)

## 1) Zielbild
Die Teststrategie stellt sicher, dass Phomu als Musik-Partyspiel stabil, fair, sicher und auf Mobilgeräten zuverlässig spielbar ist.

---

## 2) Verbindliche Quality Gates (CI)

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`
4. `npm run validate-songs`
5. `npm run validate-catalog`
6. `npm run build`
7. `npm audit --omit=dev --audit-level=moderate`

Optional, wenn Secret gesetzt:
- `npm run audit-youtube-official`

---

## 3) Testebenen

## 3.1 Unit Tests
- Utilities (QR-Intent, Queue, Picker, Censoring).
- Reine Geschäftslogik (Scoring, Timeline-Slot-Logik, Time-Decay).

## 3.2 Integrationstests
- Zustand-Store-Flows (Round-Transition, Answer-Submission, Game-End).
- Mode-Container inkl. `QuestionPhase`/`RevealPhase`-Verhalten.

## 3.3 End-to-End Tests (kritische Journeys)
- Quick Start: Landing → Lobby → Game → Game Over.
- Modusrotation mit mehreren Modi.
- Error-Pfade (leere Packs, ungültige Konfiguration, defekte Songs).

## 3.4 Data Quality Tests
- Song-Schema, Required Fields, Duplicate-Policy.
- Coverage-Policy (Jahrgänge, Pflichtfelder, Hint-Qualität).

## 3.5 Security Tests
- API Input Validation (invalid/malformed payloads).
- AuthN/AuthZ-Tests für Admin-Routen.
- Dependency & Secret Scan.

## 3.6 Non-Functional
- Mobile Performance (Lighthouse).
- Accessibility-Smoketests (Kontrast, Fokus, Labels).

---

## 4) Abnahmekriterien pro Release
Ein Release ist freigabefähig, wenn:
- alle blockierenden Gates grün sind,
- keine offenen `moderate+` Dependency-Risiken vorliegen,
- keine bekannten P1/P2 Bugs ungelöst sind,
- kritische E2E-Journeys in der Zielmatrix erfolgreich sind.

---

## 5) Defect-Management
- **P1:** Spielabbruch, Datenverlust, Security-Lücke → Hotfix.
- **P2:** Kernfunktion gestört, starker UX-Schaden → Fix vor nächstem Release.
- **P3:** kosmetisch oder Workaround vorhanden → geplant im nächsten Sprint.

---

## 6) Fokus 2026 Q2
1. Testabdeckung für Spielmodi erhöhen.
2. Katalogregression automatisieren.
3. Security- und E2E-Layer als Standard etablieren.
