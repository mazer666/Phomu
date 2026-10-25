/**
 * The error type of the admin API and the single answer a misconfigured
 * server gives.
 *
 * The class carries the HTTP status, so that status and message cannot drift
 * apart through the wording of an error text.
 */

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
 * The answer of a server whose admin API cannot be used at all.
 *
 * The message is deliberately the same for every misconfiguration (the
 * variable is missing, the token is too short). A different wording per
 * cause would be an oracle: it would tell an unauthenticated caller
 * whether a usable secret exists on this server. The concrete reason goes
 * into the server log, where the operator can read it and the caller
 * cannot.
 */
export const ADMIN_UNAVAILABLE_MESSAGE = 'Admin API unavailable';
