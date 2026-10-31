/**
 * Last-round banner messages
 *
 * Shown when the final round begins — either because the time ran out or
 * because the last rotation starts. Tone: dramatic, spicy, sometimes sassy.
 * YDKJ style.
 */

import type { IconName } from '@/components/art/Icon';

export interface LastRoundMessage {
  headline: string;
  subline: string;
  /** The symbol that stands for the message — drawn, not an emoji. */
  symbol: IconName;
}

export const LAST_ROUND_MESSAGES: LastRoundMessage[] = [
  {
    headline: 'LETZTE RUNDE',
    subline: 'Jetzt oder nie. Für immer oder gar nicht.',
    symbol: 'flag',
  },
  {
    headline: 'DAS FINALE',
    subline: 'Wer nicht alles gibt, bereut es auf dem Weg nach Hause.',
    symbol: 'flag',
  },
  {
    headline: 'ALLES AUF EINE KARTE',
    subline: 'Eine Runde noch. Dann wird abgerechnet.',
    symbol: 'card',
  },
  {
    headline: 'SHOWDOWN',
    subline: 'Der letzte Zug bestimmt die Legende.',
    symbol: 'card',
  },
  {
    headline: 'LAST CALL',
    subline: 'Der Barkeeper macht Licht. Letzte Runde, Leute.',
    symbol: 'flag',
  },
  {
    headline: 'JETZT ODER NIE',
    subline: 'Runde. Nummer. Letzte. Das ist Mathematik.',
    symbol: 'flag',
  },
  {
    headline: 'ENDSPURT',
    subline: 'Die Punkte, die du jetzt nicht holst, holt jemand anderes.',
    symbol: 'trophy',
  },
  {
    headline: 'VORHANG AUF',
    subline: 'Das Finale läuft. Kein Zurück mehr.',
    symbol: 'trophy',
  },
  {
    headline: 'DU HAST NUR NOCH EINE CHANCE',
    subline: 'Nein, wirklich. Eine. Letzte. Runde.',
    symbol: 'flag',
  },
  {
    headline: 'FINALE!',
    subline: 'Macht euch bereit für den großen Auftritt.',
    symbol: 'flag',
  },
  {
    headline: 'NOCH EINMAL ALLES GEBEN',
    subline: 'Dann Chips und Selbstmitleid. Aber erst die Runde.',
    symbol: 'card',
  },
  {
    headline: 'ZEIT IST UM',
    subline: 'Die Uhr hat aufgehört zu ticken. Die Runde läuft trotzdem.',
    symbol: 'trophy',
  },
];

export function pickLastRoundMessage(): LastRoundMessage {
  return LAST_ROUND_MESSAGES[
    Math.floor(Math.random() * LAST_ROUND_MESSAGES.length)
  ]!;
}
