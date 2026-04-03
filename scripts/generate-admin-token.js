#!/usr/bin/env node
const crypto = require('node:crypto');

const bytes = Number(process.env.ADMIN_TOKEN_BYTES ?? 32);
if (!Number.isInteger(bytes) || bytes < 16) {
  console.error('ADMIN_TOKEN_BYTES must be an integer >= 16');
  process.exit(1);
}

const token = crypto.randomBytes(bytes).toString('hex');
console.log('New ADMIN_API_TOKEN (store securely, do not commit):');
console.log(token);
