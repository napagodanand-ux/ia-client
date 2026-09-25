// Step-2 draft — flat config sketch. Enforcement is via CLI `--max-warnings 0`.
// No inline suppressions allowed (spec §1). Exceptions live in WARNING-EXCEPTIONS.md, never as eslint-disable.
import next from "eslint-config-next";

const config = [
  ...next,
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
];

export default config;
