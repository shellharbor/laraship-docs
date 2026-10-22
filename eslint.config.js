import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'tmp', 'ai-kit', '.agents', '.claude', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  // These validators deliberately detect/reject ASCII controls; the upstream test strips ANSI output.
  { files: ['src/domain/shellQuote.ts', 'src/domain/validate.ts', 'tests/upstream.test.ts'], rules: { 'no-control-regex': 'off' } },
  { files: ['src/**/*.{ts,tsx}'], plugins: { 'react-hooks': hooks }, rules: hooks.configs.recommended.rules },
);
