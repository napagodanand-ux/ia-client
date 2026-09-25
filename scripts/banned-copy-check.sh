#!/usr/bin/env bash
# Banned-copy gate (draft). Exit 1 on match (CI FAIL), 0 when clean (CI PASS).
# Prefers rg per BANNED-COPY-TOKENS.md; falls back to grep -rni when rg is absent.
set -u
if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <literals-file> <scope> [<scope>...]" >&2
  echo "Refusing to default scope to '.' — that would self-match fixtures/banned-bad.txt forever. Pass explicit scope." >&2
  exit 2
fi
LITERALS="$1"
shift
SCOPE=("$@")
if command -v rg >/dev/null 2>&1; then
  rg -in -f "$LITERALS" "${SCOPE[@]}"
  rc=$?
  if [ $rc -eq 0 ]; then echo "BANNED-COPY: match found (CI FAIL)"; exit 1; fi
  if [ $rc -eq 1 ]; then echo "BANNED-COPY: clean (CI PASS)"; exit 0; fi
  echo "BANNED-COPY: rg error rc=$rc"; exit 2
else
  grep -rni -f "$LITERALS" "${SCOPE[@]}"
  rc=$?
  if [ $rc -eq 0 ]; then echo "BANNED-COPY: match found (CI FAIL)"; exit 1; fi
  if [ $rc -eq 1 ]; then echo "BANNED-COPY: clean (CI PASS)"; exit 0; fi
  echo "BANNED-COPY: grep error rc=$rc"; exit 2
fi
