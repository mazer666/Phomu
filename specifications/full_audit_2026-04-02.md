# Phomu Komplett-Audit (Stand: 2. April 2026)

Dieses Audit bewertet das Projekt aus 6 Senior-Rollen und führt die Ergebnisse in einer gemeinsamen Handlungsempfehlung zusammen.

---

## 0) Methodik und Basis

### Geprüfte Artefakte
- Code-Basis (App Router, Komponenten, Config, Game State, Admin API).
- Bestehende Projektdokumentation.
- Automatisierte Checks (Typecheck, Lint, Tests, Song-/Katalogvalidierung, Build).

### Kurzfazit
Phomu hat eine starke Produktbasis und ist als **spielbarer Prototyp** klar erkennbar. Für ein „Best-in-Class“ Partyspiel fehlen vor allem: operative Qualität (Lint/Content), Security-Hardening, Metriken, Playtest-Zyklen und ausgereifte Content-Operations.

---

## 1) Senior Product Manager Audit

## Was bereits stark ist
- Klarer Product Fit: Musik + Party + schneller Einstieg.
- 6 Modi statt nur ein Quiz-Template.
- Große Contentbasis (1.915 Songs) als wertvoller Asset-Vorsprung.
- Technisch gute Erweiterbarkeit (Config-zentrierter Ansatz).

## Produktlücken (Priorität)
1. **Musik-Kontinuität im Flow**
   - Nicht in jedem Modus fühlt sich die Session permanent musikalisch an.
2. **Meta-Progression**
   - XP ist im State angelegt, aber Progression/Rewards noch nicht klar als Produkt-Loop ausgeprägt.
3. **Onboarding/Retention**
   - Kein starker „First 3 Minutes“-Flow mit gezielter Aktivierung.
4. **Live-Ops-Mechanik**
   - Noch keine klare Event-/Saison-Logik.

## Best-in-Class Vorschläge
- **Always-on-Music Layer:** Intro-Loops, Transition-Stems, DJ-Interludes zwischen Fragen.
- **Session Identity:** Match-Mottos („80s Night“, „Festival Chaos“), dynamische Moderations-Texte.
- **Party-Eskalation:** Finale-Runden mit „Double Drop“ (2 kurze Hooks + Schnellentscheidung).
- **Retention Features:** Weekly Challenges, Party-Cards, Achievements, Highlight-Reel am Ende.

---

## 2) Senior Projektmanager Audit

## Status auf Planebene
- Ursprüngliche Roadmap ist brauchbar, aber teilweise überholt (z. B. Modi-Anzahl).
- Abnahmekriterien müssen stärker messbar und CI-/UX-/Security-konform sein.

## Aktualisierte Phasenplanung (Überblick)
1. **Phase 1 – Stabilisieren** (Codequalität + Contentintegrität)
2. **Phase 2 – Musikzentrierte UX** (Flow, Onboarding, modusspezifische Musikführung)
3. **Phase 3 – Security & Compliance** (Header, Input Guards, Abuse Prevention)
4. **Phase 4 – Online-Betrieb / Realtime**
5. **Phase 5 – Live Ops & Launch Readiness**

Details inkl. Arbeitspakete und Abnahmekriterien: `specifications/project_roadmap.md`.

---

## 3) Senior UX/UI Designer, Architekt & Artist Audit

## Positiv
- Theme-System ist etabliert.
- Modus-Karten und Spielphasen sind strukturiert.

## UX-Gaps
- Teilweise zu viele Mikro-Entscheidungen pro Step.
- Rückmeldungen (loading/error/success) nicht vollständig vereinheitlicht.
- „SetState in Effect“-Muster und Randomisierung im Render deuten auf teils instabile UX-Momente.

## UI/Art Empfehlungen
- **Einheitliches Visual Timing System:** feste Rhythmen für Draw/Question/Reveal.
- **Progressive Disclosure hart durchsetzen:** ein Haupt-CTA pro Screen.
- **Typografische Kontrast-Hierarchie:** sekundäre Texte teils zu schwach.
- **Music-Reactive UI:** dezente beat-synced Animationen statt zufällige Impulsanimation.

---

## 4) Senior Spieleentwickler Audit

## Gameplay-Stärken
- Gute Modusdiversität.
- Timeline hat bereits tieferes Regelwerk (Slots, Punkte-Cap, Duplikatbehandlung).

## „Mehr Musik, immer Musik“ – konkrete Vorschläge

### A) Systemebene
- **Pre-Round Beds:** 6–12s instrumentale Loops vor jeder Frage.
- **Post-Lock-In Burst:** kurzer Hook direkt nach Lock-In.
- **No-Silence Contract:** maximal 2–3s ohne Audio.

### B) Für spät-musikalische Modi
- **Hint-Master:** bei jedem Hint-Level ein 2s Audiofragment (abstrakt → konkreter).
- **Timeline:** kurze „Era-Stingers“ (z. B. 70s/80s style cues) beim Platzieren.
- **Survivor:** Signature-Riff/Hook direkt beim Reveal.
- **Vibe-Check:** Loop bleibt während Antwortphase leise aktiv, Reveal hebt Lautstärke.

### C) Session-Dramaturgie
- Runde 1–3 Warmup, 4–7 Core, 8+ Party Peak.
- Finale mit beschleunigter Reveal-Cadence.

---

## 5) Security Specialist Audit

## Aktueller Sicherheitsstand
- Gute Grundhaltung in Dokumentation.
- Praktische Controls noch unvollständig umgesetzt.

## Kritische Findings
1. **Keine expliziten Security-Header in Next-Konfiguration.**
2. **Admin-Cover-Routen ohne AuthN/AuthZ Guardrail sichtbar.**
3. **Externe Fetches ohne klare Timeout-/Rate-/Allowlist-Strategie.**
4. **`any`-Nutzung in API-Routen erhöht Robustheitsrisiko.**
5. **Kein dokumentiertes Threat-Model / Incident-Runbook als operatives Artefakt.**

## Empfehlungen
- Header-Baseline (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- Schema-Validation für Request-Payloads (z. B. zod) + strikte Fehlerrückgaben.
- SSRF-/URL-Validation bei imageUrl (allowlist, protocol checks, file-size limits).
- Admin-Routen nur für authentifizierte Rolle.
- CI-Security-Gates (audit + secret scan + SAST).

---

## 6) Senior Software Tester Audit

## Aktueller Testzustand
- Typecheck: grün.
- Tests: grün (2 Files / 6 Tests), aber geringe Breite.
- Build: grün.
- Lint: viele Warnungen (65), keine Errors.
- Content-Qualität: formal baseline-grün, aber mit substanziellen Datenproblemen (Duplikate/Schemawarnungen/Jahreslücken).

## QA-Lücken
- Geringe funktionale Abdeckung der Spielmodi.
- Keine E2E-Absicherung der Kernjourneys.
- Keine klare Device-Matrix als reproduzierbares Testprotokoll.

## QA-Empfehlungen
- Kritische Journey-E2E: Lobby → Spielstart → Modusrotation → Game Over.
- Modus-spezifische Contract-Tests (Scoring, Lock-In, Reveal-Logik).
- Datenregressionstests für Katalogregeln.
- Non-Functional: Performance-/A11y-Budgets in CI.

---

## 7) Interdisziplinäre Synthese (Rollen-Zusammenarbeit)

## Gemeinsamer Nenner
Alle Rollen priorisieren dieselbe Reihenfolge:
1. **Stabilität + Datenqualität**
2. **Musikzentrierte UX und klare Userführung**
3. **Security-Hardening**
4. **Skalierung in Realtime + Live Ops**

## Konflikte / Trade-offs
- PM will schnell Features; QA/Security fordern erst Baseline-Stabilisierung.
- UX will visuelle Dynamik; Engineering fordert deterministischere Render-Patterns.

## Auflösung
- Feature-Ausbau nur auf grüner Qualitäts-Basis (Definition of Ready + Definition of Done).
- Musikzentrierung als cross-funktionales Ziel in jeder Phase, nicht als spätes Add-on.

---

## 8) Entscheidungsvorlage für die nächsten 90 Tage

## Option A – „Quality First“ (empfohlen)
- Fokus: Lint/Content/Security zuerst.
- Vorteil: belastbare Basis, weniger Rework.
- Risiko: sichtbare neue Features etwas später.

## Option B – „Feature First“
- Fokus: neue Modi/Online-Funktionen sofort.
- Vorteil: schnelle Demo-Effekte.
- Risiko: technische Schulden + spätere Instabilität.

## Option C – „Balanced Wave“
- 60% Stabilisierung, 40% sichtbare UX-Features.
- Mittelweg bei Risiko/Tempo.

**Empfehlung:** Option A mit klaren Quality-Gates, danach beschleunigter Feature-Rollout.
