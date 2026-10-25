#!/usr/bin/env node
/**
 * Quality gate: documentation language check
 * -------------------------------------------------------------------------
 * Reports German text that is left over in the project documentation.
 *
 * Scope (deliberately limited, same tree as scripts/check-doc-links.mjs):
 *   - Root: all `.md` files directly in the repository root
 *   - `docs/` recursively
 *   - `specifications/` recursively
 *   - `project/` and `.github/` recursively (machine-readable state and CI
 *     definitions, including `.yaml`/`.yml` files — see collectFiles())
 *
 * What is treated as technical literal and therefore NOT checked:
 *   - fenced code blocks (``` or ~~~) and indented code blocks
 *   - inline code spans (`code`) — identifiers, paths, commands, test names
 *   - link and image targets (`](target)`) and bare URLs
 *   - HTML comments
 *
 * What IS checked:
 *   - prose (headings, paragraphs, table cells, list items, block quotes)
 *
 * Detection markers:
 *   1. umlauts and eszett (ä ö ü ß / Ä Ö Ü)
 *   2. German function words that do not exist in English (und, nicht, muss …)
 *   3. German content words that do not exist in English (Anforderung, Nachweis …)
 *
 * Output: `file:line` + the offending text. Exit code 1 if findings exist.
 *
 * Options:
 *   --report       print one finding per line, exit 0 (pure report, for grep/counting)
 *   --root=<path>  check a different tree (default: the repository)
 *   --files=<a,b>  restrict the scan to the given files (comma separated)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

/* ------------------------------------------------------------------ *
 * Marker lists
 * ------------------------------------------------------------------ */

/** Umlauts and eszett — a reliable German signal in running text. */
const UMLAUT_RE = /[ÄÖÜäöüß]/;

/**
 * German function words. Only words that do NOT exist in the English
 * language are listed (no "in", "no", "all", "so", "also", "bin", …).
 * The regex is case-insensitive, therefore the sentence-initial capital
 * form is covered as well.
 */
const GERMAN_FUNCTION_WORDS = [
  // articles, pronouns, possessives
  'der', 'des', 'dem', 'den', 'die', 'das', 'ein', 'eine', 'einen', 'einem',
  'einer', 'eines', 'kein', 'keine', 'keinen', 'keiner', 'jeder', 'jede',
  'jedes', 'jener', 'welcher', 'welche', 'welches', 'dieser', 'diese',
  'dieses', 'diesem', 'diesen', 'solcher', 'solche', 'alle', 'alles',
  'andere', 'anderen', 'anderer', 'mehrere', 'einige', 'einiger',
  'eigen', 'eigene', 'eigenen', 'selbst', 'niemand', 'jemand',
  'seiner', 'seine', 'seinen', 'ihrer', 'ihre', 'ihren', 'unser', 'unsere',
  // conjunctions
  'und', 'oder', 'aber', 'denn', 'sondern', 'sowie', 'bzw', 'als', 'während',
  'weil', 'damit', 'sodass', 'sofern', 'insofern', 'falls', 'obwohl',
  'allerdings', 'jedoch', 'trotzdem', 'dennoch', 'ferner', 'zudem',
  'darüberhinaus', 'außerdem', 'hingegen', 'andererseits',
  'somit', 'folglich', 'infolgedessen', 'daher', 'deshalb',
  'demnach', 'drum', 'zwar', 'indes',
  // verbs (finite forms)
  'ist', 'sind', 'war', 'waren', 'bist', 'seid', 'wird',
  'werden', 'wurde', 'wurden', 'wäre', 'wären', 'hätte', 'hätten', 'kann',
  'kannst', 'können', 'könnte', 'könnten', 'muss', 'müssen', 'musste',
  'mussten', 'soll', 'sollen', 'sollte', 'sollten', 'darf', 'dürfen',
  'mögen', 'will', 'wollen', 'möchte', 'möchten', 'hatte', 'hatten',
  'haben', 'habe', 'habt', 'gibt', 'gab', 'geben',
  'geschieht', 'geschah', 'erfolgt', 'erfolgte', 'besteht', 'bestehen',
  'entsteht', 'entstand', 'gehört', 'gehören', 'gilt', 'gelten', 'liegt',
  'liegen', 'steht', 'stehen', 'setzt', 'setzen', 'führt', 'führen',
  'zeigt', 'zeigen', 'enthält', 'enthalten', 'umfasst', 'umfassen',
  'betrifft', 'betreffen', 'erlaubt', 'erlauben', 'verbietet',
  'untersagt', 'verlangt', 'erfordert', 'erfordern', 'empfiehlt', 'empfehlen',
  'schreibt', 'schreiben', 'lässt', 'lassen', 'bleibt', 'bleiben',
  'nennt', 'nennen', 'sorgt', 'sorgen', 'hilft',
  'helfen', 'zählt', 'zählen', 'kostet', 'kosten', 'braucht', 'brauchen',
  // adverbs, conjunctions, prepositions
  'nicht', 'nichts', 'niemals', 'immer', 'nie', 'oft', 'selten',
  'meist', 'meistens', 'nur', 'auch', 'noch', 'schon', 'wieder', 'erneut',
  'zuvor', 'zunächst', 'danach', 'dann', 'hier', 'dort', 'da',
  'hierbei', 'hierfür', 'hierin', 'dabei', 'dafür', 'daran', 'darauf',
  'darin', 'darüber', 'darunter', 'durchaus', 'eher', 'bereits',
  'gleichzeitig', 'anschließend', 'abschließend', 'ursprünglich',
  'schließlich', 'letztlich', 'mittlerweile', 'inzwischen', 'vorläufig',
  'endgültig', 'insgesamt', 'insbesondere', 'grundsätzlich', 'prinzipiell',
  'tatsächlich', 'eigentlich', 'vermutlich', 'wahrscheinlich',
  'möglicherweise', 'gegebenenfalls', 'ggf', 'evtl', 'eventuell', 'usw',
  'zgl', 'etc', 'beziehungsweise', 'statt', 'anstatt', 'innerhalb',
  'außerhalb', 'ausserhalb', 'bevor', 'nachdem', 'solange', 'sobald',
  'mehr', 'weniger', 'sehr', 'ziemlich', 'etwa', 'ungefähr',
  'mindestens', 'höchstens', 'wenigstens', 'gerade', 'geradezu',
  'ohne', 'durch', 'gegen', 'zwischen', 'wegen', 'hinsichtlich', 'bezüglich',
  'gemäß', 'gemaess', 'anhand', 'aufgrund', 'infolge', 'seit', 'bis',
  'zumal', 'ausschließlich', 'ausschliesslich', 'lediglich', 'ebenfalls',
  'sämtliche', 'saemtliche', 'zwecks', 'anlässlich', 'anlaesslich',
  'abzüglich', 'zuzüglich', 'inklusive', 'einschließlich', 'sämtlich',
  'zum', 'zur', 'vom', 'von', 'aus', 'im', 'am', 'auf', 'für',
  'mit', 'um', 'vor', 'nach', 'bei', 'beim', 'über', 'unter',
];

/**
 * German content words that do not exist in English. Kept short on purpose:
 * the goal is high precision, not a complete German lexicon.
 */
const GERMAN_CONTENT_WORDS = [
  'Anforderung', 'Anforderungen', 'Anforderungsblock', 'Anforderungsblocks',
  'Begründung', 'Begründungen', 'Akzeptanz', 'Akzeptanzkriterien',
  'Verifikation', 'Nachweis', 'Nachweise', 'Abnahme',
  'Abnahmekriterien', 'Meilenstein', 'Meilensteine', 'Grundlage',
  'Gültigkeitsbereich', 'Grenzwert', 'Grenzwerte', 'Reststand',
  'Restarbeiten', 'Lücke', 'Lücken', 'Angriff', 'Angriffe', 'Angriffsfläche',
  'Härtung', 'Haertung', 'Schweregrad', 'Schweregrade', 'Meldung',
  'Meldungen', 'Meldeweg', 'Datenminimierung', 'Bedrohungsmodell',
  'Gegenmaßnahme', 'Gegenmassnahme', 'Sichtbarkeit', 'Größe', 'Groesse',
  'Abschnitt', 'Abschnitte', 'Überschrift', 'Überschriften', 'Tabelle',
  'Tabellen', 'Beispiel', 'Beispiele', 'Voraussetzung', 'Voraussetzungen',
  'Zusammenfassung', 'Uebersicht', 'Übersicht', 'Hinweis',
  'Hinweise', 'Prüfung', 'Prüfungen', 'Aussage', 'Aussagen', 'Ergebnis',
  'Ergebnisse', 'Widerspruch', 'Widersprüche', 'Widersprueche',
  'Regel', 'Regeln', 'Fehler', 'Fehlern', 'Datei', 'Dateien', 'Zeile',
  'Zeilen', 'Wert', 'Werte', 'Änderung', 'Änderungen', 'Aenderung',
  'Aenderungen', 'Schritt', 'Schritte', 'Teil', 'Teile', 'Seite', 'Seiten',
  'Verzeichnis', 'Verzeichnisse', 'Befund', 'Befunde', 'Freigabe', 'Risiko',
  'Risiken', 'Massnahme', 'Massnahmen', 'Maßnahme', 'Maßnahmen', 'Laufzeit',
  'Umgebung', 'Umgebungen', 'Antwort', 'Antworten', 'Frage', 'Fragen',
  'Dokumentation', 'Dokumente', 'Sprache', 'Sprachen', 'Zeitpunkt',
  'Zeitpunkte', 'Zugriff', 'Zugriffe', 'Schlüssel', 'Kanal', 'Kanäle',
  'Oberfläche', 'Oberflaechen', 'Einstellung', 'Einstellungen',
  'Variante', 'Varianten', 'Aufgabe', 'Aufgaben',
  'Beleg', 'Belege', 'Sicherung', 'Sicherungen',
  'Spielrunde', 'Spielrunden', 'Spielmodus', 'Spielmodi',
  'Karte', 'Karten', 'Runde', 'Runden',
  'Punkte', 'Punkten', 'Punktestand', 'Punktekonto', 'Punktevergabe',
  'Sieger', 'Verlierer', 'Fragerunde',
  'Katalog', 'Katalogeintrag', 'Katalogeintraege',
  'Anbieter', 'Vorschau', 'Vorschauen', 'Jahrgang',
  'Jahrgaenge', 'Jahrgänge', 'Aufdeckung', 'Verdeckung', 'Stimme',
  'Stimmungen', 'Wertung', 'Wertungen', 'Bonuspunkte',
  'Maluspunkte', 'Zeitlimit', 'Zeitlimits', 'Zeitfenster', 'Reihenfolge',
  'Phasen', 'Phase', 'Wartezeit',
  'Ende', 'Auswertung', 'Auswertungen', 'Belohnung', 'Belohnungen',
  'Bestrafung', 'Bestrafungen', 'Freischaltung', 'Freischaltungen',
  'Speicherstand', 'Speicherstaende', 'Speicherstände', 'Sitzung',
  'Sitzungen', 'Gerät', 'Geraet', 'Geräte', 'Geraete', 'Bedienung',
  'Anleitung', 'Anleitungen', 'Hinweistext', 'Meldungstext', 'Fehlermeldung',
  'Fehlermeldungen', 'Warnung', 'Warnungen', 'Härten', 'Absicherung',
  'Absicherungen', 'Vertraulichkeit', 'Vollständigkeit',
  'Richtigkeit', 'Nachvollziehbarkeit', 'Wartbarkeit', 'Pflegbarkeit',
  'Änderungsantrag', 'Aenderungsantrag', 'Aenderungsantraege',
  'Änderungsanträge', 'Entscheidung', 'Entscheidungen', 'Beschluss',
  'Beschluesse', 'Beschlüsse', 'Einleitung', 'Abschluss', 'Fazit', 'Nachwort',
  'Anhang', 'Anhaenge', 'Anhänge', 'Inhalt', 'Inhalte',
  'Glossar', 'Begriffe', 'Begriff', 'Begriffsdefinition', 'Terminologie',
  'Übersetzungen', 'Uebersetzungen', 'Sprachregel', 'Sprachregeln',
  'Gültigkeit', 'Gueltigkeit', 'Zweck', 'Ziele', 'Ziel', 'Mittel',
  'Aufwand', 'Abhängigkeit', 'Abhängigkeit', 'Abhaengigkeit',
  'Abhängigkeiten', 'Abhaengigkeiten', 'Schnittstelle', 'Schnittstellen',
  'Komponente', 'Komponenten', 'Modulgrenze', 'Modulgrenzen',
  'Konfiguration', 'Konfigurationen', 'Standardwert', 'Standardwerte',
  'Vorgabewert', 'Vorgabewerte', 'Schwellenwert', 'Schwellenwerte',
  'Grenze', 'Grenzen', 'Bereich', 'Bereiche', 'Umfang', 'Sachgebiet',
  'Zuständigkeit', 'Zustaendigkeit', 'Verantwortung',
  'Quelle', 'Quellen', 'Fundstelle', 'Fundstellen', 'Belegstelle',
  'Belegstellen', 'Zeilenangabe', 'Zeilenangaben', 'Messwert', 'Messwerte',
  'Messung', 'Messungen', 'Messmethode', 'Messmethoden', 'Erhebung',
  'Erhebungen', 'Testlauf', 'Testlaeufe', 'Testläufe', 'Testfall',
  'Testfaelle', 'Testfälle', 'Testname', 'Testnamen', 'Prüfbericht',
  'Pruefbericht', 'Prüfberichte', 'Pruefberichte', 'Protokoll', 'Protokolle',
  'Ausgabe', 'Ausgaben', 'Eingabe', 'Eingaben', 'Rückmeldung',
  'Rueckmeldung', 'Rückmeldungen', 'Abgleich', 'Vollständigkeitsprüfung',
  'Vollstaendigkeitspruefung', 'Restriktion', 'Restriktionen',
  'Einschränkung', 'Einschraenkung', 'Einschränkungen',
  'Abwesenheit', 'Anwesenheit', 'Häufigkeit', 'Haeufigkeit',
  'Wahrscheinlichkeit', 'Auswirkung', 'Auswirkungen', 'Wirkung', 'Wirkungen',
  'Maßgabe', 'Massgabe', 'Maßgaben', 'Massgaben', 'Leitplanke', 'Leitplanken',
  'Spielstand', 'Spielstaende', 'Spielstände', 'Rangliste', 'Ranglisten',
  'Platz', 'Plaetze', 'Plätze', 'Gewinner',
  'Gewinnerin', 'Verliererin', 'Spieler', 'Spielerin',
  'Spielerinnen', 'Spielern',
  'Mitspieler', 'Mitspielerin', 'Teammitglied', 'Teammitglieder',
  'Kartenformat', 'Druck', 'Druckbogen', 'Karton', 'Papier', 'Drucker',
  'Etikett', 'Etiketten', 'Aufkleber', 'QR-Code', 'QR-Codes',
  'Kamera', 'Berechtigung', 'Berechtigungen',
  'Punkt', 'Punkte', 'Malus',
  'Zeit', 'Zeiten', 'Sekunden', 'Minuten', 'Stunden', 'Millisekunden',
  'Größenordnung', 'Groessenordnung', 'Bandbreite', 'Zeitverhalten',
  'Reaktionszeit', 'Antwortzeit', 'Antwortzeiten', 'Durchsatz', 'Latenz',
  'Speicherbedarf', 'Arbeitsspeicher',
  'Coldstart', 'Cold-Start', 'Aufwärmphase', 'Warmstart',
  // frequent German nouns and adjectives that do not exist in English
  'Wort', 'Wörter', 'Satz', 'Sätze', 'Absatz', 'Absätze', 'Kapitel',
  'Stelle', 'Stellen', 'Anfang', 'Mitte', 'Rand', 'Ebene', 'Ebenen',
  'Schicht', 'Schichten', 'Kategorie', 'Kategorien', 'Typ', 'Typen',
  'Sorte', 'Wahl', 'Möglichkeit', 'Möglichkeiten', 'Weg', 'Weise',
  'Prozess', 'Prozesse', 'Vorgang', 'Vorgänge', 'Moment', 'Momente',
  'Anlass', 'Grund', 'Gründe', 'Gründen', 'Ursache', 'Ursachen',
  'Folge', 'Folgen', 'Erfolg', 'Lösung', 'Lösungen', 'Rückfrage',
  'Störung', 'Störungen', 'Ausfall', 'Mangel', 'Mängel', 'Anmerkung',
  'Anmerkungen', 'Bemerkung', 'Bemerkungen', 'Notiz', 'Notizen',
  'Eintrag', 'Einträge', 'Datensatz', 'Datensätze', 'Zahl', 'Zahlen',
  'Länge', 'Breite', 'Höhe', 'Fläche', 'Volumen', 'Gewicht', 'Alter',
  'Farbe', 'Farben', 'Muster', 'Kriterium', 'Kriterien', 'Bedingung',
  'Bedingungen', 'Vorbedingung', 'Nachbedingung', 'Ausnahme',
  'Ausnahmen', 'Sonderfall', 'Vorgabe', 'Vorgaben', 'Richtlinie',
  'Grundsatz', 'Grundsätze', 'Wortlaut', 'Formulierung', 'Formulierungen',
  'Angabe', 'Angaben', 'Erläuterung', 'Erläuterungen',
  'Schlussfolgerung', 'Schlussfolgerungen', 'Überlegung', 'Überlegungen',
  'Abwägung', 'Chance', 'Chancen', 'Gefahr', 'Gefahren', 'Bedrohung',
  'Bedrohungen', 'Schwachstelle', 'Schwachstellen', 'Stärke', 'Stärken',
  'Vorteil', 'Vorteile', 'Nachteil', 'Nachteile', 'Kompromiss',
  'Festlegung', 'Festlegungen', 'Etappe', 'Etappen', 'Iteration',
  'Iterationen', 'Durchlauf', 'Durchläufe', 'Wiederholung',
  'Wiederholungen', 'Anzahl', 'Menge', 'Mengen', 'Summe', 'Summen',
  'Durchschnitt', 'Durchschnitte', 'Mittelwert', 'Mittelwerte', 'Anteil',
  'Anteile', 'Prozent', 'Prozente', 'Faktor', 'Faktoren', 'Abweichung',
  'Abweichungen', 'Differenz', 'Differenzen', 'Varianz', 'Korrelation',
  'Effekt', 'Effekte',
  'erste', 'ersten', 'erster', 'letzte', 'letzten', 'zweite', 'zweiten',
  'dritte', 'dritten', 'neue', 'neuen', 'neuer', 'neues', 'alte',
  'alten', 'große', 'grossen', 'grosse', 'kleine', 'kleinen',
  'richtige', 'richtigen', 'falsche', 'falschen', 'mögliche', 'möglichen',
  'nötige', 'nötigen', 'wichtige', 'wichtigen', 'ganze', 'ganzen',
  'gesamte', 'gesamten', 'hohe', 'hohen', 'tiefe', 'niedrige', 'nächste',
  'nächsten', 'gute', 'guten', 'lange', 'langen', 'kurze', 'kurzen',
  'einfache', 'einfachen', 'komplexe', 'komplexen', 'schnelle',
  'langsame', 'sichere', 'sicheren', 'unsichere', 'feste', 'freie',
  'aktuelle', 'bestehende', 'bestehenden', 'offene', 'offenen',
  'geschlossene', 'öffentliche', 'private', 'deutsche', 'deutschen',
  'englische', 'englischen', 'halbe', 'doppelte', 'viel', 'viele',
  'vielen', 'beide', 'beiden', 'wie', 'ob',
];

/** Words that exist in English as well and must not trigger a finding. */
const ENGLISH_LOOKALIKES = new Set([
  'die', 'war', 'hat', 'man', 'ist', 'in', 'an', 'as', 'at',
  'so', 'all', 'no', 'not', 'but', 'for', 'from', 'with', 'on', 'or', 'of',
  'to', 'by', 'is', 'be', 'do', 'we', 'me', 'my', 'us', 'up', 'he', 'she',
  'am', 'can', 'may', 'will', 'one', 'new', 'now', 'old', 'our', 'out',
  'own', 'see', 'set', 'say', 'six', 'some', 'son', 'such', 'ten', 'than',
  'that', 'the', 'them', 'then', 'they', 'this', 'those', 'time', 'two',
  'under', 'use', 'very', 'want', 'way', 'well', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'why', 'with', 'work', 'year', 'yes',
  'yet', 'you', 'your', 'also', 'back', 'best', 'better', 'even', 'every',
  'first', 'last', 'long', 'made', 'make', 'many', 'more', 'most', 'much',
  'must', 'need', 'next', 'none', 'off', 'open', 'part', 'per', 'plan',
  'red', 'run', 'said', 'same', 'saw', 'send', 'sing', 'sit', 'spring',
  'stand', 'star', 'stay', 'step', 'still', 'stop', 'sun', 'test', 'top',
  'until', 'upon', 'past', 'present', 'read', 'right', 'round',
  'since', 'small', 'take', 'thing', 'think', 'three', 'toward', 'true',
  'turn', 'went', 'whole', 'without', 'within', 'list', 'lists', 'lines',
  'line', 'file', 'files', 'value', 'values', 'case', 'cases', 'note',
  'notes', 'text', 'texts', 'name', 'names', 'title', 'titles', 'index',
  'level', 'levels', 'type', 'types', 'point', 'points', 'number', 'numbers',
  'user', 'users', 'player', 'players', 'song', 'songs', 'cover', 'covers',
  'project', 'projects', 'build', 'builds', 'commit', 'commits', 'branch',
  'branches', 'key', 'keys', 'token', 'tokens', 'env', 'config', 'issue',
  'issues', 'bug', 'bugs', 'feature', 'features', 'release', 'releases',
  'run', 'runs', 'log', 'logs', 'script', 'scripts', 'command', 'commands',
  'option', 'options', 'default', 'defaults', 'block', 'blocks', 'item',
  'items', 'section', 'sections', 'row', 'rows', 'column', 'columns',
  'header', 'headers', 'footer', 'footers', 'button', 'buttons', 'label',
  'labels', 'screen', 'screens', 'page', 'pages', 'view', 'views', 'layer',
  'layers', 'module', 'modules', 'bound', 'bounds', 'sample', 'samples',
  'fixture', 'fixtures', 'snapshot', 'snapshots', 'input', 'inputs',
  'output', 'outputs', 'source', 'sources', 'target', 'targets', 'payload',
  'payloads', 'status', 'version', 'stand', 'fall', 'team', 'teams', 'card',
  'cards', 'match', 'links', 'link', 'report', 'reports', 'gate', 'gates',
  'rule', 'rules', 'error', 'errors', 'word', 'words', 'state', 'states',
  'check', 'checks', 'message', 'messages', 'disclosure', 'evidence',
  'acceptance', 'requirement', 'requirements', 'milestone', 'milestones',
  'baseline', 'scope', 'size', 'visible', 'visibility', 'documentation',
  'document', 'table', 'tables', 'heading', 'headings', 'example', 'examples',
  'reason', 'rationale', 'verification', 'change', 'changes', 'limit',
  'limits', 'gap', 'gaps', 'attack', 'attacks', 'hardening', 'severity',
  'base', 'date', 'day', 'week', 'month', 'hour', 'minute', 'second',
  'bundle', 'bundles', 'chunk', 'chunks', 'scan', 'pause', 'start',
  'bonus', 'discussion', 'playlist', 'falls', 'etc', 'will',
  'private',
]);

/* ------------------------------------------------------------------ *
 * Text extraction
 * ------------------------------------------------------------------ */

const FUNCTION_WORD_RE = new RegExp(
  `(^|[^A-Za-zÄÖÜäöüß])(${GERMAN_FUNCTION_WORDS
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})([^A-Za-zÄÖÜäöüß]|$)`,
  'gi'
);

/**
 * Acronyms and initialisms that happen to be spelled like a German word:
 * MIT, IN, IT, DIE (as in the band), SO, OS. They are written in capitals and
 * are never German prose, so they are exempt.
 */
const ACRONYM_RE = /\b[A-Z]{2,}\b/g;

const CONTENT_WORD_RE = new RegExp(
  `(^|[^A-Za-zÄÖÜäöüß])(${GERMAN_CONTENT_WORDS
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})([^A-Za-zÄÖÜäöüß]|$)`,
  'g'
);

/** Replace a match with blanks, keeping the line structure intact. */
function blank(match) {
  return match.replace(/[^\n]/g, ' ');
}

/**
 * Mask everything that is technical literal: fenced code blocks, inline code
 * spans, HTML comments, link targets and URLs. Line numbers are preserved.
 */
function maskTechnical(content) {
  let out = content;

  // Quoted strings are treated as literal: a German interface string that a
  // document quotes verbatim ("Der Ton wird von deinem Browser blockiert") is
  // content of the product, not prose of the document.
  out = out.replace(/"[^"\n]{2,120}"/g, (m) => ' '.repeat(m.length));
  out = out.replace(/[„“][^„“\n]{2,120}[„“]/g, (m) => ' '.repeat(m.length));

  // fenced code blocks
  out = out.replace(/^([ \t]{0,3})(`{3,}|~{3,})[\s\S]*?^\1?\2[ \t]*$/gm, blank);

  // inline code spans (may span several lines)
  out = out.replace(/`[^`]*`/g, blank);

  // HTML comments
  out = out.replace(/<!--[\s\S]*?-->/g, blank);

  // link / image targets — keep the visible text, drop the target
  out = out.replace(/(\]\()([^)]*)(\))/g, '$1 $3');

  // autolinks and bare URLs
  out = out.replace(/<https?:\/\/[^>]*>/g, blank);
  out = out.replace(/https?:\/\/\S+/g, blank);

  return out;
}

/** Strip markdown emphasis markers so that `*Wort*` is read as `Wort`. */
function stripEmphasis(text) {
  return text.replace(/[*_~]+/g, '');
}

/**
 * Collect the findings of one markdown file.
 * Returns an array of { line, text, markers }.
 */
export function scanFile(content) {
  const masked = maskTechnical(content);
  const rawLines = content.split(/\r?\n/);
  const maskedLines = masked.split(/\r?\n/);
  const findings = [];

  for (let i = 0; i < rawLines.length; i += 1) {
    const raw = rawLines[i];
    // Acronyms (MIT, BSD, GPL, OS, …) are masked out: they are written in
    // capitals and are never German prose, even when they are spelled like a
    // German word.
    const prose = stripEmphasis(maskedLines[i] ?? '').replace(ACRONYM_RE, ' ');
    if (!prose.trim()) continue;

    const markers = [];
    const umlauts = prose.match(/[ÄÖÜäöüß]/g);
    if (umlauts) markers.push([...new Set(umlauts)].join(''));

    FUNCTION_WORD_RE.lastIndex = 0;
    let match = FUNCTION_WORD_RE.exec(prose);
    while (match !== null) {
      const word = match[2].toLowerCase();
      if (!ENGLISH_LOOKALIKES.has(word)) markers.push(word);
      match = FUNCTION_WORD_RE.exec(prose);
    }

    CONTENT_WORD_RE.lastIndex = 0;
    match = CONTENT_WORD_RE.exec(prose);
    while (match !== null) {
      if (!ENGLISH_LOOKALIKES.has(match[2].toLowerCase())) {
        markers.push(match[2]);
      }
      match = CONTENT_WORD_RE.exec(prose);
    }

    if (markers.length > 0) {
      findings.push({
        line: i + 1,
        text: raw.trim(),
        markers: [...new Set(markers)],
      });
    }
  }

  return findings;
}

/* ------------------------------------------------------------------ *
 * File collection
 * ------------------------------------------------------------------ */

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      // The archive holds verbatim snapshots of the German-language era.
      // Translating them would falsify the record, so they are exempt.
      if (entry.name === 'archive' && path.basename(dir) === 'specifications') continue;
      walk(full, out);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.md') ||
        entry.name.endsWith('.yaml') ||
        entry.name.endsWith('.yml'))
    ) {
      out.push(full);
    }
  }
  return out;
}

export function collectFiles(root) {
  const files = [];
  for (const name of fs.readdirSync(root)) {
    // hidden files (e.g. temporary backups of parallel work) are not
    // project documentation and are therefore not scanned
    if (name.startsWith('.')) continue;
    const full = path.join(root, name);
    if (fs.statSync(full).isFile() && name.endsWith('.md')) files.push(full);
  }
  for (const dir of ['docs', 'specifications', 'project', '.github']) {
    const full = path.join(root, dir);
    if (fs.existsSync(full)) walk(full, files);
  }
  return files.sort();
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

function main() {
  const args = process.argv.slice(2);
  const report = args.includes('--report');
  const rootArg = args.find((a) => a.startsWith('--root='));
  const filesArg = args.find((a) => a.startsWith('--files='));
  const root = rootArg ? path.resolve(rootArg.slice('--root='.length)) : REPO_ROOT;

  let files = collectFiles(root);
  if (filesArg) {
    const wanted = filesArg
      .slice('--files='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    files = files.filter((f) => wanted.some((w) => f.endsWith(w)));
  }

  let total = 0;
  const perFile = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const findings = scanFile(content);
    if (findings.length === 0) continue;
    total += findings.length;
    perFile.push({ file, findings });
    if (report) {
      for (const f of findings) {
        const rel = path.relative(root, file);
        console.log(`${rel}:${f.line}: ${f.text}`);
      }
    }
  }

  if (!report) {
    for (const { file, findings } of perFile) {
      const rel = path.relative(root, file);
      console.log(`${rel}: ${findings.length} finding(s)`);
      for (const f of findings) {
        console.log(`  ${f.line}: ${f.text}`);
      }
    }
    console.log(`\nMarkdown files checked: ${files.length} — findings: ${total}`);
  } else {
    console.log(`# Markdown files checked: ${files.length} — findings: ${total}`);
  }

  process.exit(total > 0 && !report ? 1 : 0);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
