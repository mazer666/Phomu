# specifications/ — Vorgänger-Dokumentation

Dieser Ordner enthält die Dokumentation, **die vor dem 25. Oktober 2026** den
Projektstand beschrieb. Sie ist **historisch** und nicht mehr verbindlich.

Die verbindliche Dokumentation liegt jetzt im Root-Verzeichnis und unter `docs/`:

| Früher hier | Jetzt |
|---|---|
| `specifications/project_roadmap.md` | [`../ROADMAP.md`](../ROADMAP.md) |
| `specifications/test_strategy.md` | [`../QUALITY.md`](../QUALITY.md) + [`../docs/acceptance/`](../docs/acceptance/) |
| `specifications/full_audit_2026-04-02.md` | Teil des Risikoregisters in [`../ROADMAP.md`](../ROADMAP.md) |
| `specifications/current_status_*.md` | [`../ROADMAP.md`](../ROADMAP.md) (Status-Tabelle je Meilenstein) |
| `specifications/database_schema.md` | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (Datenschicht) |
| `specifications/logic-flow.md` | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (Spielablauf) |
| `specifications/duplicate_policy.md` | [`../docs/design/`](../docs/design/) (Katalogvertrag) |
| `specifications/improvement_plan_mobile_ux_security.md` | offene Punkte in [`../ROADMAP.md`](../ROADMAP.md) |
| `LLM.md` (alt) | [`../LLM.md`](../LLM.md) (neu) + [`../AGENTS.md`](../AGENTS.md) |

## Warum das so ist

Die alte Struktur hatte drei Probleme:

1. **Keine Anforderungs-IDs.** Verhalten war in Fließtext beschrieben, nicht
   referenzierbar. Tests konnten sich nicht auf eine Anforderung beziehen.
2. **Keine Trennung von Produkt und Prozess.** Status, Roadmap, Teststrategie und
   Audit lagen nebeneinander, ohne zu sagen, welche davon bindend ist.
3. **Kein Ort für Entscheidungen.** Architekturentscheidungen existierten nur als
   Absätze in einem Fließtext.

Der neue Satz trennt das: `REQUIREMENTS.md` sagt, **was** gilt; `ARCHITECTURE.md`
sagt, **wie**; `docs/adr/` sagt, **warum**; `ROADMAP.md` sagt, **wie weit**.

## Was hier weiterhin gilt

Diese Dateien im Ordner sind **keine** historischen Stände, sondern weiterhin
aktive Daten:

- `specifications/quality-baseline.json` — die Baseline, gegen die
  `npm run validate-catalog` prüft
- `specifications/duplicate-allowlist.json` — die erlaubten Dubletten
- `specifications/catalog_issues_report.json` — der letzte Katalog-Prüfbericht
  (wird von `npm run validate-catalog:report` neu erzeugt)
- `specifications/assets/audio-assets-ap2.md` — die Vorgaben für die Audio-Dateien
  und ihre Ablageorte

## Archiv

Alte Stände liegen unter [`archive/`](archive/) und tragen einen Datumsstempel im
Dateinamen. Sie werden nicht gelöscht, sondern read-only weitergeführt — siehe
[`archive/README.md`](archive/README.md).
