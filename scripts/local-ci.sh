#!/bin/bash

# Set terminal color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BLUE}${BOLD}======================================================================${NC}"
echo -e "${BLUE}${BOLD}                       PHOMU LOCAL CI RUNNER                          ${NC}"
echo -e "${BLUE}${BOLD}======================================================================${NC}"

FAILED=0
WARN=0

run_check() {
    local name="$1"
    local cmd="$2"
    local non_blocking="$3"

    echo -e "\n${CYAN}${BOLD}[RUNNING]${NC} ${BOLD}${name}${NC} (${CYAN}${cmd}${NC})..."
    
    # Run the command
    eval "$cmd"
    local status=$?

    if [ $status -eq 0 ]; then
        echo -e "${GREEN}${BOLD}[SUCCESS]${NC} ${name} passed."
        return 0
    else
        if [ "$non_blocking" = "true" ]; then
            echo -e "${YELLOW}${BOLD}[WARNING]${NC} ${name} failed, but this check is non-blocking."
            WARN=$((WARN + 1))
            return 0
        else
            echo -e "${RED}${BOLD}[FAILURE]${NC} ${name} failed with exit status ${status}."
            FAILED=1
            return 1
        fi
    fi
}

# 1. Typecheck
run_check "TypeScript Typecheck" "npm run typecheck" "false" || exit 1

# 2. Lint
run_check "ESLint Linting" "npm run lint" "false" || exit 1

# 3. Unit Tests
run_check "Unit Tests (Vitest)" "npm run test" "false" || exit 1

# 4. Format Check (Non-blocking)
run_check "Prettier Code Formatting Check" "npm run format:check" "true"

# 5. Song Validation
run_check "Song Schema & Integrity Validation" "npm run validate-songs" "false" || exit 1

# 6. Catalog Validation
run_check "Song Catalog Quality Validation" "npm run validate-catalog" "false" || exit 1

# 7. Next.js Build
run_check "Next.js Production Build" "npm run build" "false" || exit 1

# 8. Dependency Security Audit
run_check "Dependency Security Audit (Moderate+)" "npm audit --omit=dev --audit-level=moderate" "false" || exit 1

# 9. YouTube Official Link Audit (Optional)
if [ -n "$YOUTUBE_API_KEY" ]; then
    run_check "YouTube Official Link Audit" "node scripts/audit-official-youtube-links.js --strict --limit=500" "false" || exit 1
else
    echo -e "\n${YELLOW}${BOLD}[SKIPPED]${NC} YouTube Official Link Audit skipped (YOUTUBE_API_KEY environment variable is not defined)."
fi

echo -e "\n${BLUE}${BOLD}======================================================================${NC}"
if [ $FAILED -eq 0 ]; then
    if [ $WARN -gt 0 ]; then
        echo -e "${GREEN}${BOLD}🎉 All critical Phomu Local CI Quality Gates passed! (${WARN} non-blocking warnings)${NC}"
    else
        echo -e "${GREEN}${BOLD}🎉 All Phomu Local CI Quality Gates passed flawlessly!${NC}"
    fi
    echo -e "${BLUE}${BOLD}======================================================================${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}❌ Some Phomu Local CI Quality Gates failed. Please fix before pushing.${NC}"
    echo -e "${BLUE}${BOLD}======================================================================${NC}"
    exit 1
fi
