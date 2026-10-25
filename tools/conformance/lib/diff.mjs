/**
 * The field-by-field comparison of two observations
 *
 * WHY: "the result does not match" is not an evidence. Every difference
 * names the path inside the observation, the expected value and the actual
 * value.
 */

/**
 * The fields of an observation — the completeness check of an expectation.
 *
 * WHY: a portable vector has to assert the complete observation, otherwise a
 * field could be forgotten without anybody noticing. A vector that is not
 * portable (a documented divergence) may assert a part of it only.
 */
export const OBSERVATION_FIELDS = [
  'phases',
  'currentRound',
  'currentMode',
  'currentSongId',
  'currentSongSource',
  'autoDrawIntent',
  'playerScores',
  'teamScores',
  'playerTeams',
  'teamMembers',
  'turnOrder',
  'currentTurnIndex',
  'winnerId',
  'isGameOver',
  'timelineYears',
  'playedSongIds',
  'answers',
  'roundCount',
  'totalXP',
  'censorHint',
  'filteredSongIds',
  'error',
];

/**
 * Compares two values and returns the concrete differences.
 *
 * WHY: "the result does not match" is not an evidence. Every difference
 * names the path inside the observation, the expected value and the actual
 * value. Only the keys that the expectation names are compared — the
 * expectation is the specification.
 *
 * @param {unknown} expected - the expected value
 * @param {unknown} actual - the actual value
 * @param {string} [prefix] - the path of the current value
 * @returns {{path: string, expected: unknown, actual: unknown}[]}
 */
export function diffValues(expected, actual, prefix = '') {
  if (expected === actual) return [];

  const isObject = (value) =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return [{ path: prefix || '(root)', expected, actual }];
    }
    if (expected.length !== actual.length) {
      return [
        {
          path: `${prefix}.length`,
          expected: expected.length,
          actual: actual.length,
        },
      ];
    }
    return expected.flatMap((value, index) =>
      diffValues(value, actual[index], `${prefix}[${index}]`)
    );
  }

  if (isObject(expected)) {
    if (!isObject(actual)) {
      return [{ path: prefix || '(root)', expected, actual }];
    }
    return Object.keys(expected).flatMap((key) =>
      diffValues(expected[key], actual[key], prefix ? `${prefix}.${key}` : key)
    );
  }

  return [{ path: prefix || '(root)', expected, actual }];
}

/**
 * Checks whether an expectation asserts the complete observation.
 *
 * @param {object} expectation - the expectation of a vector
 * @returns {string[]} the names of the missing fields
 */
export function missingExpectationFields(expectation) {
  return OBSERVATION_FIELDS.filter(
    (field) => !Object.prototype.hasOwnProperty.call(expectation, field)
  );
}
