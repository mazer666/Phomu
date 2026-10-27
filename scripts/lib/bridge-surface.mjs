/**
 * The rules of the bridge-surface gate.
 * -------------------------------------------------------------------------
 * WHAT THIS MODULE DOES
 *   It compares the **declaration** — `platform/bridge-surface.json`: the list
 *   of the public operations of the session with the bridge symbol that
 *   reaches them or the reason why they are not exposed — with the
 *   **session** and the **bridges**, as they are read by
 *   `./rust-surface.mjs`.
 *
 *   The result is the set of findings of the acceptance criterion of
 *   QA-RST-003 (docs/qa/QA-11-RUST-BASE.md):
 *
 *   | Rule | Severity | Meaning |
 *   |---|---|---|
 *   | BS-001 | error | an operation of the session is not declared |
 *   | BS-002 | error | a declared operation has neither a bridge nor an exemption |
 *   | BS-003 | error | a declaration names a bridge symbol that exists in no bridge |
 *   | BS-004 | error | a declaration names an operation the session does not have |
 *   | BS-005 | error | a declaration names a bridge symbol **and** an exemption |
 *   | BS-101 | warning | an operation is exempted instead of being exported |
 *   | BS-102 | warning | the bridge that exports the symbol does not call the operation |
 */

import fs from 'node:fs';

/* ------------------------------------------------------------------ *
 * The declaration
 * ------------------------------------------------------------------ */

/**
 * Read and check the declaration.
 *
 * @param {string} path the path of the declaration
 * @returns {{operations: Array<any>, errors: Array<any>}} the declaration and the findings
 */
export function readDeclaration(path) {
  /** @type {Array<any>} */
  const errors = [];
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (reason) {
    errors.push({
      rule: 'BS-000',
      severity: 'error',
      message: `the declaration ${path} is not readable JSON`,
      detail: String(reason),
      file: path,
      line: 0,
    });
    return { operations: [], errors };
  }
  if (!parsed || !Array.isArray(parsed.operations)) {
    errors.push({
      rule: 'BS-000',
      severity: 'error',
      message: `the declaration ${path} has no "operations" array`,
      detail: 'the declaration has to carry the list of the operations of the session',
      file: path,
      line: 0,
    });
    return { operations: [], errors };
  }
  return { operations: parsed.operations, errors };
}

/* ------------------------------------------------------------------ *
 * The rules
 * ------------------------------------------------------------------ */

/**
 * Compare the declaration, the session and the bridges.
 *
 * @param {{operations: Array<any>}} declaration the parsed declaration
 * @param {Map<string, {file: string, line: number}>} session the operations of the session
 * @param {Map<string, Array<{bridge: string, file: string, line: number}>>} symbols the bridge symbols
 * @param {Map<string, Set<string>>} called the operations a bridge calls
 * @param {string} declarationPath the path of the declaration
 * @returns {{findings: Array<any>, stats: object}} the findings and the numbers
 */
export function evaluateSurface(declaration, session, symbols, called, declarationPath) {
  /** @type {Array<any>} */
  const findings = [];
  const declared = new Map();

  for (const entry of declaration.operations) {
    const name = entry?.name;
    if (typeof name !== 'string' || name.length === 0) {
      findings.push({
        rule: 'BS-000',
        severity: 'error',
        message: 'an entry of the declaration has no name',
        detail: 'every entry has to name the operation, for example "Session::start_game"',
        file: declarationPath,
        line: 0,
      });
      continue;
    }
    if (declared.has(name)) {
      findings.push({
        rule: 'BS-000',
        severity: 'error',
        message: `the operation ${name} is declared twice`,
        detail: 'every operation of the session is declared exactly once',
        file: declarationPath,
        line: 0,
      });
      continue;
    }
    declared.set(name, entry);

    const stateChanging = entry.state_changing;
    if (typeof stateChanging !== 'boolean') {
      findings.push({
        rule: 'BS-000',
        severity: 'error',
        message: `the operation ${name} has no "state_changing" flag`,
        detail: 'the flag tells the gate whether the operation needs a bridge symbol',
        file: declarationPath,
        line: 0,
      });
      continue;
    }

    const bridge = entry.bridge ?? null;
    const exemption = entry.exemption ?? null;
    const hasBridge = typeof bridge === 'string' && bridge.length > 0;
    const hasExemption = typeof exemption === 'string' && exemption.length > 0;

    if (hasBridge && hasExemption) {
      findings.push({
        rule: 'BS-005',
        severity: 'error',
        message: `the operation ${name} names a bridge symbol and an exemption`,
        detail: 'the declaration is a choice: either the symbol that reaches the operation or the reason why it is not exposed',
        file: declarationPath,
        line: 0,
      });
    }

    if (stateChanging && !hasBridge && !hasExemption) {
      findings.push({
        rule: 'BS-002',
        severity: 'error',
        message: `the operation ${name} changes the state and has neither a bridge symbol nor an exemption`,
        detail: 'every state-changing operation of the session has to be reachable or to carry a written reason',
        file: declarationPath,
        line: 0,
      });
    }

    if (hasBridge && !symbols.has(bridge)) {
      findings.push({
        rule: 'BS-003',
        severity: 'error',
        message: `the operation ${name} names the bridge symbol ${bridge}, which exists in no bridge`,
        detail: 'the symbol has to be exported by one of the bridges of platform/',
        file: declarationPath,
        line: 0,
      });
    }

    if (hasBridge && symbols.has(bridge)) {
      const exporters = symbols.get(bridge);
      const owners = exporters.map((exporter) => exporter.bridge);
      const reachable = owners.filter((owner) => (called.get(owner) ?? new Set()).has(name));
      if (reachable.length === 0) {
        findings.push({
          rule: 'BS-102',
          severity: 'warning',
          message: `the bridge symbol ${bridge} does not call ${name} in any of the bridges that export it`,
          detail: `the symbol is exported by ${owners.join(', ')} — the check is a heuristic, the call may be hidden behind a helper of the bridge`,
          file: declarationPath,
          line: 0,
        });
      }
    }

    if (hasExemption) {
      findings.push({
        rule: 'BS-101',
        severity: 'warning',
        message: `the operation ${name} is exempted instead of being exported`,
        detail: exemption,
        file: declarationPath,
        line: 0,
      });
    }
  }

  for (const [name, origin] of session) {
    if (declared.has(name)) continue;
    findings.push({
      rule: 'BS-001',
      severity: 'error',
      message: `the operation ${name} of the session is not declared`,
      detail: 'every public operation of the session has to be declared, with a bridge symbol or with an exemption',
      file: origin.file,
      line: origin.line,
    });
  }

  for (const [name, entry] of declared) {
    if (session.has(name)) continue;
    findings.push({
      rule: 'BS-004',
      severity: 'error',
      message: `the declaration names the operation ${name}, which the session does not have`,
      detail: 'the operation was renamed or removed — the declaration has to follow the code',
      file: declarationPath,
      line: 0,
    });
  }

  let stateChanging = 0;
  let readOnly = 0;
  let withBridge = 0;
  let withExemption = 0;
  for (const entry of declared.values()) {
    if (entry.state_changing === true) stateChanging += 1;
    else readOnly += 1;
    const bridge = entry.bridge ?? null;
    const exemption = entry.exemption ?? null;
    if (typeof bridge === 'string' && bridge.length > 0) withBridge += 1;
    if (typeof exemption === 'string' && exemption.length > 0) withExemption += 1;
  }

  return {
    findings,
    stats: {
      sessionOperations: session.size,
      bridgeSymbols: symbols.size,
      declared: declared.size,
      stateChanging,
      readOnly,
      withBridge,
      withExemption,
    },
  };
}
