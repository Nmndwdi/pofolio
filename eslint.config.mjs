import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/*
 * ESLint flat config (eslint.config.mjs).
 *
 * Replaces the legacy .eslintrc.json. ESLint 9 and eslint-config-next 16 both
 * use the flat-config format — the old "extends" string array is gone, and
 * configs are now composed as a flat array of config objects.
 *
 * eslint-config-next exports its shareable configs as flat-config arrays from
 * the /core-web-vitals and /typescript subpaths, so we spread them in.
 *
 * Note: Next 16 deprecated `next lint`. We run ESLint directly via the
 * "lint" script in package.json (`eslint .`).
 */

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Allow intentionally-unused vars/args when prefixed with underscore.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Next 16's ESLint config adds this rule, which flags setState calls
      // inside effects. It over-fires on legitimate debounced-fetch patterns
      // (e.g. our slug-availability hook, where setState runs inside a
      // setTimeout/async callback, not synchronously in the effect body).
      // Downgraded to a warning so genuine cases surface without failing the
      // lint run on correct code.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // Paths ESLint should not lint.
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
