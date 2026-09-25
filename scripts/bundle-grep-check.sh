#!/usr/bin/env bash
# Bundle/secret gate sketch (draft, step 2). Fails if server-only strings reach client output.
# Scope once builds exist: per-repo bundle dirs + source maps + env dumps. No suppression.
set -u
SCOPE=("$@")
if [ "${#SCOPE[@]}" -eq 0 ]; then SCOPE=("dist" ".next/static" "out"); fi
PATTERN='service_role|SUPABASE_SERVICE_ROLE|STRIPE_SECRET|sk_live_|sk_test_|BEGIN (RSA )?PRIVATE KEY|POSTGRES_URL|DATABASE_URL'
if command -v rg >/dev/null 2>&1; then
  rg -in "$PATTERN" "${SCOPE[@]}"
  rc=$?
else
  grep -rniE "$PATTERN" "${SCOPE[@]}" 2>/dev/null
  rc=$?
fi
if [ $rc -eq 0 ]; then echo "BUNDLE-GREP: match found (CI FAIL)"; exit 1; fi
if [ $rc -eq 1 ]; then echo "BUNDLE-GREP: clean (CI PASS)"; exit 0; fi
echo "BUNDLE-GREP: scanner error rc=$rc"; exit 2
