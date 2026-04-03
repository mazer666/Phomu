import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import { assertAdminAccess, parseHttpUrl, parseSongId } from '@/admin-api/_lib/security';

const PACKS_DIR = path.join(process.cwd(), 'src/data/packs');
const COVERS_DIR = path.join(process.cwd(), 'public/covers');
const PACKS_LOCK_FILE = path.join(PACKS_DIR, '.covers-save.lock');
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_HOSTS = ['mzstatic.com', 'is1-ssl.mzstatic.com', 'cdn-images.dzcdn.net', 'dzcdn.net'];
const LOCK_RETRIES = 30;
const LOCK_RETRY_DELAY_MS = 60;

class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface PackSong {
  id: string;
  coverUrl?: string;
}

interface PackFile {
  songs?: PackSong[];
}

async function downloadCover(url: URL): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        Accept: 'image/*',
      },
    });

    if (!response.ok) {
      throw new HttpError(`Failed to fetch image: ${response.status}`, 502);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      throw new HttpError('Remote file is not an image', 400);
    }

    const lengthHeader = response.headers.get('content-length');
    if (lengthHeader && Number(lengthHeader) > MAX_IMAGE_BYTES) {
      throw new HttpError('Image too large', 413);
    }

    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new HttpError('Image too large', 413);
    }

    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}

async function withPacksLock<T>(action: () => Promise<T>): Promise<T> {
  let lockHandle: Awaited<ReturnType<typeof fs.open>> | null = null;

  for (let attempt = 0; attempt < LOCK_RETRIES; attempt += 1) {
    try {
      lockHandle = await fs.open(PACKS_LOCK_FILE, 'wx');
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_DELAY_MS));
    }
  }

  if (!lockHandle) {
    throw new HttpError('Cover save is temporarily busy. Please retry.', 503);
  }

  try {
    return await action();
  } finally {
    await lockHandle.close();
    await fs.rm(PACKS_LOCK_FILE, { force: true });
  }
}

async function updatePackCover(songId: string, relativePath: string): Promise<boolean> {
  return withPacksLock(async () => {
    const files = await fs.readdir(PACKS_DIR);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    for (const file of jsonFiles) {
      const filePath = path.join(PACKS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const pack = JSON.parse(content) as PackFile;

      const songIndex = pack.songs?.findIndex((song) => song.id === songId) ?? -1;
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

  try {
    const body = (await request.json()) as { songId?: unknown; imageUrl?: unknown };
    let songId: string;
    let imageUrl: URL;
    try {
      songId = parseSongId(body.songId);
      imageUrl = parseHttpUrl(body.imageUrl, ALLOWED_IMAGE_HOSTS);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid input';
      throw new HttpError(message, 400);
    }

    await fs.mkdir(COVERS_DIR, { recursive: true });

    const coverFilename = `${songId}.jpg`;
    const coverPath = path.join(COVERS_DIR, coverFilename);
    const relativePath = `/covers/${coverFilename}`;

    const image = await downloadCover(imageUrl);
    await fs.writeFile(coverPath, image);

    const updated = await updatePackCover(songId, relativePath);
    if (!updated) {
      return NextResponse.json({ error: `Song ID "${songId}" not found in any pack.` }, { status: 404 });
    }

    return NextResponse.json({ success: true, coverUrl: relativePath });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : 'Save cover failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
