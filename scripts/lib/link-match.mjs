/**
 * Matching helpers for the link verification of the Phomu catalogue.
 * -------------------------------------------------------------------------
 * WHAT
 *   Pure functions that decide whether a provider track (Spotify, Amazon
 *   Music) is the *same recording* as a catalogue entry. No network access,
 *   no file system, no state — every function is a pure transformation so
 *   that it can be unit tested in isolation.
 *
 * WHY
 *   The link wave of the second session set 1,591 Spotify and 1,575 Amazon
 *   links. A link that is set is not a link that is verified: the catalogue
 *   only proves that *a* track was found, not that the *right* one was found.
 *   The match gate is the single place where "same song" is decided, so it
 *   lives in one reviewable module instead of being spread over the script.
 *
 *   The gate follows the method documented in
 *   `specifications/link_welle_status.md`:
 *     - core title  >= 0.95
 *     - artist      >= 0.90 (>= 0.85 when only a main artist is credited)
 *     - runtime     within <= 3 s of the reference, or a unique hit
 *
 * EXAMPLE
 *   import { matchGate } from './lib/link-match.mjs';
 *
 *   matchGate(
 *     { title: 'Can I Kick It?', artist: 'A Tribe Called Quest', durationSec: 251.79 },
 *     { title: 'Can I Kick It?', artist: 'A Tribe Called Quest', durationSec: 252 },
 *   );
 *   // => { verdict: 'ok', titleScore: 1, artistScore: 1, durationDelta: 0.21 }
 */

/** Version markers that describe a *different* recording of the same song. */
const QUALIFIER_PATTERN = /\(([^)]*)\)|\[([^\]]*)\]/g;

/** Credit clauses that follow the main artist. */
const CREDIT_PATTERN =
  /\s*(?:,|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+with\s+|\s+x\s+|\s+&\s+|\s+and\s+|\s+vs\.?\s+).*$/i;

/** Words that never carry meaning for the comparison. */
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and']);

/**
 * Qualifiers that mark a *different recording* of the same song.
 *
 * A remix, a live take or an instrumental version is not the track of the
 * catalogue entry — a link to it is a wrong link.
 */
const VERSION_MARKERS = [
  'mix',
  'remix',
  'remixed',
  'live',
  'acoustic',
  'instrumental',
  'karaoke',
  'club edit',
  'extended edit',
  'rework',
  'bootleg',
  'sped up',
  'slowed',
  'cover version',
  'demo',
  'vip',
  'unplugged',
  'ao vivo',
  'en vivo',
  'directo',
  'orchestral',
  'in session',
  'session',
];

/**
 * Qualifiers that mark a *new edition* of the same recording.
 *
 * A remaster is the same recording — the difference is only in the master,
 * so such a difference is reported, but it does not condemn the link.
 */
const EDITION_MARKERS = [
  'single',
  'single edit',
  'radio edit',
  'edit',
  'remaster',
  'remastered',
  'remasterization',
  'deluxe',
  'expanded',
  'anniversary',
  'edition',
  'version',
  'bonus',
  'anniversary edition',
];

/**
 * Normalise a string for the comparison.
 *
 * Lower case, without diacritics, without punctuation, with `&` and `+`
 * mapped to `and`. Everything that only carries spelling differences is
 * removed here so that the similarity below compares *content*.
 *
 * @param {string} value the raw string
 * @returns {string} the normalised string
 */
export function normalizeText(value) {
  if (!value) return '';
  return String(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Split a normalised string into its content words.
 *
 * @param {string} normalized the normalised string
 * @returns {string[]} the content words
 */
export function contentWords(normalized) {
  return normalized.split(' ').filter((word) => word.length > 0 && !STOP_WORDS.has(word));
}

/**
 * Feature credits — they belong to the artist, not to the title.
 */
const FEATURE_CREDIT =
  /\s*[,;]?\s*\b(?:ft|feat|featuring|with)\b\.?\s+[^()]+$/gi;

/**
 * Check whether a text contains a version or an edition marker.
 *
 * @param {string} text the normalised text
 * @returns {'version'|'edition'|null} the kind of marker
 */
function markerKind(text) {
  const value = normalizeText(text);
  if (!value) return null;
  if (VERSION_MARKERS.some((marker) => hasMarker(value, marker))) return 'version';
  if (EDITION_MARKERS.some((marker) => hasMarker(value, marker))) return 'edition';
  return null;
}

/**
 * Check whether a text contains a marker as a whole word.
 *
 * The word boundary matters: "firework" contains "rework", "remastered"
 * contains "master" — a plain substring search would call a song a remix.
 *
 * @param {string} value the normalised text
 * @param {string} marker the marker
 * @returns {boolean} whether the marker occurs as a word
 */
function hasMarker(value, marker) {
  const pattern = marker
    .split(' ')
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(`\\b${pattern}\\b`).test(value);
}

/**
 * Remove the feature credits of a title.
 *
 * @param {string} title the raw title
 * @returns {string} the title without the feature credits
 */
function removeFeatures(title) {
  return String(title ?? '').replace(FEATURE_CREDIT, ' ');
}

/**
 * Split the bracketed additions of a title into qualifiers.
 *
 * @param {string} title the raw title
 * @returns {{base: string, qualifiers: string[]}} the parsed title
 */
function splitBrackets(title) {
  const qualifiers = [];
  const base = String(title ?? '').replace(/[(\[]\s*([^\)\]]*?)\s*[)\]]/g, (match, inner) => {
    const text = normalizeText(inner);
    if (!text) return ' ';
    if (isFeatureCredit(inner)) return ' ';
    qualifiers.push(text);
    return ' ';
  });
  return { base, qualifiers };
}

/**
 * Split a dash suffix that carries a marker off the title.
 *
 * @param {string} base the title
 * @param {string[]} qualifiers the qualifiers collected so far
 * @returns {{base: string, qualifiers: string[]}} the parsed title
 */
function splitDash(base, qualifiers) {
  const dash = base.match(/^([\s\S]*?)\s+-\s+([\s\S]+)$/);
  if (!dash || !markerKind(dash[2])) return { base, qualifiers };
  // "Artist - Song" is not a version. Only a prefix that can be a title on
  // its own (at least two words) is read as the title, the suffix then
  // carries the version.
  if (contentWords(normalizeText(dash[1])).length < 2) return { base, qualifiers };
  return { base: dash[1], qualifiers: [...qualifiers, normalizeText(dash[2])] };
}

/**
 * Split a trailing marker word ("Una Cita Remix") off the title.
 *
 * @param {string} base the title
 * @param {string[]} qualifiers the qualifiers collected so far
 * @returns {{base: string, qualifiers: string[]}} the parsed title
 */
function splitTrailing(base, qualifiers) {
  const normalized = normalizeText(base);
  const words = normalized.split(' ');
  if (words.length <= 1 || !markerKind(words[words.length - 1])) {
    return { base: normalized, qualifiers };
  }
  return {
    base: words.slice(0, -1).join(' '),
    qualifiers: [...qualifiers, words[words.length - 1]],
  };
}

/**
 * All reasonable readings of a title.
 *
 * A dash in a title is ambiguous — "Hungry Like the Wolf - 2009 Remaster"
 * carries a version, "The Staple Singers - I'll Take You There" carries the
 * artist. The reader cannot know that alone, so every reading is offered
 * and the caller picks the one that fits the reference.
 *
 * @param {string} title the raw title
 * @returns {Array<{base: string, qualifiers: string[]}>} the readings
 */
export function parseTitleVariants(title) {
  const plain = splitBrackets(removeFeatures(title));
  const withDash = splitDash(plain.base, plain.qualifiers);
  const withTrailing = splitTrailing(plain.base, plain.qualifiers);
  const withBoth = splitTrailing(withDash.base, withDash.qualifiers);
  const seen = new Set();
  const variants = [];
  for (const variant of [plain, withDash, withTrailing, withBoth]) {
    const normalized = { base: normalizeText(variant.base), qualifiers: variant.qualifiers };
    const key = `${normalized.base}|${normalized.qualifiers.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push(normalized);
  }
  return variants;
}

/**
 * Split a title into its core and its qualifiers.
 *
 * A qualifier is a version marker ("(Live)", "- 2009 Remaster"), an edition
 * marker or an unknown addition. A feature credit is *not* a qualifier —
 * "Latch [feat. Sam Smith]" is the same song as "Latch".
 *
 * @param {string} title the raw title
 * @returns {{base: string, qualifiers: string[]}} the parsed title
 */
export function parseTitle(title) {
  return parseTitleVariants(title)[0];
}

/**
 * Check whether a text is a feature credit.
 *
 * @param {string} text the text
 * @returns {boolean} whether the text names a guest artist
 */
function isFeatureCredit(text) {
  const probe = new RegExp(FEATURE_CREDIT.source, 'i');
  return probe.test(` ${text}`.trim()) || probe.test(text);
}

/**
 * Remove the version qualifiers from a title.
 *
 * "Shipwrecked (Chill Out Mix)" becomes "shipwrecked". The qualifier itself
 * is compared separately — a track that is a remix in the catalogue must not
 * be linked to the plain studio version.
 *
 * @param {string} title the raw title
 * @returns {string} the normalised title without qualifiers
 */
export function coreTitle(title) {
  return parseTitle(title).base;
}

/**
 * Collect the version qualifiers of a title.
 *
 * @param {string} title the raw title
 * @returns {string[]} the normalised qualifiers
 */
export function titleQualifiers(title) {
  return parseTitle(title).qualifiers;
}

/**
 * Collect only the qualifiers that name a different recording.
 *
 * @param {string} title the raw title
 * @returns {string[]} the normalised version qualifiers
 */
export function versionQualifiers(title) {
  return parseTitle(title).qualifiers.filter((value) => markerKind(value) === 'version');
}

/**
 * Reduce an artist credit to its main artist.
 *
 * "Farruko feat. Daddy Yankee, Jory & Nengo Flow" becomes "farruko".
 *
 * @param {string} artist the raw artist credit
 * @returns {string} the normalised main artist
 */
export function primaryArtist(artist) {
  const raw = String(artist ?? '');
  const match = raw.match(CREDIT_PATTERN);
  const head = match ? raw.slice(0, match.index) : raw;
  return normalizeText(head).trim();
}

/**
 * Levenshtein distance between two strings.
 *
 * @param {string} a the first string
 * @param {string} b the second string
 * @returns {number} the edit distance
 */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * Similarity of two strings in the range 0..1.
 *
 * The best of two measures is used: the normalised edit distance (catches
 * typos) and the Dice coefficient of the content words (catches word order
 * and extra words). Both are needed — the edit distance alone punishes a
 * missing article, the word overlap alone punishes a typo.
 *
 * @param {string} a the first string
 * @param {string} b the second string
 * @returns {number} the similarity in the range 0..1
 */
export function similarity(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left && !right) return 1;
  if (!left || !right) return 0;
  if (left === right) return 1;

  // A band that styles its name ("P!nk", "Mötley Crüe") has the same letters
  // as the plain spelling — the edit distance would punish the styling.
  const collapsed = (value) => value.replace(/ /g, '');
  const collapsedLeft = collapsed(left);
  const collapsedRight = collapsed(right);
  const letters = (value) => value.split('').sort().join('');
  if (letters(collapsedLeft) === letters(collapsedRight)) return 1;
  if (Math.abs(collapsedLeft.length - collapsedRight.length) <= 1) {
    const [shorter, longer] =
      collapsedLeft.length <= collapsedRight.length
        ? [collapsedLeft, collapsedRight]
        : [collapsedRight, collapsedLeft];
    let cursor = 0;
    for (const character of longer) {
      if (character === shorter[cursor]) cursor += 1;
    }
    if (cursor === shorter.length) return 1;
  }

  const edit = 1 - levenshtein(left, right) / Math.max(left.length, right.length);

  const leftWords = contentWords(left);
  const rightWords = contentWords(right);
  let dice = 0;
  if (leftWords.length && rightWords.length) {
    const pool = [...rightWords];
    let hits = 0;
    for (const word of leftWords) {
      const index = pool.indexOf(word);
      if (index >= 0) {
        pool.splice(index, 1);
        hits += 1;
      }
    }
    dice = (2 * hits) / (leftWords.length + rightWords.length);
  }

  return Math.max(edit, dice);
}

/**
 * Markers that carry no information about the recording.
 *
 * "[Explicit]" is a content marker, not a different version — a link to the
 * explicit track is the link to the song.
 */
const NEUTRAL_MARKERS = [
  'explicit',
  'clean',
  'dirty',
  'mono',
  'stereo',
  'hq',
  'hd',
  'digital remaster',
];

/**
 * Remove the neutral markers from a qualifier.
 *
 * @param {string} qualifier the normalised qualifier
 * @returns {string} the qualifier without the neutral markers
 */
function stripNeutralMarkers(qualifier) {
  let result = qualifier;
  for (const marker of NEUTRAL_MARKERS) {
    result = result.replace(new RegExp(`\\b${marker}\\b`, 'g'), ' ');
  }
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Collect the markers of a title — the qualifiers and the words of the core.
 *
 * @param {string} title the raw title
 * @returns {{versions: Set<string>, editions: Set<string>, unknown: Set<string>}} the markers
 */
export function titleSignature(title) {
  const versions = new Set();
  const editions = new Set();
  const unknown = new Set();
  for (const variant of parseTitleVariants(title)) {
    for (const qualifier of variant.qualifiers) {
      const kind = markerKind(qualifier);
      if (kind === 'version') versions.add(qualifier);
      else if (kind === 'edition') editions.add(qualifier);
      else unknown.add(qualifier);
    }
    for (const word of variant.base.split(' ')) {
      if (!word) continue;
      const kind = markerKind(word);
      if (kind === 'version') versions.add(word);
      else if (kind === 'edition') editions.add(word);
    }
  }
  return { versions, editions, unknown };
}

/**
 * Compare the version markers of two titles.
 *
 * The titles name the same recording when their version markers intersect
 * ("Black (Unplugged)" and "Black (Live MTV Unplugged)"). When the markers
 * do not intersect and at least one side names a version, the two titles
 * describe different recordings.
 *
 * @param {string} referenceTitle the reference title
 * @param {string} providerTitle the title of the provider track
 * @returns {{mismatch: boolean, editionOnly: boolean, unknown: boolean, shared: string[]}} the comparison
 */
export function compareVersions(referenceTitle, providerTitle) {
  const reference = titleSignature(referenceTitle);
  const provider = titleSignature(providerTitle);
  const shared = [...provider.versions].filter((value) =>
    [...reference.versions].some((other) => other.includes(value) || value.includes(other)),
  );
  const mismatch =
    (reference.versions.size > 0 || provider.versions.size > 0) && shared.length === 0;
  const editionOnly =
    !mismatch &&
    provider.editions.size > 0 &&
    [...provider.editions].every((value) =>
      [...reference.editions].some((other) => other.includes(value) || value.includes(other)),
    );
  return { mismatch, editionOnly, unknown: provider.unknown.size > 0, shared };
}

/**
 * Words that every song title shares with its neighbours — they never make
 * a title distinctive.
 */
const GENERIC_TITLE_WORDS = new Set([
  'theme',
  'song',
  'songs',
  'track',
  'tracks',
  'music',
  'version',
  'official',
  'video',
  'audio',
  'mix',
  'remix',
  'live',
  'edit',
  'single',
  'radio',
  'original',
  'feat',
  'ft',
  'hd',
  'mv',
  'lyric',
  'lyrics',
  'full',
  'extended',
  'remaster',
  'remastered',
  'anniversary',
  'deluxe',
  'edition',
  'bonus',
  'soundtrack',
  'stereo',
  'mono',
]);

export function matchTitle(referenceTitle, providerTitle) {
  const reference = parseTitle(referenceTitle);
  const classification = compareVersions(referenceTitle, providerTitle);

  // Every reading of the provider title is tried; the one that fits the
  // reference best wins. A title can be read in more than one way — "Artist
  // - Song" and "Song - Version" look the same before the reference is
  // known.
  let best = null;
  for (const candidate of parseTitleVariants(providerTitle)) {
    const score = similarity(reference.base, candidate.base);
    if (!best || score > best.score) best = { candidate, score };
  }
  const provider = best.candidate;
  const coreScore = best.score;
  const fullScore = similarity(referenceTitle, providerTitle);

  // A provider that names the song with a more detailed title
  // ("Symphony No. 5 in C Minor, Op. 67: I. Allegro con brio" for
  // "Symphony No. 5 (Fate)") still delivers the same recording. The subset
  // rule covers that case without loosening the gate for different songs.
  const referenceWords = contentWords(reference.base);
  const providerWords = contentWords(provider.base);
  const subset =
    referenceWords.length > 0 &&
    providerWords.length >= referenceWords.length &&
    referenceWords.every((word) => providerWords.includes(word));

  // The distinctive words of the catalogue title have to be in the provider
  // title. "Back to the Future Theme" and "Back To The Future: Back To The
  // Future" describe the same recording — the score alone would call it a
  // different song.
  const distinctiveWords = referenceWords.filter(
    (word) => word.length >= 4 && !GENERIC_TITLE_WORDS.has(word),
  );
  const distinctiveMatch =
    distinctiveWords.length > 0 &&
    distinctiveWords.every((word) => providerWords.includes(word));

  return {
    score: Math.max(coreScore, fullScore),
    coreScore,
    fullScore,
    subset,
    distinctiveMatch,
    ok: (coreScore >= 0.95 || subset || distinctiveMatch) && !classification.mismatch,
    qualifierMismatch: classification.mismatch || classification.editionOnly,
    versionMismatch: classification.mismatch,
    editionOnly: classification.editionOnly,
    unknownQualifier: classification.unknown,
    sharedVersions: classification.shared,
  };
}

/**
 * Compare the artist of a provider track with the reference artist.
 *
 * A track that only credits the main artist of an ensemble is accepted with
 * the ensemble threshold of 0.85 — the same tolerance the link wave used.
 *
 * @param {string} referenceArtist the reference artist
 * @param {string} providerArtist the artist of the provider track
 * @returns {{score: number, ok: boolean, mode: string}} the result
 */
export function matchArtist(referenceArtist, providerArtist) {
  const score = similarity(referenceArtist, providerArtist);
  if (score >= 0.9) return { score, ok: true, mode: 'exact' };

  // An ensemble credit is accepted when the main artist of the reference is
  // among the credited artists of the provider track (and the other way
  // round). The provider lists "Tiësto, Poppy Baskcomb" where the catalogue
  // lists "Tiësto" — that is the same song.
  const referenceMain = primaryArtist(referenceArtist);
  const providerMain = primaryArtist(providerArtist);
  const referenceWords = contentWords(normalizeText(referenceArtist));
  const providerWords = contentWords(normalizeText(providerArtist));
  const mainWords = contentWords(referenceMain);
  const providerMainWords = contentWords(providerMain);
  const subset =
    mainWords.length > 0 &&
    providerWords.length > 0 &&
    (mainWords.every((word) => providerWords.includes(word)) ||
      providerMainWords.every((word) => referenceWords.includes(word)));
  if (subset) return { score: Math.max(score, 0.85), ok: true, mode: 'ensemble' };
  return { score, ok: false, mode: 'none' };
}

/**
 * Compare the runtime of a provider track with the reference runtime.
 *
 * The tolerance is 3 seconds. The second gate of the link wave is applied
 * additionally: a track whose runtime differs by more than 3 seconds is
 * still accepted when it is the *only* candidate with this title and this
 * artist — a re-recording then explains the difference.
 *
 * `alternateDurations` holds the runtimes of all reference candidates with
 * the same title and the same artist. A provider runtime that matches one of
 * them within the tolerance is a runtime of *this* song — the reference set
 * is the evidence, not one arbitrarily chosen row.
 *
 * @param {number|null} referenceSec the reference runtime in seconds
 * @param {number|null} providerSec the runtime of the provider track in seconds
 * @param {{unique?: boolean, toleranceSec?: number, toleranceRatio?: number, alternateDurations?: number[]}} [options] the options
 * @returns {{delta: number|null, ok: boolean, mode: string}} the result
 */
export function matchDuration(referenceSec, providerSec, options = {}) {
  const toleranceSec = options.toleranceSec ?? 3;
  const toleranceRatio = options.toleranceRatio ?? 0.12;
  if (referenceSec == null || providerSec == null) {
    return { delta: null, ok: false, mode: 'no-reference' };
  }
  const alternates = options.alternateDurations ?? [];
  for (const alternate of alternates) {
    if (Math.abs(alternate - providerSec) <= toleranceSec) {
      return { delta: Math.abs(alternate - providerSec), ok: true, mode: 'matched-reference' };
    }
  }
  const delta = Math.abs(referenceSec - providerSec);
  if (delta <= toleranceSec) return { delta, ok: true, mode: 'within-tolerance' };
  const ratio = referenceSec > 0 ? delta / referenceSec : 1;
  if (options.unique && ratio <= toleranceRatio) {
    return { delta, ok: true, mode: 'unique-hit' };
  }
  return { delta, ok: false, mode: 'deviation' };
}

/**
 * Parse an ISO 8601 duration such as `PT4M12S` into seconds.
 *
 * @param {string} value the ISO duration
 * @returns {number|null} the duration in seconds
 */
export function parseIsoDuration(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Apply the complete match gate.
 *
 * @param {{title: string, artist: string, durationSec?: number|null}} reference the reference
 * @param {{title: string, artist: string, durationSec?: number|null}} provider the provider track
 * @param {{unique?: boolean, duration?: boolean}} [options] the options
 * @returns {{verdict: string, reasons: string[], title: object, artist: object, duration: object}} the result
 */
export function matchGate(reference, provider, options = {}) {
  const title = matchTitle(reference.title, provider.title);
  const artist = matchArtist(reference.artist, provider.artist);
  const duration = matchDuration(reference.durationSec ?? null, provider.durationSec ?? null, {
    unique: options.unique,
    alternateDurations: options.alternateDurations,
  });

  const reasons = [];
  let hard = false;

  if (!title.ok) {
    hard = true;
    reasons.push(
      title.coreScore < 0.95 && !title.subset
        ? `title-score ${title.coreScore.toFixed(3)} < 0.95`
        : `provider title names a different recording ("${provider.title}")`,
    );
  }
  if (!artist.ok) {
    hard = true;
    reasons.push(`artist-score ${artist.score.toFixed(3)} < 0.90`);
  }
  if (options.duration !== false && !duration.ok) {
    hard = true;
    reasons.push(
      duration.mode === 'no-reference'
        ? 'runtime not verifiable (no reference runtime)'
        : `runtime deviation ${duration.delta.toFixed(1)}s > 3s`,
    );
  }
  if (title.editionOnly) {
    reasons.push('provider uses a new edition of the recording (remaster/anniversary)');
  }
  if (title.unknownQualifier) {
    reasons.push(`provider title carries an extra qualifier ("${provider.title}")`);
  }

  const verdict = hard ? 'mismatch' : reasons.length > 0 ? 'warn' : 'ok';
  return { verdict, reasons, title, artist, duration };
}
