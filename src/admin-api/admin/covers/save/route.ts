import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import { assertAdminAccess, parseHttpUrl, parseSongId } from '@/admin-api/_lib/security';

const PACKS_DIR = path.join(process.cwd(), 'src/data/packs');
const COVERS_DIR = path.join(process.cwd(), 'public/covers');
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_HOSTS = ['mzstatic.com', 'is1-ssl.mzstatic.com', 'cdn-images.dzcdn.net', 'dzcdn.net'];

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
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      throw new Error('Remote file is not an image');
    }

    const lengthHeader = response.headers.get('content-length');
    if (lengthHeader && Number(lengthHeader) > MAX_IMAGE_BYTES) {
      throw new Error('Image too large');
    }

    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error('Image too large');
    }

    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}

async function updatePackCover(songId: string, relativePath: string): Promise<boolean> {
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
}

export async function POST(request: Request) {
  const authError = assertAdminAccess(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as { songId?: unknown; imageUrl?: unknown };
    const songId = parseSongId(body.songId);
    const imageUrl = parseHttpUrl(body.imageUrl, ALLOWED_IMAGE_HOSTS);

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
    const message = error instanceof Error ? error.message : 'Save cover failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
