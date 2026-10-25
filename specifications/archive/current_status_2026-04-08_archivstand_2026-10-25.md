# Phomu Statusbericht (Stand: 8. April 2026)

## 1) Umgesetzter Ist-Stand
- Lauffähiger Prototyp mit vollständigem Core-Loop (Lobby → Game → Game Over) ist weiterhin stabil.
- 6 Spielmodi sind aktiv im Game-Flow.
- Song-Katalog wurde strukturell weiterentwickelt (inkl. Hint-Qualität + Plattform-Link-Anreicherung in den letzten Commits).
- Katalogumfang laut aktuellem Gate: **37 Packs / 1.629 Songs**.
- Dokumentation wurde auf den neuen Stand (8. April 2026) aktualisiert; vorheriger Snapshot wurde archiviert.

## 2) Ergebnisse der technischen Checks (08.04.2026)
- Typecheck: ✅ erfolgreich.
- Lint: ❌ nicht grün (10 Errors, 2 Warnings).
- Unit Tests (Vitest): ✅ 2 Test-Dateien, 6 Tests bestanden.
- Coverage (Vitest): ⚠️ gesamt 7.56% Lines (deutlich unter gewünschter Tiefe).
- Song-Validation (`validate-songs`): ❌ fehlgeschlagen (A1.json: 52 Fehler, 362 Warnungen).
- Catalog-Validation mit Report: ✅ Gate bestanden (baseline-konform).
- Katalog-Report (08.04.2026): 1.015 Schema-Fehler, 4.786 Schema-Warnungen, 4 Duplicate-Gruppen, 1 Allowlist-Duplikat, fehlende Jahre: 0.
- Build: ✅ erfolgreich.
- E2E Smoke: ✅ erfolgreich (nach Installation der Browser + Linux-Dependencies).

## 3) Wesentliche Entwicklungen seit letztem Snapshot
1. **Content-Fokus vorangetrieben:** In mehreren aufeinanderfolgenden Commits wurden Hint-Qualität und musikalischer Kontext erweitert.
2. **Metadaten-Anreicherung:** Zusätzliche Streaming-Links (u. a. Spotify/Amazon Music) wurden in größeren Batches ergänzt.
3. **Kataloghygiene verbessert:** Schema-Fehler liegen deutlich unter der in `quality-baseline.json` hinterlegten historischen Baseline.
4. **Neues Risiko sichtbar:** Song-Validierung zeigt weiterhin harte Qualitätsdefekte (v. a. ISO-Country-Codes, Lyrics-Struktur, Link-Format).

## 4) Priorisierte nächste Schritte (konkret)
1. **P0 – Lint-Blocker beheben:**
   - `src/app/privacy/page.tsx` und `src/app/terms/page.tsx` (unescaped entities).
   - Hook-Dependency-Warnung in `src/components/game/modes/TimelineMode.tsx`.
2. **P0 – Song-Datenqualität sanieren (A1 zuerst):**
   - Country-Codes normieren (kein `INT`, `US/CO`, etc.; stattdessen valides ISO-2-Format nach Regelwerk).
   - Lyrics-Strukturfehler beheben (`lyrics.real` mit exakt 3 Zeilen, `lyrics.fake` als String).
   - Link-Felder auf valide URL-Formate bringen (oder Validator-Regeln präzisieren, falls IDs gewünscht sind).
3. **P1 – Duplicate-Gruppen reduzieren (4 offen):**
   - Die 4 aktuellen Kandidaten im Report entscheiden: kuratiert zulassen (Allowlist) oder konsolidieren.
4. **P1 – Testtiefe erhöhen:**
   - Utility-Tests für Song-Picker, Feedback-/Message-Logik, Game-Store-Transitions ergänzen.
   - Ziel: messbarer Coverage-Anstieg vor nächster Feature-Welle.
5. **P2 – Security/Operations in die Pipeline ziehen:**
   - CSP/Header-Set für produktive Routen konkretisieren.
   - Optional: CI-Gate für `lint`, `typecheck`, `test`, `validate-catalog:report`, `build` als Mindeststandard.

## 5) Fortschrittseinschätzung (Stand 08.04.2026)
- **Stabilität Runtime (Build/Typecheck/E2E-Smoke):** hoch.
- **Codequalität (Lint):** mittel bis niedrig (aktuelle Errors blockieren „grün“).
- **Katalogqualität (Schema/Warnings):** mittel (Gate bestanden, aber große Warnungslast).
- **Testreife (Tiefe/Coverage):** niedrig bis mittel.
- **Gesamteinschätzung:** Projekt ist funktionsfähig und entwicklungsfähig, benötigt jetzt disziplinierten Fokus auf Qualitätsabbau statt weiterer breiter Content-Expansion.
