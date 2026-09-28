#!/usr/bin/env bash
# Bundle/secret gate (two-tier, real gate — runs against production `.next`
# output after `next build`, wired in CI).
#
# Tier 1 — VALUES (fail on any match, whole tree incl maps): live secret
# material must never reach build output, server or client.
# Tier 2 — NAMES on the BROWSER-SHIPPED surface only (.next/static, maps
# included): server-only identifiers must not reach bytes the browser can
# fetch. Server chunks (.next/server) legitimately name server identifiers
# (e.g. env-var names in server-only error paths such as the service_role
# admin client) — those chunks never ship to browsers, and any VALUE there
# still fails Tier-1. Evidence: phase0-step4 CI parity record + Tier-2
# rescope note (SUPABASE_SERVICE_ROLE_KEY name in server chunk, zero names
# and zero values in .next/static).
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
# Tier-2 targets the browser surface: prefer <scope>/static when present.
TIER2=()
for d in "${SCOPE[@]}"; do
  if [ -d "$d/static" ]; then
    TIER2+=("$d/static")
  else
    TIER2+=("$d")
  fi
done
if command -v rg >/dev/null 2>&1; then
  rg -i "$VALUE_PATTERN" "${SCOPE[@]}"
  rc=$?
  if [ $rc -eq 0 ]; then echo "BUNDLE-GREP-VALUES: match found (CI FAIL)"; exit 1; fi
  if [ $rc -ne 1 ]; then echo "BUNDLE-GREP-VALUES: scanner error rc=$rc (CI FAIL)"; exit 2; fi
  rg -i "$NAME_PATTERN" "${TIER2[@]}"
  rc=$?
  if [ $rc -eq 0 ]; then echo "BUNDLE-GREP-NAMES: match found (CI FAIL)"; exit 1; fi
  if [ $rc -ne 1 ]; then echo "BUNDLE-GREP-NAMES: scanner error rc=$rc (CI FAIL)"; exit 2; fi
else
  grep -rniE "$VALUE_PATTERN" "${SCOPE[@]}" 2>/dev/null
  rc=$?
  if [ $rc -eq 0 ]; then echo "BUNDLE-GREP-VALUES: match found (CI FAIL)"; exit 1; fi
  if [ $rc -ne 1 ]; then echo "BUNDLE-GREP-VALUES: scanner error rc=$rc (CI FAIL)"; exit 2; fi
  grep -rniE "$NAME_PATTERN" "${TIER2[@]}" 2>/dev/null
  rc=$?
  if [ $rc -eq 0 ]; then echo "BUNDLE-GREP-NAMES: match found (CI FAIL)"; exit 1; fi
  if [ $rc -ne 1 ]; then echo "BUNDLE-GREP-NAMES: scanner error rc=$rc (CI FAIL)"; exit 2; fi
fi
echo "BUNDLE-GREP: clean (CI PASS)"
exit 0
