#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote (web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install npm dependencies (htmlhint for HTML linting)
cd "${CLAUDE_PROJECT_DIR}"
npm install
