module.exports = {
  extends: [
    'airbnb',
  ],
  plugins: [
    'react'
  ],
  env: {
    browser: true,
    node: true
  },
  rules: {
    'no-console': 'off',
    'class-methods-use-this': 'off',
    'jsx-a11y/no-autofocus': 'off',
    'jsx-a11y/media-has-caption': 'off',
    'semi': 2,
    'comma-dangle': ['error', 'always-multiline', { functions: 'never' }],
  },
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
        jsx: true
    }
  }
};
