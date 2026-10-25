/**
 * The names of the teams.
 *
 * WHAT: the list of the funny team names, the colours of the teams and the
 * choice of a name that nobody uses yet.
 *
 * WHY they live here and not in the store: the names are content, not
 * state. The store keeps the teams of the running game; the names are the
 * pool the teams are named from.
 *
 * EXAMPLE: two teams get two different names out of the pool.
 */

/** The pool of the team names. */
const FUNNY_TEAM_NAMES = [
  'Die Ohrwürmer',
  'Stimmbruch Deluxe',
  'Absolute Divas',
  'Team Gänsehaut',
  'Die Taktlosen',
  'Bass im Gesicht',
  'Die Plattenbosse',
  'Vollplayback',
  'Die Kopfhörer-Diebe',
  'Team Zugabe',
  'Karaoke-Katastrophe',
  'Die Falschen Noten',
  'Riff Raff',
  'Die Discokugel-Gang',
  'Team Eintagsfliege',
  'Einfach zu laut',
  'Die Hinterbänkler',
  'Team Aufgedreht',
  'Die Plattenspieler',
  'Autotune-Verbot',
  'Team Schallmauer',
  'Die Dauerschleife',
  'Mosh-Pit-Diplomaten',
  'Team Bassgewicht',
];

/** The colours of the teams. */
export const TEAM_COLORS = [
  '#FF6B35',
  '#118AB2',
  '#06D6A0',
  '#EF476F',
  '#9B5DE5',
  '#FFD166',
];

/**
 * Chooses a name that nobody uses yet.
 *
 * WHY the fallback: when every name is taken, the pool is used again — a
 * game with more teams than names still has to start.
 *
 * @param usedNames - The names that are already taken.
 * @returns The name of the new team.
 */
export function pickTeamName(usedNames: string[]): string {
  const available = FUNNY_TEAM_NAMES.filter((name) => !usedNames.includes(name));
  const pool = available.length > 0 ? available : FUNNY_TEAM_NAMES;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
