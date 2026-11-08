import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const HEX_COLOR = String.raw`/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/`;

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      'storybook-static',
      'playwright-report',
      'test-results',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    ...jsxA11y.flatConfigs.recommended,
    languageOptions: {
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      globals: { ...globals.browser },
    },
    plugins: { ...jsxA11y.flatConfigs.recommended.plugins, 'react-hooks': reactHooks },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // 대화상자의 초기 포커스 지정(WAI-ARIA Dialog 패턴)은 허용. 일반 DOM 요소의 autoFocus 는 계속 금지.
      'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // 색상은 theme 패키지의 토큰으로만 정의한다. 화면/컴포넌트 코드에서 hex 하드코딩 금지.
    files: ['apps/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${HEX_COLOR}]`,
          message: '색상을 하드코딩하지 말고 theme.palette 토큰을 사용하세요 (@clinic/theme).',
        },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}', 'e2e/**/*.ts', '.storybook/**/*.{ts,tsx}', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // 성능 측정 스크립트는 page.evaluate 안에서 브라우저 코드를 실행한다
    files: ['scripts/bench/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
