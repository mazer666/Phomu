/**
 * Canonical cover file naming (QA-SPO-002 / QA-09 backlog item 1.3)
 * -------------------------------------------------------------------------
 * WHY THIS EXISTS
 *   The deployed artifact is public. A cover file name that contains the
 *   artist or the title — `2000s-britney-toxic.jpg` — is the answer to every
 *   question of the catalogue, readable in a directory listing, in the
 *   browser history, in the access log of the host and in a search engine
 *   index. The name is therefore opaque:
 *
 *       coverFileName('2000s-britney-toxic')  ->  '8f3a1c9e2b.jpg'
 *
 * THE RULE
 *   The name is derived from the **song id**, never from the old file name:
 *
 *       sha256(songId)  ->  hex  ->  first 12 characters  ->  '<hash>.jpg'
 *
 *   12 hex characters are 48 bit — with 1,615 songs the collision probability
 *   is below 10^-10, and `scripts/rename-covers.mjs` verifies it anyway.
 *
 *   The mapping is deterministic: the same song id always produces the same
 *   file name, on every machine and in every run. That is what makes the
 *   migration repeatable — the script can be run again at any time and will
 *   find the files it expects.
 *
 * THE ONE EXCEPTION
 *   The print sheet for the physical QR cards may name the artist — there the
 *   name is wanted. The print sheet is a document, not a deployed file; it is
 *   not affected by this module.
 */

import { createHash } from 'node:crypto';

/** Number of hex characters of the hash that end up in the file name. */
export const COVER_NAME_LENGTH = 12;

/** Human-readable description of the naming rule (written into the map). */
export const COVER_NAME_RULE = 'sha256(songId) hex, first 12 characters, plus ".jpg"';

/**
 * The opaque hash of a song id.
 *
 * @param {string} songId - The stable id of the song.
 * @returns {string} 12 hex characters.
 */
export function coverHash(songId) {
  return createHash('sha256')
    .update(songId, 'utf8')
    .digest('hex')
    .slice(0, COVER_NAME_LENGTH);
}

/**
 * The opaque file name of the cover of a song.
 *
 * @param {string} songId - The stable id of the song.
 * @returns {string} The file name, e.g. `8f3a1c9e2b.jpg`.
 */
export function coverFileName(songId) {
  return `${coverHash(songId)}.jpg`;
}

/**
 * The public path of the cover of a song.
 *
 * @param {string} songId - The stable id of the song.
 * @returns {string} e.g. `/covers/8f3a1c9e2b.jpg`.
 */
export function coverUrl(songId) {
  return `/covers/${coverFileName(songId)}`;
}
