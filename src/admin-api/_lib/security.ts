import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

import {
  checkRateLimit,
  getClientKey,
  type RateLimitOptions,
} from './rate-limit';

const DEFAULT_TIMEOUT_MS = 7000;
const MIN_ADMIN_TOKEN_LENGTH = 32;

/** Maximum number of redirects that are followed for an external image. */
export const MAX_REDIRECTS = 3;

/** Hard limit for a downloaded cover image (5 MB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Hard limit for a JSON answer of a third-party search API (512 KB). */
export const MAX_JSON_BYTES = 512 * 1024;

/** Failed authentication attempts per client and window. */
const AUTH_FAILURE_LIMIT: RateLimitOptions = {
  limit: 10,
  windowMs: 5 * 60_000,
};

/**
 * Failed authentication attempts across all clients of one instance and
 * window. This bucket cannot be bypassed by spoofing `x-forwarded-for`.
 */
const AUTH_FAILURE_GLOBAL_LIMIT: RateLimitOptions = {
  limit: 100,
  windowMs: 5 * 60_000,
};

/**
 * Error with an explicit HTTP status. The message of this error is safe to
 * return to the caller - it never contains a token, a path of the server
 * or a value of the request.
 */
export class AdminRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminRequestError';
    this.status = status;
  }
}

/**
 * Compares two tokens without leaking their common prefix through the
 * running time. Both values are hashed first, so the comparison always
 * runs on two equally long buffers and `timingSafeEqual` cannot throw.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aHash = crypto.createHash('sha256').update(a, 'utf8').digest();
  const bHash = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

/**
 * Returns the error response when the request must be rejected, otherwise
 * `null`.
 *
 * The token is never written to a log, an error message or a response
 * body. A rejected request only reports *why* it was rejected
 * ("missing", "invalid", "rate limited") - never a token value.
 */
export function assertAdminAccess(request: Request): NextResponse | null {
  const expectedToken = process.env.ADMIN_API_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { error: 'Admin API not configured' },
      { status: 503 }
    );
  }
  if (expectedToken.length < MIN_ADMIN_TOKEN_LENGTH) {
    return NextResponse.json(
      { error: 'Admin API token too short' },
      { status: 503 }
    );
  }

  const providedToken = request.headers.get('x-admin-token') ?? '';
  if (!providedToken || !timingSafeEqual(providedToken, expectedToken)) {
    const limited = enforceAuthFailureLimit(request);
    if (limited) return limited;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

/**
 * Counts a failed authentication and blocks further attempts when the
 * per-client or the global limit is reached.
 */
function enforceAuthFailureLimit(request: Request): NextResponse | null {
  const perClient = checkRateLimit(
    `auth-fail:${getClientKey(request)}`,
    AUTH_FAILURE_LIMIT
  );
  const global = checkRateLimit(
    'auth-fail:__global__',
    AUTH_FAILURE_GLOBAL_LIMIT
  );

  if (perClient.allowed && global.allowed) return null;

  const retryAfterSeconds = Math.max(
    perClient.retryAfterSeconds,
    global.retryAfterSeconds
  );
  // Deliberately without client data and without any token material.
  console.warn('[admin-api] authentication attempt limit reached');

  return NextResponse.json(
    { error: 'Too many authentication attempts. Please retry later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

/**
 * Rate limit for an authenticated route. Returns the error response when
 * the limit is exceeded, otherwise `null`.
 */
export function assertRateLimit(
  request: Request,
  scope: string,
  options: RateLimitOptions
): NextResponse | null {
  const result = checkRateLimit(`${scope}:${getClientKey(request)}`, options);
  if (result.allowed) return null;

  return NextResponse.json(
    { error: 'Rate limit exceeded. Please retry later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSeconds) },
    }
  );
}

export function boundedText(
  raw: string | null,
  label: string,
  maxLength = 120
): string {
  const value = (raw ?? '').trim();
  if (!value) throw new Error(`${label} required`);
  if (value.length > maxLength) throw new Error(`${label} too long`);
  return value;
}

export function parseSongId(raw: unknown): string {
  if (typeof raw !== 'string') throw new Error('songId must be a string');
  const value = raw.trim();
  if (!/^[a-z0-9][a-z0-9-_]{2,120}$/i.test(value))
    throw new Error('Invalid songId format');
  return value;
}

/**
 * Checks that the host of `url` is on the allowlist. A host matches when it
 * is listed itself or when it is a subdomain of a listed host.
 */
export function assertAllowedHost(url: URL, allowHosts: string[]): void {
  const host = url.hostname.toLowerCase();
  const hostAllowed = allowHosts.some((allowed) => {
    const candidate = allowed.toLowerCase();
    return host === candidate || host.endsWith(`.${candidate}`);
  });
  if (!hostAllowed) throw new Error('Image host not allowed');
}

export function parseHttpUrl(raw: unknown, allowHosts: string[]): URL {
  if (typeof raw !== 'string') throw new Error('imageUrl must be a string');

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('imageUrl is not a valid URL');
  }

  if (parsed.protocol !== 'https:')
    throw new Error('Only HTTPS image URLs are allowed');
  // Credentials in the URL would leak into logs and upstream requests.
  if (parsed.username || parsed.password)
    throw new Error('Credentials in URL are not allowed');

  assertAllowedHost(parsed, allowHosts);

  return parsed;
}

export interface FetchTimeoutOptions {
  /** Value of the `Accept` header. */
  accept?: string;
  /** Redirect strategy of the underlying fetch. */
  redirect?: RequestRedirect;
  /** Hard limit for the response body. Exceeding it aborts the request. */
  maxBytes?: number;
}

export async function fetchWithTimeout(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  options: FetchTimeoutOptions = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      redirect: options.redirect ?? 'follow',
      headers: {
        Accept: options.accept ?? 'application/json',
      },
    });

    if (options.maxBytes === undefined) return response;

    const buffer = await readCappedBody(response, options.maxBytes);
    const headers = new Headers();
    headers.set(
      'content-type',
      response.headers.get('content-type') ?? 'application/octet-stream'
    );
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Reads a response body and aborts as soon as more than `maxBytes` bytes
 * arrive. The body is streamed instead of buffered completely, so a server
 * that omits `content-length` cannot exhaust the memory of the process.
 */
async function readCappedBody(
  response: Response,
  maxBytes: number
): Promise<ArrayBuffer> {
  const lengthHeader = response.headers.get('content-length');
  if (lengthHeader) {
    const declared = Number(lengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new AdminRequestError('Payload too large', 413);
    }
  }

  if (!response.body) return new ArrayBuffer(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new AdminRequestError('Payload too large', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new ArrayBuffer(total);
  const view = new Uint8Array(result);
  let offset = 0;
  for (const chunk of chunks) {
    view.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export interface GuardedBinaryOptions {
  url: URL;
  allowHosts: string[];
  timeoutMs?: number;
  maxBytes?: number;
  accept?: string;
}

/**
 * Downloads a binary file from an allowlisted host.
 *
 * Redirects are followed manually and every hop is checked against the
 * allowlist again. A redirect into the internal network (for example
 * `http://169.254.169.254/`) is therefore rejected instead of being
 * fetched - this is the difference to a plain `redirect: 'follow'`.
 */
export async function fetchGuardedBinary(
  options: GuardedBinaryOptions
): Promise<ArrayBuffer> {
  const {
    url,
    allowHosts,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = MAX_IMAGE_BYTES,
    accept = 'image/*',
  } = options;

  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetchWithTimeout(current.toString(), timeoutMs, {
      accept,
      redirect: 'manual',
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location)
        throw new AdminRequestError('Redirect without target rejected', 400);

      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new AdminRequestError('Invalid redirect target rejected', 400);
      }

      if (next.protocol !== 'https:') {
        throw new AdminRequestError('Only HTTPS redirects are allowed', 400);
      }
      try {
        assertAllowedHost(next, allowHosts);
      } catch {
        throw new AdminRequestError('Redirect target host not allowed', 400);
      }

      current = next;
      continue;
    }

    if (!response.ok) {
      throw new AdminRequestError(
        `Failed to fetch image: ${response.status}`,
        502
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      throw new AdminRequestError('Remote file is not an image', 400);
    }

    return await readCappedBody(response, maxBytes);
  }

  throw new AdminRequestError('Too many redirects', 400);
}
