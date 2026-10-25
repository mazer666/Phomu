/**
 * Last-Round Banner Messages
 *
 * Werden gezeigt, wenn die letzte Spielrunde beginnt —
 * entweder weil die Zeit abgelaufen ist oder die letzte Rotation startet.
 * Tonalität: dramatisch, spicy, manchmal frech. YDKJ-Stil.
 */

export interface LastRoundMessage {
  headline: string;
  subline: string;
  emoji: string;
}

export const LAST_ROUND_MESSAGES: LastRoundMessage[] = [
  {
    headline: 'LETZTE RUNDE',
    subline: 'Jetzt oder nie. Für immer oder gar nicht.',
    emoji: '🔔',
  },
  {
    headline: 'DAS FINALE',
    subline: 'Wer nicht alles gibt, bereut es auf dem Weg nach Hause.',
    emoji: '🏁',
  },
  {
    headline: 'ALLES AUF EINE KARTE',
    subline: 'Eine Runde noch. Dann wird abgerechnet.',
    emoji: '🃏',
  },
  {
    headline: 'SHOWDOWN',
    subline: 'Der letzte Zug bestimmt die Legende.',
    emoji: '🥊',
  },
  {
    headline: 'LAST CALL',
    subline: 'Der Barkeeper macht Licht. Letzte Runde, Leute.',
    emoji: '🍺',
  },
  {
    headline: 'JETZT ODER NIE',
    subline: 'Runde. Nummer. Letzte. Das ist Mathematik.',
    emoji: '💥',
  },
  {
    headline: 'ENDSPURT',
    subline: 'Die Punkte, die du jetzt nicht holst, holt jemand anderes.',
    emoji: '🏃',
  },
  {
    headline: 'VORHANG AUF',
    subline: 'Das Finale läuft. Kein Zurück mehr.',
    emoji: '🎬',
  },
  {
    headline: 'DU HAST NUR NOCH EINE CHANCE',
    subline: 'Nein, wirklich. Eine. Letzte. Runde.',
    emoji: '⏳',
  },
  {
    headline: 'FINALE!',
    subline: 'Macht euch bereit für den großen Auftritt.',
    emoji: '🎭',
  },
  {
    headline: 'NOCH EINMAL ALLES GEBEN',
    subline: 'Dann Chips und Selbstmitleid. Aber erst die Runde.',
    emoji: '🎯',
  },
  {
    headline: 'ZEIT IST UM',
    subline: 'Die Uhr hat aufgehört zu ticken. Die Runde läuft trotzdem.',
    emoji: '⏰',
  },
];

export function pickLastRoundMessage(): LastRoundMessage {
  return LAST_ROUND_MESSAGES[
    Math.floor(Math.random() * LAST_ROUND_MESSAGES.length)
  ]!;
}
