module.exports = {
  extends: [
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:promise/recommended',
  ],
  parserOptions: {
    project: ['./tsconfig.json'],
  },
  plugins: ['promise'],
  ignorePatterns: ['*.js'],
  rules: {
    quotes: 'off',
    '@typescript-eslint/quotes': [
      'error',
      'double',
      {
        avoidEscape: true,
      },
    ],
    'no-restricted-globals': 'off',
    'arrow-body-style': ['error', 'as-needed'],
    'brace-style': ['error', '1tbs'],
    'implicit-arrow-linebreak': 'off',
    'arrow-parens': ['error', 'always'],
    'import/prefer-default-export': 'off',
    'class-methods-use-this': 'off',
    'max-len': ['warn', 200],
    'no-useless-constructor': 'off',
    'object-curly-newline': [
      'error',
      {
        ObjectExpression: { multiline: true },
        ObjectPattern: { multiline: true },
        ImportDeclaration: 'never',
        ExportDeclaration: { multiline: true, minProperties: 3 },
      },
    ],
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      { overrides: { constructors: 'off' } },
    ],
    '@typescript-eslint/no-useless-constructor': 'off',
    '@typescript-eslint/unbound-method': 'warn',
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
    ],
    'no-underscore-dangle': ['error', { allow: ['_embedded'] }],
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'prefer-rest-params': 'off',
    'array-callback-return': ['error', { allowImplicit: true }],
    'array-bracket-spacing': ['error', 'always'],
    'import/no-unresolved': 'off',
    'no-param-reassign': 'warn',
    'no-restricted-syntax': [
      'error',
      {
        selector: 'LabeledStatement',
        message:
          'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message:
          '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
    'promise/always-return': 'off',
    'promise/no-nesting': 'error',
    'promise/no-callback-in-promise': 'error',
  },
};
