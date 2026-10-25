/**
 * The catalogue of the base.
 *
 * WHAT: the loader of the catalogue artefact and the views of the
 * catalogue that the shell asks for.
 *
 * WHY the shell moves bytes and never semantics: the catalogue is the
 * answer key of the game. The shell fetches the compressed artefact,
 * verifies it against the manifest and hands the bytes to the base. The
 * base inflates the artefact, parses it and draws the songs from it. The
 * shell therefore never holds a title, an artist or a lyric line of the
 * game (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
 *
 * WHY the artefact is compressed: as a bundled import the catalogue ends up
 * in the JavaScript chunk of every page that uses it, and every round
 * becomes solvable offline
 * (docs/design/PLATFORM-ARCHITECTURE.md § 9.2).
 *
 * WHY the manifest is verified: a mismatch is a named failure, not a
 * silently degraded catalogue (docs/design/PLATFORM-ARCHITECTURE.md § 9.2,
 * rule 4).
 *
 * EXAMPLE: `catalogueRecords()` returns the records of the songs — for the
 * administrative surfaces, never for a component of the game.
 */
'use client';

import type { PhomuSong } from '@/types/song';
import {
  phomu_catalog_open,
  phomu_catalog_packs,
  phomu_catalog_records,
  phomu_catalog_year_scale,
} from './generated/phomu_wasm.js';
import { callBridge, loadCore, parseBridge } from './phomu-core';
import { toSong, type CatalogueRecord } from './catalogue-records';

/**
 * Opens the catalogue of the base.
 *
 * WHY the bytes are compressed: the catalogue is the answer key of the
 * game. Only the base reads it — the shell never holds a title, an artist
 * or a lyric line (docs/qa/QA-02-SPOILER-FREENESS.md, QA-SPO-001).
 *
 * @param compressed - The compressed catalogue artefact.
 * @returns The handle of the catalogue.
 */
export function openCatalogueInBase(compressed: Uint8Array): bigint {
  return callBridge(() => phomu_catalog_open(compressed));
}

/**
 * The packs of the catalogue, as the lobby and the review surface need them.
 *
 * @param handle - The handle of the catalogue.
 * @returns The identifiers of the packs of the catalogue.
 */
export function cataloguePacksOfBase(handle: bigint): string[] {
  return callBridge(() =>
    parseBridge<{ id: string }[]>(phomu_catalog_packs(handle)).map((pack) => pack.id)
  );
}

/**
 * The records of the catalogue, as the administrative surfaces need them.
 *
 * WHY the records leave the base: the administrative surfaces edit the hints
 * and the lyric lines of the songs. They are the only surfaces that may see
 * the answers, and they ask for them explicitly.
 *
 * @param handle - The handle of the catalogue.
 * @returns The records of every song of the catalogue.
 */
export function catalogueRecordsOfBase(handle: bigint): CatalogueRecord[] {
  return callBridge(() =>
    parseBridge<CatalogueRecord[]>(phomu_catalog_records(handle))
  );
}

/**
 * The years of the catalogue — the scale of the Timeline mode.
 *
 * WHY the scale is not a solution: it is the same for every round of a
 * catalogue.
 */
export function catalogueYearScaleOfBase(handle: bigint): number[] {
  return callBridge(() => parseBridge<number[]>(phomu_catalog_year_scale(handle)));
}

/**
 * The manifest of the catalogue artefact.
 *
 * WHY the manifest travels next to the artefact: it names the content of
 * the artefact, so that the shell can tell a truncated or a stale file from
 * a complete one.
 */
export interface CatalogueManifest {
  /** The version of the schema of the manifest. */
  schemaVersion: number;
  /** The number of songs in the artefact. */
  songs: number;
  /** The number of the real lyric lines in the artefact. */
  realLyricLines: number;
  /** The number of the invented lyric lines in the artefact. */
  fakeLyricLines: number;
  /** The number of bytes of the compressed artefact. */
  bytes: number;
  /** The SHA-256 of the compressed artefact, in lower-case hex. */
  sha256: string;
}

/** The base path of the deployment. */
function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? '';
}

/** The handle of the catalogue in the base — the catalogue is opened once. */
let handle: bigint | null = null;

/**
 * Fetches a file of the static export.
 *
 * @param name - The name of the file below `data/`.
 * @returns The bytes of the file.
 */
async function fetchBytes(name: string): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(`${basePath()}/data/${name}`);
  if (!response.ok) {
    throw new Error(`the catalogue ${name} could not be loaded (${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * The SHA-256 of bytes, in lower-case hex.
 *
 * WHY the browser API and not a library: the shell has no runtime
 * dependency for a digest it computes once per session.
 *
 * @param bytes - The bytes to hash.
 * @returns The digest, or `null` when the browser has no SubtleCrypto.
 */
async function digestOf(bytes: Uint8Array<ArrayBuffer>): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return null;
  }
  const digest = await subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies the artefact against the manifest.
 *
 * WHY the check is not fatal without SubtleCrypto: the browser without
 * SubtleCrypto is a browser in an insecure context. The base still parses
 * the artefact and names a failure when it cannot.
 *
 * @param bytes - The bytes of the compressed artefact.
 * @param manifest - The manifest of the artefact.
 */
async function verify(
  bytes: Uint8Array<ArrayBuffer>,
  manifest: CatalogueManifest
): Promise<void> {
  const digest = await digestOf(bytes);
  if (digest === null) {
    console.warn(
      'the catalogue could not be verified: this browser has no SubtleCrypto'
    );
    return;
  }
  if (digest !== manifest.sha256.toLowerCase()) {
    throw new Error(
      `the catalogue does not match its manifest (${digest} != ${manifest.sha256})`
    );
  }
}

/**
 * Opens the catalogue of the base.
 *
 * WHY the catalogue is opened once: the base holds the songs of the
 * catalogue, and every session draws from that one copy.
 *
 * @returns The handle of the catalogue.
 */
export async function openCatalogue(): Promise<bigint> {
  if (handle !== null) {
    return handle;
  }
  await loadCore();
  const [bytes, manifest] = await Promise.all([
    fetchBytes('catalogue.json.gz'),
    fetchBytes('catalogue.manifest.json').then((raw) =>
      JSON.parse(new TextDecoder().decode(raw)) as CatalogueManifest
    ),
  ]);
  await verify(bytes, manifest);
  handle = openCatalogueInBase(bytes);
  // The bytes are the answer key in compressed form. The base has copied
  // them; the shell does not keep them.
  bytes.fill(0);
  return handle;
}

/**
 * The records of the catalogue, as the administrative surfaces need them.
 *
 * WHY the records are a separate view: the administrative surfaces edit the
 * hints and the lyric lines of the songs. They are the only surfaces that
 * may see the answers — and they ask for them explicitly, never as part of a
 * question.
 *
 * @returns The records of every song of the catalogue.
 */
export async function catalogueSongs(): Promise<PhomuSong[]> {
  const catalogue = await openCatalogue();
  return catalogueRecordsOfBase(catalogue).map((record: CatalogueRecord) =>
    toSong(record)
  );
}

/**
 * The names of the packs of the catalogue.
 *
 * @returns The names of the packs.
 */
export async function cataloguePacks(): Promise<string[]> {
  const catalogue = await openCatalogue();
  return cataloguePacksOfBase(catalogue);
}
