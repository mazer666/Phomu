import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import {
  AdminRequestError,
  MAX_IMAGE_BYTES,
  assertAdminAccess,
  assertRateLimit,
  fetchGuardedBinary,
  parseHttpUrl,
  parseSongId,
} from '@/admin-api/_lib/security';

const PACKS_DIR = path.join(process.cwd(), 'src/data/songs');
const COVERS_DIR = path.join(process.cwd(), 'public/covers');
const PACKS_LOCK_FILE = path.join(PACKS_DIR, '.covers-save.lock');
const ALLOWED_IMAGE_HOSTS = [
  'mzstatic.com',
  'is1-ssl.mzstatic.com',
  'cdn-images.dzcdn.net',
  'dzcdn.net',
];
const LOCK_RETRIES = 30;
const LOCK_RETRY_DELAY_MS = 60;

/**
 * A lock file that is older than this is treated as abandoned (the process
 * that created it died). Without this the first crashed request would block
 * every later cover save until someone deletes the file by hand.
 *
 * The value is far above the worst case of a legitimate save (four network
 * hops with a timeout of 7 s each plus the file write), so a running save is
 * never mistaken for an abandoned one.
 */
const LOCK_STALE_MS = 120_000;

/** Rate limit for authenticated cover saves (writes to the repository). */
const SAVE_RATE_LIMIT = { limit: 10, windowMs: 60_000 };

interface PackSong {
  id: string;
  coverUrl?: string;
}

interface PackFile {
  songs?: PackSong[];
}

/**
 * Tries to create the lock file. Returns `null` when the lock is held by
 * another request and could not be acquired.
 */
async function acquirePacksLock(): Promise<Awaited<
  ReturnType<typeof fs.open>
> | null> {
  for (let attempt = 0; attempt < LOCK_RETRIES; attempt += 1) {
    try {
      return await fs.open(PACKS_LOCK_FILE, 'wx');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;

      const stale = await isStaleLock();
      if (stale) {
        await fs.rm(PACKS_LOCK_FILE, { force: true });
        continue;
      }

      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_DELAY_MS));
    }
  }

  return null;
}

/** True when the lock file exists but is older than `LOCK_STALE_MS`. */
async function isStaleLock(): Promise<boolean> {
  try {
    const stats = await fs.stat(PACKS_LOCK_FILE);
    return Date.now() - stats.mtimeMs > LOCK_STALE_MS;
  } catch {
    // The lock vanished in the meantime - the next attempt can take it.
    return true;
  }
}

async function withPacksLock<T>(action: () => Promise<T>): Promise<T> {
  const lockHandle = await acquirePacksLock();

  if (!lockHandle) {
    throw new AdminRequestError(
      'Cover save is temporarily busy. Please retry.',
      503
    );
  }

  try {
    return await action();
  } finally {
    await lockHandle.close();
    await fs.rm(PACKS_LOCK_FILE, { force: true });
  }
}

async function updatePackCover(
  songId: string,
  relativePath: string
): Promise<boolean> {
  return withPacksLock(async () => {
    const files = await fs.readdir(PACKS_DIR);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    for (const file of jsonFiles) {
      const filePath = path.join(PACKS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const pack = JSON.parse(content) as PackFile;

      const songIndex =
        pack.songs?.findIndex((song) => song.id === songId) ?? -1;
      if (songIndex === -1 || !pack.songs) continue;

      pack.songs[songIndex].coverUrl = relativePath;
      await fs.writeFile(filePath, JSON.stringify(pack, null, 2), 'utf-8');
      return true;
    }

    return false;
  });
}

export async function POST(request: Request) {
  const authError = assertAdminAccess(request);
  if (authError) return authError;

  const rateLimitError = assertRateLimit(
    request,
    'cover-save',
    SAVE_RATE_LIMIT
  );
  if (rateLimitError) return rateLimitError;

  try {
    const body = (await request.json()) as {
      songId?: unknown;
      imageUrl?: unknown;
    };

    let songId: string;
    let imageUrl: URL;
    try {
      songId = parseSongId(body.songId);
      imageUrl = parseHttpUrl(body.imageUrl, ALLOWED_IMAGE_HOSTS);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid input';
      throw new AdminRequestError(message, 400);
    }

    await fs.mkdir(COVERS_DIR, { recursive: true });

    const coverFilename = `${songId}.jpg`;
    const coverPath = path.join(COVERS_DIR, coverFilename);
    const relativePath = `/covers/${coverFilename}`;

    // Every redirect hop is checked against the host allowlist again, so a
    // redirect into the internal network is rejected instead of fetched.
    const image = await fetchGuardedBinary({
      url: imageUrl,
      allowHosts: ALLOWED_IMAGE_HOSTS,
      maxBytes: MAX_IMAGE_BYTES,
    });
    await fs.writeFile(coverPath, new Uint8Array(image));

    const updated = await updatePackCover(songId, relativePath);
    if (!updated) {
      return NextResponse.json(
        { error: `Song ID "${songId}" not found in any pack.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, coverUrl: relativePath });
  } catch (error) {
    if (error instanceof AdminRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    // Unexpected error: the message can contain paths of the server and is
    // therefore not returned to the caller. The log stays free of token
    // values - the token never reaches this point.
    console.error(
      '[admin-api] cover save failed:',
      error instanceof Error ? error.message : 'unknown error'
    );
    return NextResponse.json({ error: 'Cover save failed' }, { status: 500 });
  }
}
