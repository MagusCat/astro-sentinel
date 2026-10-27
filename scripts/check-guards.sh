#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Regression gate: every server action that talks to the database must go
# through requireRole(). This keeps the "no unauthenticated server action"
# invariant (finding C3) from silently regressing.
#
# Allowlist:
#   - features/auth/actions.ts   → the authentication entry point itself
#   - features/health/actions.ts → deliberately public liveness probe
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."

ALLOWLIST=(
  "src/features/auth/actions.ts"
  "src/features/health/actions.ts"
)

fail=0

# All files that declare a server action.
while IFS= read -r file; do
  skip=0
  for allowed in "${ALLOWLIST[@]}"; do
    [[ "$file" == "$allowed" ]] && skip=1 && break
  done
  [[ $skip -eq 1 ]] && continue

  if ! grep -q "requireRole" "$file"; then
    echo "✗ $file declares 'use server' but never calls requireRole()"
    fail=1
  fi
done < <(grep -rlE "^[[:space:]]*['\"]use server['\"]" src/features --include='*.ts')

if [[ $fail -eq 0 ]]; then
  echo "✓ All server actions are guarded by requireRole()"
fi

exit $fail
