#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const reportPath = path.join(root, 'specifications', 'catalog_issues_report.json');
const securityPath = path.join(root, 'src', 'admin-api', '_lib', 'security.ts');
const e2ePath = path.join(root, 'e2e', 'smoke.spec.ts');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(reportPath)) fail('catalog_issues_report.json is missing. Please run validate-catalog:report first.');
if (!fs.existsSync(securityPath)) fail('security.ts is missing.');
if (!fs.existsSync(e2ePath)) fail('e2e/smoke.spec.ts is missing.');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const securitySource = fs.readFileSync(securityPath, 'utf8');
const e2eSource = fs.readFileSync(e2ePath, 'utf8');

if (report.duplicateGroups !== 0) fail(`duplicateGroups must be 0, but is ${report.duplicateGroups}.`);
if (!Array.isArray(report.missingYears) || report.missingYears.length !== 0) {
  fail(`missingYears must be empty, but is ${JSON.stringify(report.missingYears)}.`);
}
if (typeof report.schemaErrors !== 'number' || report.schemaErrors > 1300) {
  fail(`schemaErrors must be <= 1300, but is ${report.schemaErrors}.`);
}

if (!securitySource.includes('MIN_ADMIN_TOKEN_LENGTH')) {
  fail('MIN_ADMIN_TOKEN_LENGTH check not found in security.ts.');
}
if (!securitySource.includes('timingSafeEqual')) {
  fail('timingSafeEqual check not found in security.ts.');
}

if (!e2eSource.includes("'/game-over'")) {
  fail("E2E smoke does not cover '/game-over'.");
}

console.log('✅ Phase-1 acceptance checks passed.');
