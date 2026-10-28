#!/usr/bin/env node
/**
 * Quality gate: the GitHub workflows are valid
 * -------------------------------------------------------------------------
 * A workflow with a syntax error does not fail loudly — GitHub registers it
 * under its file path instead of its name and every run dies before the
 * first step. The error is only visible in the web interface, so it is easy
 * to miss.
 *
 * What is checked:
 *   1. every file in .github/workflows/ parses as YAML
 *   2. every workflow has a name, triggers and jobs
 *   3. no job-level `if` uses the `secrets` context — GitHub evaluates the
 *      job condition before the secrets exist, and rejects the file with
 *      "Unrecognized named-value: 'secrets'". The secret has to be read
 *      into the job environment and tested in a step.
 *
 * Usage: npm run check:workflows
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const WORKFLOW_DIR = path.join(REPO_ROOT, '.github', 'workflows');

const findings = [];

if (!fs.existsSync(WORKFLOW_DIR)) {
  console.log('No .github/workflows directory — nothing to check.');
  process.exit(0);
}

const files = fs
  .readdirSync(WORKFLOW_DIR)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort();

/**
 * The expressions that may not appear in a job-level condition.
 *
 * WHY: GitHub builds the context of a job before it asks whether the job
 * may run. `secrets` is filled at that point, so a job-level condition
 * cannot read it — and the workflow file is rejected as invalid.
 */
const FORBIDDEN_IN_JOB_IF = ['secrets'];

for (const name of files) {
  const relative = path.join('.github', 'workflows', name);
  const source = fs.readFileSync(path.join(WORKFLOW_DIR, name), 'utf8');

  let document;
  try {
    document = yaml.load(source);
  } catch (error) {
    findings.push({ file: relative, what: 'not valid YAML', detail: error.message });
    continue;
  }

  if (!document || typeof document !== 'object') {
    findings.push({ file: relative, what: 'empty or not a mapping', detail: '' });
    continue;
  }

  // "on" is parsed as the boolean true by the YAML 1.1 rules that some
  // parsers apply; both spellings have to be accepted.
  const triggers = document.on ?? document.true;
  if (!triggers) {
    findings.push({ file: relative, what: 'no trigger', detail: 'expected an "on" key' });
  }
  if (!document.name) {
    findings.push({
      file: relative,
      what: 'no name',
      detail: 'GitHub shows the file path instead of a readable name',
    });
  }
  if (!document.jobs || Object.keys(document.jobs).length === 0) {
    findings.push({ file: relative, what: 'no job', detail: 'expected a "jobs" key' });
    continue;
  }

  for (const [jobName, job] of Object.entries(document.jobs)) {
    const condition = typeof job?.if === 'string' ? job.if : '';
    if (!condition) continue;
    for (const forbidden of FORBIDDEN_IN_JOB_IF) {
      const pattern = new RegExp(`\\b${forbidden}\\b`);
      if (pattern.test(condition)) {
        findings.push({
          file: relative,
          what: `the job "${jobName}" reads "${forbidden}" in its condition`,
          detail:
            `GitHub rejects the file with "Unrecognized named-value: '${forbidden}'". ` +
            'Read the secret into the job environment and test it in a step.',
        });
      }
    }
  }
}

console.log('Phomu quality gate: GitHub workflows');
console.log(`Workflows checked: ${files.length}`);

if (findings.length === 0) {
  console.log('✅ Every workflow is valid.');
  process.exit(0);
}

console.error(`\n❌ ${findings.length} problem(s):`);
for (const finding of findings) {
  console.error(`   ${finding.file} — ${finding.what}${finding.detail ? `: ${finding.detail}` : ''}`);
}
process.exit(1);
