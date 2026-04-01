# Phomu Produktstrategie & Vorschläge (31.03.2026)

## 1) Von 1.000 auf 5.000 Songs: skalierbarer Plan

## Inhaltsziele
- Mindestens 1 Song pro Jahr von 1950 bis heute (Coverage-Constraint).
- Pro Jahr zusätzlich Top-Slots je Region/Genre (z. B. US, DACH, LATAM, K-Pop, Afrobeat, EDM, Rock).
- Qualitätslabel je Song: `verified_official_video`, `duplicate_risk`, `rights_risk`, `party_score`.

## Pipeline
1. **Ingest:** Vorschläge aus Charts/Redaktionslisten/OpenRouter-Assist.
2. **Normalize:** Titel/Artist normalisieren (ASCII-Fold, Lowercase, Entfernen von „feat.“, „remaster“, etc.).
3. **Deduplicate:**
   - Exact-Match auf `normalized_title + normalized_artist + year_window`.
   - Fuzzy-Match (Jaro-Winkler/Levenshtein).
   - Falls verfügbar: ISRC als harter Schlüssel.
4. **Video-Check:** bevorzugt Official Artist Channel / VEVO / Topic; sonst Review-Status „pending".
5. **QA-Gate:** ohne Coverage- und Duplicate-Check kein Merge.

## 2) Cover-Mode im Datenmodell sauber abbilden

Empfohlene Erweiterung pro Song:

```ts
coverMode?: {
  relationType: 'original' | 'cover' | 'sample' | 'remix';
  originalSongId?: string;
  originalArtist?: string;
  coverArtist?: string;
  coverYear?: number;
  revealPrompt?: string;
  confidence: 'low' | 'medium' | 'high';
}
```

Zusätzlich für Gameplay:
- `roundMetadata.answerLatencyMs` für optionalen Zeitabzug.
- `scoringProfile` pro Modus (zentral konfigurierbar statt verteilt im UI).

## 3) Ausgewogenes Punktemodell (inkl. Timeline-Cap)

## Baseline
- Standardspiel: **mindestens 10 Runden**.
- Timeline: **maximal 5 Punkte**.
- Hint-Master bleibt 5→1 Punkte.
- Optionaler Zeitabzug:
  - `timeDecayEnabled=false` default,
  - bei `true`: lineare Reduktion ab Sekunde X (z. B. -1 Punkt pro 5 Sekunden), nie < 1 Punkt.

## Fairness-Regeln
- Modus-Gewichtung je Session ausbalancieren (kein Übergewicht von High-Variance Modi).
- Team-Modus: gleiche Anzahl Antworten pro Team erzwingen.

## 4) UI/UX-Verbesserung mit Figma Premium

## Design System
- In Figma Tokens definieren (Color, Typography, Radius, Spacing, Motion).
- Token-Export in Tailwind-Variablen.
- 3 Kern-Templates:
  1) Lobby/Onboarding,
  2) In-Game Question/Reveal,
  3) Scoreboard/Recap.

## „You Don’t Know Jack“-inspiriertes Präsentationsmodell
- Host-first Typografie, provokante Zwischenzeilen, schnelle Mikroanimationen.
- Dramaturgie je Runde: Teaser → Lock-In → Reveal Stinger → Punkteknall.
- TV-/Projektor-Fokus: sehr hohe Kontraste, große Type, reduzierte Nebeninfos.

## 5) Admin-Modus mit OpenRouter (lokal & sicher)

## Sicherheitsprinzip
- Kein API-Key im Backend/DB speichern.
- Key nur lokal (Browser Storage verschlüsselt oder Session-only), optional "paste per session".
- CSP + strikt limitierte Admin-Route.
- Rate-Limit + Retry-Backoff + Abuse-Logging ohne PII.

## Song-Add Flow (ohne Duplikate)
1. Admin gibt Titel/Artist/Jahr ein.
2. System holt Assisted-Metadaten via OpenRouter.
3. Vor dem Speichern: zwingender Duplicate-Check.
4. Nur wenn `duplicate_risk=low` und Required Fields vollständig → Save.

## 6) Genres & Paketlogik verbessern

## Zusätzliche Kategorien
- Afrobeat, Amapiano, K-Pop, Latin Urban, Hyperpop, Drum & Bass, Synthwave, Indie Folk, Eurodance, NDW, Schlager 2.0.

## Pack-Auswahl verbessern
- Statt langer Liste: "Anlass-Packs" (Pre-Drink, Main Party, Late Night, Mixed Ages, Karaoke Warmup).
- Quick-Presets nach Dauer (15/30/45 min) und Schwierigkeitsgrad.
- "No-Skip-Pack" Score für hohe Trefferquote und geringe Frustwahrscheinlichkeit.

## 7) Name-Ideen mit "Pho"
- **PhonicRush**
- **Phonova Party**
- **Phoria Beats**
- **Phonique Clash**
- **Phoplay Live**
- **Phoniverse**
- **Phomix**

Empfehlung: **Phomix** (kurz, merkbar, party-tauglich, international gut aussprechbar).
