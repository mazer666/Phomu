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
 *   The verdict is one of three, and the difference matters:
 *     - `ok`        the link names the same recording
 *     - `uncertain` the provider names the same work in another
 *                   designation (an alias, a live take, another master);
 *                   the matcher cannot decide, the link stays and is
 *                   documented
 *     - `mismatch`  the link names a *different* song — it has to be
 *                   replaced or emptied
 *
 *   Every tolerance below is backed by an example of the catalogue; the
 *   examples are named in the comment of the rule and are asserted by
 *   `scripts/lib/link-match.test.mjs`.
 *
 * EXAMPLE
 *   import { matchGate } from './lib/link-match.mjs';
 *
 *   matchGate(
 *     { title: 'Can I Kick It?', artist: 'A Tribe Called Quest', durationSec: 251.79 },
 *     { title: 'Can I Kick It?', artist: 'A Tribe Called Quest', durationSec: 252 },
 *   );
 *   // => { verdict: 'ok', reasons: [], title, artist, duration }
 */

/**
 * Version markers that describe a *different recording* of the same song.
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
  'single version',
  'radio edit',
  'radio version',
  'edit',
  'remaster',
  'remastered',
  'remasterization',
  'digital remaster',
  'deluxe',
  'expanded',
  'anniversary',
  'anniversary edition',
  'edition',
  'version',
  'bonus',
];

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
];

/**
 * Words that never carry meaning for the comparison.
 */
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and']);

/**
 * Feature credits — they belong to the artist, not to the title.
 *
 * "Side To Side ft. Nicki Minaj" and "Unholy (feat. Kim Petras)" are the
 * song of the catalogue entry, the credit is only an addition of the
 * provider.
 *
 * `with` is only a credit *inside brackets*. "Down with the Sickness",
 * "Stay with Me" and "I Wanna Dance with Somebody" are song titles — a
 * trailing "with <something>" would swallow the whole title.
 */
const FEATURE_SUFFIX = /\s*[,;]?\s*\b(?:ft|feat|featuring)\b\.?\s+[^()]+$/i;
const FEATURE_BRACKET = /^\s*(?:ft|feat|featuring|with)\b\.?\s+/i;

/**
 * Credit clauses that follow the main artist.
 */
const CREDIT_PATTERN =
  /\s*(?:,|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+with\s+|\s+x\s+|\s+&\s+|\s+and\s+|\s+vs\.?\s+).*$/i;

/**
 * Normalise a string for the comparison.
 *
 * Lower case, without diacritics, without punctuation, with `&` and `+`
 * mapped to `and`. Everything that only carries spelling differences is
 * removed here so that the similarity below compares *content*.
 *
 * Two spelling folds are proven by the catalogue:
 *   - "ß" becomes "ss" — the catalogue entry "Ein bißchen Frieden"
 *     (schlager-nicole-frieden) is the same recording as "Ein bisschen
 *     Frieden" on the providers.
 *   - "some day" becomes "someday" — the catalogue entry "Someday My
 *     Prince Will Come" (disney-snowwhite-someday) is the same recording as
 *     "Some Day My Prince Will Come".
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
    .replace(/ß/g, 'ss')
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bsome day\b/g, 'someday');
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
 * Check whether a text contains a version or an edition marker.
 *
 * "Original Mix" is not a different recording — it is the plain recording
 * under its full name (the catalogue entry "Aeon Of Revenge (Original Mix)"
 * is served by the track "Aeon Of Revenge").
 *
 * @param {string} text the normalised text
 * @returns {'version'|'edition'|null} the kind of marker
 */
function markerKind(text) {
  const value = normalizeText(text);
  if (!value) return null;
  if (/^original\s/.test(value)) return 'edition';
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
  return String(title ?? '').replace(FEATURE_SUFFIX, ' ');
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
    const normalized = {
      base: normalizeText(variant.base),
      qualifiers: variant.qualifiers,
    };
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
  return FEATURE_BRACKET.test(String(text ?? '').trim());
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
  return parseTitle(title).qualifiers.filter(
    (value) => markerKind(value) === 'version',
  );
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
 * Split an artist credit into its members.
 *
 * "A, B & C" and "C, B und A" describe the same ensemble — the order may
 * differ, the *set* of the interpreters may not. The catalogue carries 187
 * such credits, among them "Adassa, Stephanie Beatriz, Mauro Castillo,
 * Rhenzy Feliz, Carolina Gaitán, Diane Guerrero" (We Don't Talk About Bruno).
 *
 * @param {string} artist the raw artist credit
 * @returns {string[]} the normalised members
 */
export function artistMembers(artist) {
  return String(artist ?? '')
    .split(
      /\s*(?:,|&|\band\b|\bund\b|\bfeat\.?\b|\bft\.?\b|\bfeaturing\b|\bwith\b|\bx\b|\bvs\.?\b|\+)\s*/i,
    )
    .map((part) => normalizeText(part))
    .filter((part) => part.length > 0);
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
    [...reference.versions].some(
      (other) => other.includes(value) || value.includes(other),
    ),
  );
  const mismatch =
    (reference.versions.size > 0 || provider.versions.size > 0) &&
    shared.length === 0;
  const editionOnly =
    !mismatch &&
    provider.editions.size > 0 &&
    [...provider.editions].every((value) =>
      [...reference.editions].some(
        (other) => other.includes(value) || value.includes(other),
      ),
    );
  return {
    mismatch,
    editionOnly,
    unknown: provider.unknown.size > 0,
    shared,
    referenceVersions: [...reference.versions],
    providerVersions: [...provider.versions],
  };
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
  'from',
  'with',
  'take',
  'part',
  'volume',
  'vol',
]);

/**
 * Words that turn a qualifier into the context of the recording — the film
 * or the album it belongs to. "Night Fever (From "Saturday Night Fever"
 * Soundtrack)" is the song of the catalogue entry, not another designation.
 */
const CONTEXT_WORDS = new Set([
  'from',
  'soundtrack',
  'motion',
  'picture',
  'album',
  'movie',
  'film',
  'motionpicture',
  'originalsoundtrack',
]);

/**
 * Remove an artist prefix from a catalogue title.
 *
 * "ANOHNI: MARROW" (the catalogue entry yt-Rb9XECErMlc) carries the artist
 * in front of the title — the provider names the song "Marrow". The prefix
 * is only removed when it names the artist of the entry, so that
 * "Mission: Impossible Theme" (the prefix is part of the title) and "10:35"
 * (the prefix is a time) stay untouched.
 *
 * @param {string} title the raw title
 * @param {string} artist the artist of the catalogue entry
 * @returns {string} the title without the artist prefix
 */
export function stripArtistPrefix(title, artist) {
  const raw = String(title ?? '');
  const artistNormalized = normalizeText(artist);
  if (!artistNormalized) return raw;
  const parts = raw.split(/\s*:\s*/);
  if (parts.length < 2) return raw;
  const prefix = normalizeText(parts[0]);
  if (!prefix || prefix === artistNormalized) return raw;
  if (!artistNormalized.includes(prefix)) return raw;
  return parts.slice(1).join(': ');
}

/**
 * Compare the title of a provider track with the title of the catalogue
 * entry.
 *
 * @param {string} referenceTitle the title of the catalogue entry
 * @param {string} providerTitle the title of the provider track
 * @param {string} [referenceArtist] the artist of the catalogue entry
 * @returns {object} the comparison
 */
export function matchTitle(referenceTitle, providerTitle, referenceArtist = '') {
  const effectiveReference = stripArtistPrefix(referenceTitle, referenceArtist);
  const reference = parseTitle(effectiveReference);
  const classification = compareVersions(effectiveReference, providerTitle);

  // Every reading of the provider title is tried; the one that fits the
  // reference best wins. A title can be read in more than one way — "Artist
  // - Song" and "Song - Version" look the same before the reference is
  // known.
  let best = null;
  for (const candidate of parseTitleVariants(providerTitle)) {
    const score = similarity(reference.base, candidate.base);
    if (!best || score > best.score) {
      best = { candidate, score };
    }
  }
  const provider = best.candidate;
  const coreScore = best.score;
  const fullScore = similarity(effectiveReference, providerTitle);

  const referenceWords = contentWords(reference.base);
  const providerWords = contentWords(provider.base);

  // The distinctive words of the catalogue title have to be in the provider
  // title. "Symphony No. 5 (Fate)" and "Symphony No. 5 in C Minor, Op. 67:
  // I. Allegro con brio" describe the same work — the score alone would
  // call it a different song.
  const distinctiveWords = referenceWords.filter(
    (word) => word.length >= 4 && !GENERIC_TITLE_WORDS.has(word),
  );
  const distinctiveMatch =
    distinctiveWords.length > 0 &&
    distinctiveWords.every((word) => providerWords.includes(word));

  // The provider may name the song with more words than the catalogue
  // ("Carmina Burana" / "Carmina Burana: O Fortuna Vivere"). That is only
  // allowed when the additional words carry no meaning of their own.
  const extraWords = providerWords.filter(
    (word) => !referenceWords.includes(word),
  );
  const superset =
    referenceWords.length > 0 &&
    providerWords.length > referenceWords.length &&
    referenceWords.every((word) => providerWords.includes(word)) &&
    extraWords.every((word) => GENERIC_TITLE_WORDS.has(word));

  // A qualifier of one side may carry the title of the other side: the
  // catalogue entry "Psycho (The Murder)" is served by the track "The
  // Murder" (the catalogue entry score-herrmann-psycho), and the entry
  // "Aquecimento das Maravilhas" is served by "Quadradinho de Oito
  // (Aquecimento das Maravilhas)" (yt-7raxxqP6DSU).
  const referenceSignature = titleSignature(effectiveReference);
  const providerSignature = titleSignature(providerTitle);
  const bridge =
    (referenceWords.length > 0 &&
      [...providerSignature.unknown].some((qualifier) =>
        contentWords(qualifier).every((word) => referenceWords.includes(word)),
      )) ||
    (providerWords.length > 0 &&
      [...referenceSignature.unknown].some((qualifier) =>
        contentWords(qualifier).every((word) => providerWords.includes(word)),
      ));

  // A qualifier of the provider that the catalogue does not know is an
  // alias — another designation of the same recording. A qualifier that
  // only repeats the words of the catalogue title ("From \"Back To The
  // Future\"") is not an alias.
  const knownWords = new Set([
    ...referenceWords,
    ...[...referenceSignature.unknown, ...referenceSignature.versions, ...referenceSignature.editions]
      .flatMap((qualifier) => contentWords(qualifier)),
  ]);
  const aliasQualifiers = [...providerSignature.unknown].filter((value) => {
    // "[Explicit]" and "[Mono]" are content markers, not another
    // designation of the recording.
    const meaningful = stripNeutralMarkers(value);
    if (!meaningful) return false;
    // The context of the recording (the film, the album) does not change
    // the recording itself.
    const words = contentWords(meaningful);
    if (words.every((word) => CONTEXT_WORDS.has(word))) return false;
    return words.some((word) => !knownWords.has(word));
  });

  const sameWork =
    coreScore >= 0.95 || distinctiveMatch || superset || bridge;

  // The catalogue names a version ("Nutshell (Unplugged)") and the provider
  // names another one ("Nutshell - Live at the Majestic Theatre") — that is
  // a different recording of the same work. The provider names the same
  // version in another wording ("Serenity - Andrew Rayel Aether Radio Edit"
  // against "Serenity (Andrew Rayel Aether Remix)") — that is another
  // edition of the same recording, not another recording.
  const versionConflict =
    classification.referenceVersions.length > 0 && classification.mismatch;
  const qualifierOverlap =
    versionConflict &&
    [...classification.referenceVersions].some((referenceVersion) =>
      [...classification.providerVersions].some((providerVersion) =>
        contentWords(providerVersion).some((word) =>
          contentWords(referenceVersion).includes(word),
        ),
      ),
    );
  // The provider adds a version that the catalogue does not name ("Vamo Que
  // Vamo - Ao Vivo") — the same work in another take.
  const versionAdded =
    classification.referenceVersions.length === 0 &&
    classification.providerVersions.length > 0;

  let reason = null;
  if (!sameWork) {
    reason = `the provider names a different work ("${providerTitle}")`;
  }

  return {
    score: Math.max(coreScore, fullScore),
    coreScore,
    fullScore,
    superset,
    distinctiveMatch,
    bridge,
    sameWork,
    ok: sameWork && !versionConflict,
    qualifierMismatch: classification.mismatch || classification.editionOnly,
    versionMismatch: classification.mismatch,
    versionConflict,
    versionAdded,
    qualifierOverlap,
    editionOnly: classification.editionOnly,
    unknownQualifier: aliasQualifiers.length > 0,
    aliasQualifiers,
    providerQualifiers: provider.qualifiers,
    referenceQualifiers: [...referenceSignature.unknown],
    sharedVersions: classification.shared,
    reason,
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

  // An ensemble credit is accepted when the *set* of the credited artists
  // agrees: the provider may name fewer artists ("Bob Marley" for "Bob
  // Marley & The Wailers") or more ("Ludwig van Beethoven, Berlin
  // Philharmonic, Herbert von Karajan"), and it may order them differently
  // ("A, B & C" against "C, B und A"). The set may not differ in both
  // directions — then it is a different performer.
  const referenceMembers = artistMembers(referenceArtist);
  const providerMembers = artistMembers(providerArtist);
  const referenceSet = new Set(referenceMembers);
  const providerSet = new Set(providerMembers);
  const providerIsSubset =
    providerMembers.length > 0 &&
    [...providerSet].every((member) => referenceSet.has(member));
  const referenceIsSubset =
    referenceMembers.length > 0 &&
    [...referenceSet].every((member) => providerSet.has(member));
  if (providerIsSubset || referenceIsSubset) {
    return { score: Math.max(score, 0.85), ok: true, mode: 'ensemble' };
  }

  // The last resort: the words of the main artist are contained in the
  // other credit ("Farrokh Bulsara" against "Farrokh Bulsara & Friends").
  const referenceMain = primaryArtist(referenceArtist);
  const providerMain = primaryArtist(providerArtist);
  const mainWords = contentWords(referenceMain);
  const providerMainWords = contentWords(providerMain);
  if (
    mainWords.length > 0 &&
    providerMainWords.length > 0 &&
    (mainWords.every((word) => providerWordsContain(providerArtist, word)) ||
      providerMainWords.every((word) => referenceWordsContain(referenceArtist, word)))
  ) {
    return { score: Math.max(score, 0.85), ok: true, mode: 'ensemble' };
  }
  return { score, ok: false, mode: 'none' };
}

/**
 * Check whether a credit contains a word.
 *
 * @param {string} credit the artist credit
 * @param {string} word the word
 * @returns {boolean} whether the credit contains the word
 */
function providerWordsContain(credit, word) {
  return contentWords(normalizeText(credit)).includes(word);
}

/**
 * Check whether a credit contains a word.
 *
 * @param {string} credit the artist credit
 * @param {string} word the word
 * @returns {boolean} whether the credit contains the word
 */
function referenceWordsContain(credit, word) {
  return contentWords(normalizeText(credit)).includes(word);
}

/**
 * Compare the runtime of a provider track with the reference runtime.
 *
 * The tolerance is 3 seconds. A *new master* of the same recording is a
 * few seconds longer — the catalogue entry "Nutshell (Unplugged)"
 * (unplugged-aic-nutshell) is 272.4 s on the reference, the Amazon track
 * carries the same recording in 268 s. A new master is therefore accepted
 * with a tolerance of 2 % of the runtime, at most 10 s, and only when the
 * track is the unique hit of the song.
 *
 * The second gate of the link wave is applied additionally: a track whose
 * runtime differs by more than 3 seconds is still accepted when it is the
 * *only* candidate with this title and this artist — a re-recording then
 * explains the difference.
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
      return {
        delta: Math.abs(alternate - providerSec),
        ok: true,
        mode: 'matched-reference',
      };
    }
  }
  const delta = Math.abs(referenceSec - providerSec);
  if (delta <= toleranceSec) {
    return { delta, ok: true, mode: 'within-tolerance' };
  }
  const ratio = referenceSec > 0 ? delta / referenceSec : 1;
  if (options.unique) {
    // A new master of the same recording: a few seconds, at most 2 % of
    // the runtime and at most 10 s.
    const masterTolerance = Math.min(
      options.maxMasterDeltaSec ?? 10,
      Math.max(toleranceSec, referenceSec * (options.masterToleranceRatio ?? 0.02)),
    );
    if (delta <= masterTolerance) {
      return { delta, ok: true, mode: 'new-master' };
    }
    if (ratio <= toleranceRatio) {
      return { delta, ok: true, mode: 'unique-hit' };
    }
  }
  return { delta, ok: false, mode: 'deviation', ratio };
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
  const duration = matchDuration(
    reference.durationSec ?? null,
    provider.durationSec ?? null,
    {
      unique: options.unique,
      alternateDurations: options.alternateDurations,
    },
  );

  const reasons = [];
  const notes = [];
  let verdict = 'ok';

  if (!title.sameWork) {
    verdict = 'mismatch';
    reasons.push(
      title.reason ??
        `the provider names a different work ("${provider.title}")`,
    );
  } else if (!artist.ok) {
    verdict = 'mismatch';
    reasons.push(
      `the provider names a different performer ("${provider.artist}")`,
    );
  } else if (title.versionConflict && !title.qualifierOverlap) {
    // The catalogue names a version and the provider names another one:
    // that is a different recording of the same work.
    verdict = 'mismatch';
    reasons.push(
      `the provider names a different version of the recording ("${provider.title}")`,
    );
  } else if (
    options.duration !== false &&
    duration.mode === 'deviation' &&
    duration.ratio >= 0.25
  ) {
    // A quarter of the runtime more or less is not an edit of the same
    // recording — it is a different take (a live album track instead of the
    // studio cut, for example).
    verdict = 'mismatch';
    reasons.push(
      `the provider names a different recording ("${provider.title}", ${duration.delta.toFixed(1)}s instead of ${(reference.durationSec ?? 0).toFixed(1)}s)`,
    );
  } else if (options.duration !== false && !duration.ok) {
    verdict = 'uncertain';
    reasons.push(
      `the runtime deviates by ${(duration.delta ?? 0).toFixed(1)}s — the provider delivers another edition of the same recording`,
    );
  } else if (title.unknownQualifier) {
    verdict = 'uncertain';
    reasons.push(
      `the provider names the song under another designation ("${provider.title}")`,
    );
  } else if (title.versionAdded || title.qualifierOverlap) {
    verdict = 'uncertain';
    reasons.push(
      `the provider delivers another take of the recording ("${provider.title}")`,
    );
  }

  if (title.editionOnly) {
    notes.push(
      'the provider uses a new edition of the recording (remaster/anniversary)',
    );
  }
  if (title.versionAdded && verdict === 'uncertain') {
    // already reported
  }

  return { verdict, reasons, notes, title, artist, duration };
}
