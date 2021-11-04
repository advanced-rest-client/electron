/* eslint-disable import/no-commonjs */
module.exports = {
  extends: [
    'eslint:recommended',
    require.resolve('eslint-config-google'),
  ],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2021,
    requireConfigFile: false,
  },
  env: {
    browser: false,
    mocha: true,
    node: true,
    es2021: true,
  },
  extends: [
    'eslint-config-prettier'
  ],
  plugins: [
    '@babel',
    'no-only-tests',
    'import',
  ],
  parser: '@babel/eslint-parser',
  rules: {
    'arrow-parens': [
      'error',
      'always',
      {
        'requireForBlockBody': true,
      },
    ],
    'lines-between-class-members': 'error',
    'no-underscore-dangle': 'off',
    'import/no-namespace': 'off',
    'no-only-tests/no-only-tests': 'error',
    'import/extensions': [
      'error',
      'always',
      {
        ignorePackages: true,
      },
    ],
    'import/prefer-default-export': 'off',
    'import/no-nodejs-modules': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        'devDependencies': [
          '**/test/**/*.js',
          '**/*.config.js',
          '**/*.conf.js',
        ],
      },
    ],
    'class-methods-use-this': [
      // this is unnecessary for node apps.
      'off',
      {
        'exceptMethods': [],
      },
    ],
    'no-undef': 'error',
    'require-jsdoc': ['warn', {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true,
        ArrowFunctionExpression: true,
        FunctionExpression: true,
      },
    }],
    'comma-dangle': 'off',
    'new-cap': [
      'error',
      {
        properties: false,
        capIsNew: false,
      },
    ],
    'max-len': 'off',
    'object-curly-spacing': [
      'error',
      'always',
    ],
    'no-console': [
      'error',
    ],
    'no-unused-expressions': 'error',
    'prefer-template': 'error',
    'no-return-await': 'error',
    'no-template-curly-in-string': 'error',
    'indent': [
      'error',
      2,
      {
        SwitchCase: 1,
        VariableDeclarator: 1,
        outerIIFEBody: 0,
        MemberExpression: 0,
      },
    ],
    'no-shadow': [
      'error',
      {
        builtinGlobals: true,
      },
    ],
  },

  overrides: [
    {
      files: [
        'renderer/**/*.js',
      ],
      env: {
        browser: true,
      },
    },
    {
      files: [
        'test/**/*.js',
        'test/**/*.mjs',
      ],
      rules: {
        'import/no-commonjs': 'off',
        'require-jsdoc': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
};
