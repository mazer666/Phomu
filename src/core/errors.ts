/**
 * The failures of the base, as the shell reads them.
 *
 * WHAT: the error of the bridge, the helper that turns a failure into it
 * and the helper that runs a call into the base.
 *
 * WHY a module of its own: the shell has to tell the failures apart — a
 * round whose answers are not locked in is closed with the timeout, every
 * other failure is shown to the player. The error therefore has to be
 * readable without loading the WebAssembly module.
 *
 * WHY the code and the key and not a sentence: the base supplies the keys,
 * the shell supplies the texts (docs/design/BUILD-CONTRACT.md § 6.1).
 *
 * EXAMPLE: the base refuses to release the solution of a round that nobody
 * answered — `isAnswersNotLocked` recognises the failure and the shell
 * closes the round with the timeout.
 */

/**
 * The failure of the base, as the shell reads it.
 */
export class CoreError extends Error {
  /** The stable numeric code of the failure. */
  readonly code: number;
  /** The i18n message key of the failure. */
  readonly messageKey: string;

  constructor(code: number, messageKey: string, reason: string) {
    super(`${messageKey}: ${reason}`);
    this.name = 'CoreError';
    this.code = code;
    this.messageKey = messageKey;
  }
}

/** The document the bridge throws when the base refuses a command. */
interface BridgeFailure {
  code?: number;
  messageKey?: string;
  context?: Record<string, string>;
}

/**
 * Turns the failure of the bridge into a [`CoreError`].
 *
 * WHY the bridge throws a JSON document: the wire format of the bridge is
 * JSON (BRIDGE-110). The shell reads the code and the key out of it.
 */
function toCoreError(failure: unknown): CoreError {
  if (typeof failure === 'string') {
    try {
      const parsed = JSON.parse(failure) as BridgeFailure;
      const context = parsed.context ?? {};
      const reason = Object.entries(context)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      return new CoreError(
        parsed.code ?? 0,
        parsed.messageKey ?? 'errors.generic',
        reason
      );
    } catch {
      return new CoreError(0, 'errors.generic', failure);
    }
  }
  return new CoreError(0, 'errors.generic', String(failure));
}

/**
 * Runs a call into the base and turns its failure into a [`CoreError`].
 *
 * WHY the helper is exported: every call into the module crosses the same
 * boundary and fails the same way.
 */
export function callBridge<T>(action: () => T): T {
  try {
    return action();
  } catch (failure) {
    throw toCoreError(failure);
  }
}

/**
 * Parses a payload of the bridge.
 *
 * WHY the cast: the bridge marshals the values of the base into JSON. The
 * types of this module describe that wire format.
 */
export function parseBridge<T>(document: string): T {
  return JSON.parse(document) as T;
}

/**
 * Whether the base refused because the answers of the round are not locked
 * in.
 *
 * WHY the shell asks: the base releases the solution of a round only after
 * the answers are locked in (C-3). A round that nobody answered — the table
 * skipped the answer, the round timed out — is closed with the timeout of
 * the base instead of the reveal.
 *
 * @param failure - The failure of the base.
 * @returns Whether the failure names the missing lock.
 */
export function isAnswersNotLocked(failure: unknown): boolean {
  return failure instanceof CoreError && failure.messageKey === 'errors.answersNotLocked';
}
