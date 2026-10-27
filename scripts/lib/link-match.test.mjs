#!/usr/bin/env node
/**
 * The self-test of the link match gate.
 * -------------------------------------------------------------------------
 * WHAT IT DOES
 *   Every tolerance of `scripts/lib/link-match.mjs` is asserted here with
 *   an example of the catalogue — the catalogue entry, the provider track
 *   and the expected verdict. A rule without an example is a rule that is
 *   not allowed to exist.
 *
 * WHY
 *   The first run of the link verification reported 71 songs with a
 *   mismatch; most of them were false alarms of a matcher that was too
 *   strict. A matcher is only allowed to be relaxed when the relaxation is
 *   proven against the catalogue — that is what this file is.
 *
 * EXIT CODE
 *   0 when every assertion holds, 1 otherwise.
 *
 * EXAMPLE
 *   node scripts/lib/link-match.test.mjs
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  matchGate,
  matchTitle,
  matchArtist,
  normalizeText,
  artistMembers,
} from './link-match.mjs';

/**
 * The gate without a runtime: the title and the artist decide.
 *
 * @param {object} reference the catalogue entry
 * @param {object} provider the provider track
 * @returns {string} the verdict
 */
function gate(reference, provider) {
  return matchGate(reference, provider, { duration: false }).verdict;
}

/**
 * The gate with a runtime.
 *
 * @param {object} reference the catalogue entry
 * @param {object} provider the provider track
 * @param {object} [options] the options
 * @returns {object} the result
 */
function fullGate(reference, provider, options = {}) {
  return matchGate(reference, provider, options);
}

test('rule 1 — a feature credit in brackets does not change the song', () => {
  // Catalogue: yt-Uq9gPaIzbe8 — "Unholy" / "Sam Smith & Kim Petras".
  const result = gate(
    { title: 'Unholy', artist: 'Sam Smith & Kim Petras' },
    { title: 'Unholy (feat. Kim Petras)', artist: 'Sam Smith, Kim Petras' },
  );
  assert.equal(result, 'ok');

  // Catalogue: yt-c-03LZrmMvA — "Side To Side ft. Nicki Minaj".
  assert.equal(
    gate(
      { title: 'Side To Side ft. Nicki Minaj', artist: 'Ariana Grande' },
      { title: 'Side To Side', artist: 'Ariana Grande, Nicki Minaj' },
    ),
    'ok',
  );

  // Catalogue: yt-MNmc_XJp5rI — "Passion Whine ft. Sean Paul".
  assert.equal(
    gate(
      { title: 'Passion Whine ft. Sean Paul', artist: 'Farruko' },
      { title: 'Passion Whine', artist: 'Farruko, Sean Paul' },
    ),
    'ok',
  );

  // Catalogue: yt-DkFJE8ZdeG8 — "Latinoamérica" with three guest artists.
  assert.equal(
    gate(
      { title: 'Latinoamérica', artist: 'Calle 13' },
      {
        title: 'Latinoamérica (feat. Totó la Momposina, Susana Baca & Maria Rita)',
        artist: 'Calle 13',
      },
    ),
    'ok',
  );
});

test('rule 1 — "with" in a title is a title, not a credit', () => {
  // Catalogue: metal-disturbed-sickness, unplugged-hootie-only-wanna,
  // sam-smith-stay-with-me-2014, 80s-whitney-dance,
  // indie-white-stripes-fell-in-love, 8s-tina-turner-whats-love-got-to-do-with-it.
  for (const title of [
    'Down with the Sickness',
    'Only Wanna Be with You',
    'Stay with Me',
    'I Wanna Dance with Somebody',
    'Fell in Love with a Girl',
    "What's Love Got to Do with It",
    'She Blinded Me With Science',
  ]) {
    const result = matchTitle(title, title);
    assert.equal(result.sameWork, true, title);
    assert.equal(result.coreScore, 1, title);
  }
});

test('rule 2 — a new edition of the recording is not a wrong link', () => {
  // Catalogue: 80s-cccatch-canlose, rock-deep-purple-smoke-on-the-water,
  // yt-H0KNa9y0nS0 — the provider carries a remaster, the recording is the
  // same one.
  for (const [reference, provider] of [
    [
      'I Can Lose My Heart Tonight',
      'I Can Lose My Heart Tonight (Remastered)',
    ],
    ['Smoke on the Water', 'Smoke on the Water (Remastered 2009)'],
    ['Tour de France', 'Tour de France (Remastered 2014)'],
    ['Cars (Remastered)', 'Cars (Remastered)'],
  ]) {
    const result = matchTitle(reference, provider);
    assert.equal(result.sameWork, true, reference);
    assert.equal(result.versionConflict, false, reference);
  }
});

test('rule 2 — an explicit marker is not a different recording', () => {
  // Catalogue: hiphop-warreng-regulate — "[Explicit]" on the provider.
  const result = matchTitle(
    'Regulate',
    'Regulate [feat. Nate Dogg] [Explicit]',
  );
  assert.equal(result.sameWork, true);
  assert.equal(result.coreScore, 1);
});

test('rule 2 — a catalogue version against another version stays an error', () => {
  // Catalogue: unplugged-aic-nutshell — "Nutshell (Unplugged)" against the
  // live take of the same session.
  const result = matchTitle(
    'Nutshell (Unplugged)',
    'Nutshell - Live at the Majestic Theatre, Brooklyn, NY - April 1996',
  );
  assert.equal(result.versionConflict, true);
  assert.equal(result.sameWork, true);

  // Catalogue: unplugged-pearl-jam-black — "Black (Unplugged)" against
  // "Black (Live MTV Unplugged)" — the same version, named differently.
  const same = matchTitle('Black (Unplugged)', 'Black (Live MTV Unplugged)');
  assert.equal(same.versionConflict, false);
  assert.equal(same.sameWork, true);
});

test('rule 3 — spelling variants name the same recording', () => {
  // Catalogue: schlager-nicole-frieden — "Ein bißchen Frieden" against
  // "Ein bisschen Frieden".
  assert.equal(normalizeText('Ein bißchen Frieden'), 'ein bisschen frieden');
  assert.equal(
    matchTitle('Ein bißchen Frieden', 'Ein bisschen Frieden').coreScore,
    1,
  );

  // Catalogue: disney-snowwhite-someday — "Someday My Prince Will Come"
  // against "Some Day My Prince Will Come".
  assert.equal(
    matchTitle(
      'Someday My Prince Will Come',
      'Some Day My Prince Will Come',
    ).coreScore,
    1,
  );

  // Catalogue: yt-jenWdylTtzs — the apostrophe of "It's a Sin".
  assert.equal(
    matchTitle("It's a Sin", 'It’s a Sin').coreScore,
    1,
  );
});

test('rule 4 — an ensemble credit is a set, not an order', () => {
  // Catalogue: disney-we-dont-talk-about-bruno — six artists.
  const reference =
    'Adassa, Stephanie Beatriz, Mauro Castillo, Rhenzy Feliz, Carolina Gaitán, Diane Guerrero';
  const provider =
    'Diane Guerrero, Carolina Gaitán, Rhenzy Feliz, Mauro Castillo, Stephanie Beatriz & Adassa';
  assert.equal(
    gate({ title: 'We Don’t Talk About Bruno', artist: reference }, {
      title: 'We Don’t Talk About Bruno',
      artist: provider,
    }),
    'ok',
  );

  // Catalogue: reggae-bob-marley-no-woman — the provider names the main
  // artist only.
  assert.equal(
    gate(
      { title: 'No Woman, No Cry', artist: 'Bob Marley & The Wailers' },
      { title: 'No Woman No Cry', artist: 'Bob Marley' },
    ),
    'ok',
  );

  // Catalogue: class-beethoven-5 — the provider adds the orchestra.
  assert.equal(
    gate(
      { title: 'Symphony No. 5 (Fate)', artist: 'Ludwig van Beethoven' },
      {
        title: 'Symphony No. 5 in C Minor, Op. 67: I. Allegro con brio',
        artist: 'Ludwig van Beethoven, Berlin Philharmonic, Herbert von Karajan',
      },
    ),
    'ok',
  );

  // The members are read as a set.
  assert.deepEqual(
    artistMembers('A, B & C').sort(),
    artistMembers('C, B und A').sort(),
  );
});

test('rule 4 — a different performer stays an error', () => {
  // Catalogue: yt-uTK_7MOFV4s — "Paco El Marinero" against "El Reino Infantil".
  const result = gate(
    { title: 'El Marinero Baila', artist: 'Paco El Marinero' },
    { title: 'El Marinero Baila (Single)', artist: 'El Reino Infantil' },
  );
  assert.equal(result, 'mismatch');
});

test('rule 5 — a prefix of the catalogue title is the same work', () => {
  // Catalogue: score-silvestri-bttf — "Back to the Future Theme" against
  // the soundtrack title.
  const result = matchTitle(
    'Back to the Future Theme',
    'Back To The Future: Back To The Future - From "Back To The Future"',
  );
  assert.equal(result.sameWork, true);
});

test('rule 5 — another work stays an error', () => {
  // Catalogue: yt-Qfp0msG77bA — "Ocean Drive Boulevard (Original Mix)"
  // against "Forgiveness (Original Mix)".
  const result = gate(
    { title: 'Ocean Drive Boulevard (Original Mix)', artist: 'Eddie Thoneick' },
    {
      title: 'Forgiveness (Original Mix)',
      artist: 'Eddie Thoneick feat. Berget Lewis',
    },
  );
  assert.equal(result, 'mismatch');
});

test('the runtime of a new master is accepted', () => {
  // Catalogue: unplugged-aic-nutshell — the reference is 272.4 s, the
  // Amazon track carries the same recording in 268 s.
  const result = fullGate(
    {
      title: 'Nutshell (Unplugged)',
      artist: 'Alice in Chains',
      durationSec: 272.36,
    },
    {
      title: 'Nutshell (Unplugged)',
      artist: 'Alice In Chains',
      durationSec: 268,
    },
    { unique: true },
  );
  assert.equal(result.verdict, 'ok');
  assert.equal(result.duration.mode, 'new-master');
});

test('a runtime that is far off is a different recording', () => {
  // Catalogue: reggae-bob-marley-no-woman — the studio cut against the
  // live album track.
  const result = fullGate(
    {
      title: 'No Woman, No Cry',
      artist: 'Bob Marley & The Wailers',
      durationSec: 226.06,
    },
    {
      title: 'No Woman, No Cry - Live At The Lyceum, London/1975',
      artist: 'Bob Marley & The Wailers',
      durationSec: 428.36,
    },
    { unique: true },
  );
  assert.equal(result.verdict, 'mismatch');
});

test('a small runtime deviation is uncertain, not a wrong link', () => {
  // Catalogue: yt-bcnWysA9gxo — "Euphoria": the provider delivers the
  // single, the reference is the album cut.
  const result = fullGate(
    { title: 'Euphoria', artist: 'Loreen', durationSec: 211.93 },
    {
      title: 'Euphoria - Single Version',
      artist: 'Loreen',
      durationSec: 181.79,
    },
    { unique: true },
  );
  assert.equal(result.verdict, 'uncertain');
});

test('another designation of the same recording is uncertain', () => {
  // Catalogue: yt-T7bKgTeqGSM — "Detalles" against "Detalles (Detalhes)".
  const alias = gate(
    { title: 'Detalles', artist: 'Roberto Carlos' },
    { title: 'Detalles (Detalhes)', artist: 'Roberto Carlos' },
  );
  assert.equal(alias, 'uncertain');

  // Catalogue: jazz-monk-round — "'Round Midnight" against "Take 2".
  const take = gate(
    { title: "'Round Midnight", artist: 'Thelonious Monk' },
    { title: "'Round Midnight (Take 2)", artist: 'Thelonious Monk' },
  );
  assert.equal(take, 'uncertain');
});

test('another take of the recording is uncertain', () => {
  // Catalogue: yt-wPA9a2KOZBI — "Vamo Que Vamo" against the live take.
  const result = gate(
    { title: 'Vamo Que Vamo', artist: 'Thiaguinho' },
    { title: 'Vamo Que Vamo - Ao Vivo', artist: 'Thiaguinho' },
  );
  assert.equal(result, 'uncertain');
});

test('the artist comparison knows the ensemble', () => {
  assert.equal(matchArtist('Bob Marley & The Wailers', 'Bob Marley').ok, true);
  assert.equal(
    matchArtist('Paco El Marinero', 'El Reino Infantil').ok,
    false,
  );
});
