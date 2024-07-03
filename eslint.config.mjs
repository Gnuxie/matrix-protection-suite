// SPDX-FileCopyrightText: 2024 Gnuxie <Gnuxie@protonmail.com>
//
// SPDX-License-Identifier: CC0-1.0


import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import tsplugin from "@typescript-eslint/eslint-plugin";

// this configuration file stilli includes random shite from these directories
// and I do not understand why. It is one of the most frustraiting things
// my guess is that there is some hidden ambient config that is included
// full of eslint defaults that we can't intercept??
// I don't know, but it's one of the most frustraiting things ever.
const ignores = ['**/docs/**', '**/.husky/**', '**/coverage/**', '**/dist/**'];

export default tseslint.config(
  {
    // This is a typescript-eslint configurartion for typescript files.
    // This will not work against js files.
    files: [
      "src/**/*.ts",
      "src/**/*.tsx"
    ],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
      },
    },
    // This is needed in order to specify the desired behavior for its rules
    plugins: {
      '@typescript-eslint': tsplugin,
    },
    rules: {
      // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
      // e.g. "@typescript-eslint/explicit-function-return-type": "off",
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // we implement a lot of interfaces that return promises with synchronous functions.
      "require-await": "off",
      "@typescript-eslint/require-await": "off",
      // we need never because our code can be wrong!
      "@typescript-eslint/restrict-template-expressions": ['error', { allowNever: true }],
    },
    ignores: [...ignores, '**/*.js', '**/*.jsx'],
  }
);
