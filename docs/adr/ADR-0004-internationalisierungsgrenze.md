# ADR-0004 — Internationalisierungsgrenze

**Status:** Accepted
**Datum:** 2026-10-25
**Owner-Rolle:** Chief Architect
**Bezugene Anforderungs-IDs:** I18N-001 (Sprachunterstützung), I18N-002 (Vollständigkeit), UI-003 (Oberfläche)

---

## Kontext

Phomu ist deutsch-primär und soll englisch **vollständig** unterstützen. Die
i18n-Infrastruktur ist vorhanden und korrekt verdrahtet:

```text
src/i18n/config.ts          Bootstrap (i18next + LanguageDetector + initReactI18next)
src/i18n/locales/de.json    25 Schlüssel
src/i18n/locales/en.json    25 Schlüssel, schlüsselparallel
src/components/Providers.tsx:20   import('@/i18n/config')  ← einziger Bootstrap
```

Der `LanguageDetector` sucht in `localStorage` und `navigator`, cached in
`localStorage` (`src/i18n/config.ts:26-29`), `fallbackLng` ist `'de'`.
`src/app/layout.tsx:32` setzt `<html lang="de">` **statisch** — bei englischer
Sprache bleibt das Attribut auf Deutsch stehen.

### Der gemessene Ist-Stand

| Kennzahl | Wert | Kommando |
|---|---|---|
| Schlüssel in `de.json` / `en.json` | 25 / 25, **parallel**, 0 Unterschiede | JSON-Flat-Count beider Dateien |
| Namespaces in den Locales | `app`, `landing`, `settings`, `themes`, `modes`, `common` | `de.json` |
| Dateien mit `useTranslation` | **4** | `grep -rl "useTranslation" src` → `app/page.tsx`, `components/ui/NavBar.tsx`, `components/ui/LanguageSwitcher.tsx`, `components/ui/ThemeSwitcher.tsx` |
| Dateien mit deutschen UI-Literalen | **56 von 73** (ohne Testdateien) | Vokabular-Scan über 60 deutsche UI-Begriffe → 746 Treffer |
| translated ≠ vorhanden | `modes.*` (5 Werte), `common.*` (7 Werte), `themes.*` (4) | `de.json` |

Der Spielbereich ist vollständig hartkodiertes Deutsch: `src/app/lobby/page.tsx`
(45 Treffer), `src/components/game/RevealPhase.tsx` (44),
`src/app/admin/review/page.tsx` (36), `src/components/game/modes/HintMasterMode.tsx`
(27), `src/app/game/page.tsx` (26), `src/components/game/DrawingPhase.tsx` (20),
`src/app/projector/page.tsx` (20). Hinzu kommen die **Sprachlisten** in
`src/utils/feedback-messages.ts` (76 Treffer, 100 korrekte und 100 falsche
Sprüche) und `src/utils/last-round-messages.ts` (12 Meldungen).

### Warum die Frage gestellt werden muss

Es gibt drei mögliche Grenzziehungen:

1. **Die Komponente übersetzt selbst** (`t('…')` direkt im JSX).
2. **Eine Hilfsschicht übersetzt** (z. B. `src/utils/text.ts` mit
   `getLabel('lobby.start')`).
3. **Die Ressourcen-Datei übersetzt** (`src/i18n/locales/*.json`).

Variante 2 ist verlockend, weil sie den Schlüsselraum typisiert. Sie erzeugt
aber einen zweiten Ort, an dem Schlüssel und Werte entstehen — und zwar einen,
der nicht mehr von i18next verwaltet wird (keine Pluralformen, keine
Fallback-Logik, keine Vollständigkeitsprüfung).

---

## Entscheidung

### 1. Die Übersetzung liegt in `src/i18n/locales/*.json`

Einzige Quelle für sichtbaren Text. Kein sichtbarer Literaltext bleibt im JSX
stehen. Der Bootstrap bleibt in `src/i18n/config.ts`; die einzige Initialisierung
erfolgt in `src/components/Providers.tsx:20`.

### 2. Übersetzt wird **an der Oberflächen-Grenze**

Die Übersetzung passiert **in den Client-Komponenten**, unmittelbar dort, wo
der Text gerendert wird — mit `useTranslation()` aus `react-i18next`:

```tsx
'use client';
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation('lobby');
  return <button>{t('start')}</button>;
}
```

**Warum nicht in den Komponenten übersetzt wird — die Begründung:**

Eine Komponente, die selbst übersetzt, macht drei Dinge gleichzeitig: sie
entscheidet **über den Text**, sie entscheidet **über dessen Platzierung** und
sie ist **für die Vollständigkeit zuständig**. Daraus folgt:

- **Kein gemeinsamer Ort.** Derselbe Text („Punkte", „Runde", „Weiter") steht
  in zehn Komponenten an zehn Stellen. Ein Fix, eine Änderung, ein Tippfehler —
  zehnmal.
- **Markup und Text werden untrennbar.** Ein Text mit Platzhalter (`{{count}}`)
  muss in der Komponente formatiert werden; die Formatierung ist dann an das
  Markup gebunden und lässt sich nicht mehr für andere Sprachvarianten
  austauschen.
- **Die Vollständigkeit wird unprüfbar.** Ein Skript kann `de.json` und `en.json`
  vergleichen. Es kann nicht prüfen, ob ein Literal im JSX fehlt.

Deshalb ist die Grenze: **Werte in Ressourcen, Struktur in der Komponente.**

### 3. Schlüsselraum: flach, `camelCase`, punktgetrennt, ohne Interpolation

| Regel | Wert | Begründung |
|---|---|---|
| Trenner | `.` | `namespace.unterpunkt.bezeichnung` |
| Schreibweise des **Schlüssels** | `camelCase` | `hintLevel`, `pointsTotal` — Schlüssel sind Bezeichner, keine Übersetzungen |
| Schreibweise des **Wertes** | frei | Werte sind Prosa, kein Code |
| Interpolation | **nie im Schlüssel** | Platzhalter stehen im **Wert**: `"{{count}} Spieler"`. Schlüssel bleiben statisch, sonst ist der Schlüsselraum nicht mehr auffindbar. |
| Plural | i18next-Pluralformen `key_one` / `key_other` | `common.player_one`, `common.player_other` |
| Zahlen/Datum | `Intl` mit `i18n.language` | **nicht** `toLocaleString()` ohne Locale |
| `common.*` | vorab definiert, von allen Bereichen geteilt | `common.back`, `common.cancel`, `common.points` … |
| Eigennamen | in beiden Sprachen identisch | „Spotify", „YouTube", „Jackbox", „Phomu", Modusnamen |

### 4. Namespaces je Bildschirm

`landing`, `lobby`, `game`, `modes`, `browse`, `settings`, `admin`,
`projector`, `gameover`, `guide`, `legal`, `themes`, `common`, `errors`, `a11y`.

### 5. Was **nicht** übersetzt wird

| Nicht übersetzen | Begründung |
|---|---|
| Song-Titel, -Künstler, -Texte aus dem Katalog | Inhalte, keine UI. Sie stehen in `src/data/songs/*.json` und werden **nicht** durch i18next gezogen. |
| `PhomuSong.FIELDS` (Feldnamen im Admin-Editor) | Schema-Bezeichner, keine Oberfläche |
| Fehlermeldungen der Admin-API | Serverseitig; `src/admin-api/**` läuft ohne i18n-Runtime |
| Emoji und Symbole | `🎵`, `🏆` — zeichensetzlich, nicht sprachlich |
| Modus-IDs (`timeline`, `hint-master`) | Bezeichner im Code und in der URL |
| **Zahlenwerte** (Punkte, Runden, Minuten) | Werte, keine Texte — sie werden per `Intl` formatiert |

### 6. Der Migrationspfad: Bildschirm für Bildschirm

Die Migration ist **inkrementell** und wird nach dem Bereichsort vorgegangen:

| Reihenfolge | Bereich | Warum zuerst |
|---|---|---|
| 1 | `common.*`, `errors.*`, `a11y.*` | Grundvokabular, von allen Bereichen geteilt |
| 2 | `lobby`, `modes`, `themes` | Einstieg für die meisten Nutzer |
| 3 | `game`, `gameover` | Spieltext, inkl. `src/utils/feedback-messages.ts` und `src/utils/last-round-messages.ts` |
| 4 | `browse`, `admin` | Werkzeugseiten |
| 5 | `settings`, `projector`, `guide`, `legal` | Nebenbereiche |

Jeder migrierte Bereich wird mit einem Negativtest abgesichert: das
Vollständigkeits-Gate schlägt fehl, wenn ein Schlüssel in nur einer Sprache
existiert, wenn ein Wert leer ist oder wenn im JSX ein Literaltext stehen
bleibt.

### 7. `lang`-Attribut folgt der Sprache

`src/app/layout.tsx:32` setzt `lang="de"` statisch. Bei aktivem `en` muss das
Attribut `lang="en"` sein — Screenreader und Tastatur folgen dann der
tatsächlichen Sprache. Weil `src/app/layout.tsx` eine Server-Komponente ist und
die Sprache clientseitig gewählt wird, wird das Attribut über einen kleinen
Client-Helfer (`src/components/LanguageHtmlAttribute.tsx`) oder über einen
`document.documentElement.lang`-Effekt gesetzt.

---

## Konsequenzen

### Positiv

- Ein Ort für Text: `src/i18n/locales/*.json`. Ein Fix für „Zurück" ist eine
  Änderung an **einer** Zeile.
- Die Vollständigkeit wird **prüfbar**: `de.json` ↔ `en.json` sind parallel
  (heute bereits: 25 ↔ 25, 0 Unterschiede), und ein Gate kann verhindern, dass
  ein Literal im JSX zurückkommt.
- Pluralformen, Platzhalter und Datumsformate bekommen eine definierte
  Heimat (`common.*`, i18next-Pluralformen, `Intl`).
- Der Katalog bleibt sprachneutral: Songtitel werden nicht überschrieben und
  nicht in die Locale-Dateien dupliziert.

### Negative / Trade-offs

- **Migrationsaufwand.** 56 von 73 Quelldateien enthalten deutsche UI-Literale
  (746 Treffer im Vokabular-Scan). Das ist Arbeit ohne Produktgewinn für die
  deutsche Version.
- **Der Spielbereich ist der teuerste.** Die 102 Feedback-Sprüche in
  `src/utils/feedback-messages.ts` (`CORRECT_MESSAGES`, `WRONG_MESSAGES`) und die
  12 Meldungen in `src/utils/last-round-messages.ts` sind **Daten, keine
  UI-Literale**: Sie werden als **ein** Schlüssel pro Array (`game.feedback.correct`,
  `game.feedback.wrong`, `game.lastRound.messages`) exportiert, damit die
  Übersetzung **eine** Zeichenkette je Sprache bekommt statt 102.
- **Strengere Gates treffen Bestandscode.** Ein Vollständigkeits-Gate, das
  Literaltext im JSX findet, wird zunächst **rot** — es muss mit einer
  Baseline (`known-untranslated`) arbeiten, sonst blockiert es jede
  Weiterentwicklung.
- **Ein Schlüssel für ein Array ist ungewöhnlich.** Die i18next-Üblichkeit
  `feedback.correct.0`, `feedback.correct.1`, … wäre präziser, erzeugt aber
  204 Schlüssel je Sprache und eine fragile Index-Zuordnung.

### Was die Entscheidung unmöglich macht

- Ein sichtbarer Literaltext im JSX ist nicht mehr zulässig.
- Der Katalog (`src/data/**`) wird **nicht** Teil des i18n-Systems.
- Ein Schlüssel darf keine Interpolation enthalten.
- `de.json` und `en.json` werden immer **parallel** gehalten — eine Sprache
  ohne die andere ist ein Fehler, kein Feature.

---

## Alternativen (verworfen)

- **Übersetzung direkt in den Komponenten mit festen Schlüsselstrings.**
  *Verworfen:* Das ist genau die Variante, die die Ressourcen-Datei ersetzt.
  Der Schlüsselraum wird über die Komponenten verteilt, Vollständigkeit wird
  unprüfbar, und Markup und Text bleiben gekoppelt.
- **Eine eigene Übersetzungsschicht `src/utils/text.ts`.** *Verworfen:* Sie
  dupliziert die i18next-Funktionalität (Fallback, Plural, Locale-Erkennung)
  und erzeugt einen zweiten Ort, an dem Schlüssel entstehen.
- **Den Katalog in die Locales aufnehmen.** *Verworfen:* Songtitel, -Künstler
  und -Texte sind Inhalte und nicht UI; 136 JSON-Dateien würden in zwei
  Sprachdateien dupliziert und bei jeder Katalog-Änderung synchron gehalten.
- **Nur `de.json` pflegen, `en.json` später.** *Verworfen:* `fallbackLng: 'de'`
  verdeckt den Lückenzustand — der Nutzer sieht Deutsch und merkt nicht, dass
  etwas fehlt. Parallele Dateien mit Gate sind ehrlicher.
- **Übersetzung zur Laufzeit über einen Server-Dienst.** *Verworfen:*
  `output: 'export'` erlaubt keine Server-Routen; zusätzlich would ein
  Netzwerkzugriff beim Rendern die Statik-Auslieferung aufweichen.
- **Die Mode- und Feedbacktexte als Code-Konstanten belassen (Status quo).**
  *Verworfen:* `src/utils/feedback-messages.ts` ist eine Liste **deutscher
  Sätze** — das ist Inhalt, der in die Sprachdateien gehört.

---

## Verifikation

| Prüfung | Kommando / Ort |
|---|---|
| Parallelität der Locales | `scripts/check-i18n-completeness.mjs` (neu): `de.json` ↔ `en.json`, gleiche Schlüssel, keine leeren Werte, Pluralformen identisch |
| Kein Literaltext im JSX | dasselbe Gate, Muster „deutscher Literaltext in JSX-Textknoten" — mit Baseline für migrierte Bereiche |
| Nutzung der Übersetzung | `grep -rl "useTranslation" src` — wächst mit jedem migrierten Bereich |
| Keine Interpolation im Schlüssel | Gate-Regel: Schlüssel enthalten kein `{` |
| Pluralformen | `grep -rn "_one\|_other" src/i18n/locales/*.json` — in beiden Sprachen identisch |
| Zahlenformat | `grep -rn "toLocaleString()" src` → 0 Treffer ohne Locale-Argument |
| `lang`-Attribut | `src/app/layout.tsx:32` — folgt `i18n.language` |
