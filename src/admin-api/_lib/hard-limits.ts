/**
 * The hard upper bounds of the admin API.
 *
 * Every limit in this file is a number that is enforced, not a number that
 * is documented. The three groups are:
 *
 *   - the size of a body that is read into the memory (incoming request,
 *     outgoing image, outgoing JSON of a third-party API),
 *   - the length of a text that is accepted from a caller,
 *   - the length of a text that is handed back to a caller.
 *
 * A bound that is not enforced is no bound: an attacker who sends a body of
 * 2 GB or a title of 2 MB would otherwise decide how much memory the
 * process uses.
 */

import { AdminRequestError } from './errors';

/** Hard limit for the JSON body of an incoming admin request (16 KB). */
export const MAX_REQUEST_BODY_BYTES = 16 * 1024;

/** Hard limit for a downloaded cover image (5 MB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Hard limit for a JSON answer of a third-party search API (512 KB). */
export const MAX_JSON_BYTES = 512 * 1024;

/** Hard limit for a single text in the answer of the admin API (300 chars). */
export const MAX_RESULT_FIELD_LENGTH = 300;

/** Hard limit for an image URL that is accepted or handed back (2048 chars). */
export const MAX_URL_LENGTH = 2048;

/**
 * The part of a request or a response that carries a body. `Request` and
 * `Response` both satisfy it.
 */
export interface BodyCarrier {
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
}

/**
 * Reads a response body and aborts as soon as more than `maxBytes` bytes
 * arrive. The body is streamed instead of buffered completely, so a server
 * that omits `content-length` cannot exhaust the memory of the process.
 *
 * @param carrier the request or response whose body is read
 * @param maxBytes the hard limit in bytes
 * @returns the body as an array buffer
 */
export async function readCappedBody(
  carrier: BodyCarrier,
  maxBytes: number
): Promise<ArrayBuffer> {
  const lengthHeader = carrier.headers.get('content-length');
  if (lengthHeader) {
    const declared = Number(lengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new AdminRequestError('Payload too large', 413);
    }
  }

  if (!carrier.body) return new ArrayBuffer(0);

  const reader = carrier.body.getReader();
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

/**
 * Reads the JSON body of a request under a hard size limit.
 *
 * `request.json()` without a limit would put the whole body into the
 * memory of the process before a single field is validated. The body is
 * therefore streamed and cut off at `maxBytes`.
 *
 * @param request the request whose body is read
 * @param maxBytes the hard limit in bytes
 * @returns the parsed body
 */
export async function readCappedJsonBody(
  request: Request,
  maxBytes = MAX_REQUEST_BODY_BYTES
): Promise<unknown> {
  const buffer = await readCappedBody(request, maxBytes);
  const text = new TextDecoder().decode(buffer);

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AdminRequestError('Malformed JSON body', 400);
  }
}

/**
 * Cuts a text of a third-party answer down to the hard limit.
 *
 * The admin API hands text of iTunes and Deezer back to the caller. Those
 * answers are capped as a whole (512 KB), but a single field inside them
 * may still be almost that long. A field of the answer is therefore cut
 * off here, so that the answer of a route has a bounded size per field as
 * well as in total.
 *
 * @param raw the value of the third-party field
 * @param maxLength the hard limit in characters
 * @returns the text, cut off at the limit
 */
export function boundedOutputText(
  raw: unknown,
  maxLength = MAX_RESULT_FIELD_LENGTH
): string {
  if (typeof raw !== 'string') return '';
  return raw.length > maxLength ? raw.slice(0, maxLength) : raw;
}
