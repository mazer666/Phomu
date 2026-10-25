/**
 * Conformance vector loader
 *
 * WHY: both runners read the corpus from the same place — the directory
 * `core/phomu-conformance/vectors`. The index file defines the order and
 * the file name of every case; the loader resolves them relative to the
 * index, so a runner can be started from any working directory.
 *
 * EXAMPLE: `loadVectors('/abs/path/core/phomu-conformance/vectors')`
 *          returns the vectors of the index in the order of the index.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Vector, VectorIndex } from './types';

export class VectorLoadError extends Error {
  constructor(
    message: string,
    readonly file: string
  ) {
    super(message);
    this.name = 'VectorLoadError';
  }
}

/**
 * Reads the index of the corpus.
 *
 * @param vectorsDir - the directory that holds `index.json`
 * @returns the parsed index
 */
export function loadIndex(vectorsDir: string): VectorIndex {
  const indexPath = path.join(vectorsDir, 'index.json');
  if (!fs.existsSync(indexPath)) {
    throw new VectorLoadError('index.json is missing', indexPath);
  }
  const raw = fs.readFileSync(indexPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new VectorLoadError(
      `index.json is not valid JSON: ${(error as Error).message}`,
      indexPath
    );
  }
  const index = parsed as VectorIndex;
  if (!Array.isArray(index.vectors)) {
    throw new VectorLoadError('index.json has no "vectors" array', indexPath);
  }
  return index;
}

/**
 * Reads one vector file.
 *
 * @param vectorsDir - the directory that holds `index.json`
 * @param file - the file name of the case, relative to the index
 * @returns the parsed vector
 */
export function loadVector(vectorsDir: string, file: string): Vector {
  const fullPath = path.join(vectorsDir, file);
  if (!fs.existsSync(fullPath)) {
    throw new VectorLoadError('vector file is missing', fullPath);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new VectorLoadError(
      `vector file is not valid JSON: ${(error as Error).message}`,
      fullPath
    );
  }
  const vector = parsed as Vector;
  for (const field of [
    'schemaVersion',
    'id',
    'area',
    'given',
    'when',
    'then',
  ]) {
    if ((vector as unknown as Record<string, unknown>)[field] === undefined) {
      throw new VectorLoadError(
        `vector file is missing the field "${field}"`,
        fullPath
      );
    }
  }
  return vector;
}

/**
 * Reads the whole corpus in the order of the index.
 *
 * @param vectorsDir - the directory that holds `index.json`
 * @returns the vectors of the corpus
 */
export function loadVectors(vectorsDir: string): Vector[] {
  const index = loadIndex(vectorsDir);
  return index.vectors.map((entry) => {
    const vector = loadVector(vectorsDir, entry.file);
    if (vector.id !== entry.id) {
      throw new VectorLoadError(
        `index says "${entry.id}" but the file says "${vector.id}"`,
        path.join(vectorsDir, entry.file)
      );
    }
    return vector;
  });
}

/**
 * The default location of the corpus, relative to the repository root.
 *
 * @param repoRoot - the root of the repository
 * @returns the absolute path of the vectors directory
 */
export function defaultVectorsDir(repoRoot: string): string {
  return path.join(
    repoRoot,
    'core',
    'phomu-conformance',
    'vectors',
    'web-shell'
  );
}
