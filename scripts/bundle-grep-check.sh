#!/usr/bin/env bash
# Bundle/secret gate (two-tier, real gate — runs against production `.next`
# output after `next build`, wired in CI).
#
# Tier 1 — VALUES (fail on any match, maps included): live secret material
# must never reach build output. Tier 2 — NAMES on non-map files: server-only
# identifiers must not appear in shipped code. Source maps (*.map) are
# excluded from Tier 2 only: they carry third-party JSDoc text (e.g.
# supabase-js "Never expose your `service_role` key in the browser"),
# proven scanner-pattern class with zero secret values — Tier 1 still scans
# maps, so the leak surface stays covered. Evidence: phase0-step4 CI parity
# record (pristine-build scans, both repos, both tiers clean).
#
# Fail-closed: missing scope dir or scanner error exits 2 (CI FAIL).
set -u
SCOPE=("$@")
if [ "${#SCOPE[@]}" -eq 0 ]; then SCOPE=(".next"); fi
for d in "${SCOPE[@]}"; do
  if [ ! -e "$d" ]; then
    echo "BUNDLE-GREP: missing scope $d (CI FAIL)" >&2
    exit 2
  fi
done
VALUE_PATTERN='sk_(live|test)_[A-Za-z0-9]{8,}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|://[^/\s:]+:[^/\s@]+@'
NAME_PATTERN='service_role|SUPABASE_SERVICE_ROLE|STRIPE_SECRET|sk_live_|sk_test_|BEGIN (RSA )?PRIVATE KEY|POSTGRES_URL|DATABASE_URL'
if command -v rg >/dev/null 2>&1; then
  rg -i "$VALUE_PATTERN" "${SCOPE[@]}"
  rc=$?
  if [ $rc -eq 0 ]; then echo "BUNDLE-GREP-VALUES: match found (CI FAIL)"; exit 1; fi
  if [ $rc -ne 1 ]; then echo "BUNDLE-GREP-VALUES: scanner error rc=$rc (CI FAIL)"; exit 2; fi
  rg -i -g '!*.map' "$NAME_PATTERN" "${SCOPE[@]}"
  rc=$?
  if [ $rc -eq 0 ]; then echo "BUNDLE-GREP-NAMES: match found (CI FAIL)"; exit 1; fi
  if [ $rc -ne 1 ]; then echo "BUNDLE-GREP-NAMES: scanner error rc=$rc (CI FAIL)"; exit 2; fi
else
  grep -rniE "$VALUE_PATTERN" "${SCOPE[@]}" 2>/dev/null
  rc=$?
  if [ $rc -eq 0 ]; then echo "BUNDLE-GREP-VALUES: match found (CI FAIL)"; exit 1; fi
  if [ $rc -ne 1 ]; then echo "BUNDLE-GREP-VALUES: scanner error rc=$rc (CI FAIL)"; exit 2; fi
  grep -rniE --exclude='*.map' "$NAME_PATTERN" "${SCOPE[@]}" 2>/dev/null
  rc=$?
  if [ $rc -eq 0 ]; then echo "BUNDLE-GREP-NAMES: match found (CI FAIL)"; exit 1; fi
  if [ $rc -ne 1 ]; then echo "BUNDLE-GREP-NAMES: scanner error rc=$rc (CI FAIL)"; exit 2; fi
fi
echo "BUNDLE-GREP: clean (CI PASS)"
exit 0
