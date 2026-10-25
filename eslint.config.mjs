import nextVitals from 'eslint-config-next/core-web-vitals';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';

// eslint-config-next v16 exports flat config arrays — direct spread works without FlatCompat.

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: ['.next/**', 'out/**', 'dist/**', 'coverage/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...nextVitals,
  {
    plugins: {
      '@typescript-eslint': tsEslintPlugin,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      // Keep as warn (not off) to align with the project's TypeScript strict goal
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];

export default eslintConfig;
