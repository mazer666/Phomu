const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const gitDir = path.join(projectRoot, '.git');
const hooksDir = path.join(gitDir, 'hooks');
const hookFile = path.join(hooksDir, 'pre-push');

console.log('Setting up Git hooks for Phomu...');

if (!fs.existsSync(gitDir)) {
  console.log('⚠️ .git directory not found. Skipping hook installation (normal for non-git, containerized, or production environments).');
  process.exit(0);
}

if (!fs.existsSync(hooksDir)) {
  try {
    fs.mkdirSync(hooksDir, { recursive: true });
    console.log('Created .git/hooks directory.');
  } catch (err) {
    console.error(`❌ Failed to create .git/hooks directory: ${err.message}`);
    process.exit(1);
  }
}

const hookContent = `#!/bin/sh

# Phomu Git Pre-Push Hook
# Runs the local CI suite before pushing to remote branches.

echo "=========================================="
echo "      Running Git Pre-Push Quality Gates  "
echo "=========================================="

npm run local-ci
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "❌ Push rejected! All quality gates must pass before pushing."
  exit $STATUS
fi

echo "✅ All quality gates passed! Proceeding with push."
exit 0
`;

try {
  fs.writeFileSync(hookFile, hookContent, { mode: 0o755 });
  console.log('✅ Successfully installed Git pre-push hook at .git/hooks/pre-push');
  
  // Explicitly ensure the file is executable
  try {
    fs.chmodSync(hookFile, '755');
  } catch (chmodErr) {
    console.log(`⚠️ Note: Could not set executable permissions programmatically: ${chmodErr.message}`);
  }
} catch (err) {
  console.error(`❌ Failed to write pre-push hook: ${err.message}`);
  process.exit(1);
}
