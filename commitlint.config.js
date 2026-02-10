module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'trading',
        'settlement',
        'database',
        'api-gateway',
        'institution',
        'asset',
        'compliance',
        'blockchain',
        'frontend',
        'config',
        'deps',
        'ci',
        'session',
      ],
    ],
    'header-max-length': [2, 'always', 72],
  },
};
