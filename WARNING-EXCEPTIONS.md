# WARNING-EXCEPTIONS.md

Surviving warnings live here per Build Prompt §1 (never as inline suppressions).
Format per warning: ID, root cause, impact + evidence, why safe, review expiry
no later than the next release. Sensitive-domain warnings additionally need
written Owner/Co-Founder approval logged below.

## Active exceptions

(none — Phase 0 scaffold is warning-free: `eslint . --max-warnings 0` exits 0
in both repos as of 2026-09-25.)

## Informational (not warnings — recorded so reviewers do not chase them)

- I-01 pnpm peer warning: `vitest 5.0.1` wants `@types/node ^22.0.0 || >=24.0.0`,
  scaffold pins `20.19.43`. Package-install noise only; install exits 0 and no
  lint/test gate reads it. Revisit when vitest or node-types majors move.
- I-02 pnpm deprecation notice: `eslint 9.39.5` flagged "no longer supported"
  by the registry at install time; install exits 0, lint exits 0. Pinned
  deliberately (eslint-config-next 16.3.6 peer range); upgrade only as a
  reviewed task per dependency control.
