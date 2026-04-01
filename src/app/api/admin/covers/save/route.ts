import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';

export async function POST(request: Request) {
  const { songId, imageUrl } = await request.json();

  if (!songId || !imageUrl) {
    return NextResponse.json({ error: 'Missing songId or imageUrl' }, { status: 400 });
  }

  const PACKS_DIR = path.join(process.cwd(), 'src/data/packs');
  const COVERS_DIR = path.join(process.cwd(), 'public/covers');
  const coverFilename = `${songId}.jpg`;
  const coverPath = path.join(COVERS_DIR, coverFilename);
  const relativePath = `/covers/${coverFilename}`;

  try {
    // 1. Ensure directory exists
    await fs.mkdir(COVERS_DIR, { recursive: true });

    // 2. Download and Save Image
    await new Promise((resolve, reject) => {
      https.get(imageUrl, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch image: ${res.statusCode}`));
          return;
        }
        const chunks: any[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', async () => {
          const buffer = Buffer.concat(chunks);
          await fs.writeFile(coverPath, buffer);
          resolve(true);
        });
      }).on('error', reject);
    });

    // 3. Update JSON Pack
    const files = await fs.readdir(PACKS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    let updated = false;

    for (const file of jsonFiles) {
      const filePath = path.join(PACKS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const pack = JSON.parse(content);

      const songIndex = pack.songs?.findIndex((s: any) => s.id === songId);
      if (songIndex !== -1) {
        pack.songs[songIndex].coverUrl = relativePath;
        await fs.writeFile(filePath, JSON.stringify(pack, null, 2), 'utf-8');
        updated = true;
        break;
      }
    }

    if (!updated) {
       return NextResponse.json({ error: `Song ID "${songId}" not found in any pack.` }, { status: 404 });
    }

    return NextResponse.json({ success: true, coverUrl: relativePath });
  } catch (error: any) {
    console.error('Save cover error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
