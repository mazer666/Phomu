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

if (!fs.existsSync(reportPath)) fail('catalog_issues_report.json fehlt. Bitte zuerst validate-catalog:report ausführen.');
if (!fs.existsSync(securityPath)) fail('security.ts fehlt.');
if (!fs.existsSync(e2ePath)) fail('e2e/smoke.spec.ts fehlt.');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const securitySource = fs.readFileSync(securityPath, 'utf8');
const e2eSource = fs.readFileSync(e2ePath, 'utf8');

if (report.duplicateGroups !== 0) fail(`duplicateGroups muss 0 sein, ist aber ${report.duplicateGroups}.`);
if (!Array.isArray(report.missingYears) || report.missingYears.length !== 0) {
  fail(`missingYears muss leer sein, ist aber ${JSON.stringify(report.missingYears)}.`);
}
if (typeof report.schemaErrors !== 'number' || report.schemaErrors > 1300) {
  fail(`schemaErrors muss <= 1300 sein, ist aber ${report.schemaErrors}.`);
}

if (!securitySource.includes('MIN_ADMIN_TOKEN_LENGTH')) {
  fail('MIN_ADMIN_TOKEN_LENGTH Check in security.ts nicht gefunden.');
}
if (!securitySource.includes('timingSafeEqual')) {
  fail('timingSafeEqual Check in security.ts nicht gefunden.');
}

if (!e2eSource.includes("'/game-over'")) {
  fail("E2E smoke deckt '/game-over' nicht ab.");
}

console.log('✅ Phase-1-Acceptance-Checks bestanden.');
