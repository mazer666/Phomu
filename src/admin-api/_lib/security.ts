import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

const DEFAULT_TIMEOUT_MS = 7000;
const MIN_ADMIN_TOKEN_LENGTH = 32;

function timingSafeEqual(a: string, b: string): boolean {
  const aHash = crypto.createHash('sha256').update(a, 'utf8').digest();
  const bHash = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

export function assertAdminAccess(request: Request): NextResponse | null {
  const expectedToken = process.env.ADMIN_API_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: 'Admin API not configured' }, { status: 503 });
  }
  if (expectedToken.length < MIN_ADMIN_TOKEN_LENGTH) {
    return NextResponse.json({ error: 'Admin API token too short' }, { status: 503 });
  }

  const providedToken = request.headers.get('x-admin-token') ?? '';
  if (!providedToken || !timingSafeEqual(providedToken, expectedToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export function boundedText(raw: string | null, label: string, maxLength = 120): string {
  const value = (raw ?? '').trim();
  if (!value) throw new Error(`${label} required`);
  if (value.length > maxLength) throw new Error(`${label} too long`);
  return value;
}

export function parseSongId(raw: unknown): string {
  if (typeof raw !== 'string') throw new Error('songId must be a string');
  const value = raw.trim();
  if (!/^[a-z0-9][a-z0-9-_]{2,120}$/i.test(value)) throw new Error('Invalid songId format');
  return value;
}

export function parseHttpUrl(raw: unknown, allowHosts: string[]): URL {
  if (typeof raw !== 'string') throw new Error('imageUrl must be a string');
  const parsed = new URL(raw);
  if (parsed.protocol !== 'https:') throw new Error('Only HTTPS image URLs are allowed');

  const host = parsed.hostname.toLowerCase();
  const hostAllowed = allowHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  if (!hostAllowed) throw new Error('Image host not allowed');

  return parsed;
}

export async function fetchWithTimeout(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        Accept: 'application/json',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}
