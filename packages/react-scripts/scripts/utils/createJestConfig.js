// @remove-file-on-eject
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const paths = require('../../config/paths');

module.exports = (resolve, rootDir, srcRoots, isEjecting) => {
  // Use this instead of `paths.testsSetup` to avoid putting
  // an absolute filename into configuration after ejecting.
  const setupTestsFile = fs.existsSync(paths.testsSetup)
    ? '<rootDir>/src/setupTests.js'
    : undefined;

  const toRelRootDir = f => '<rootDir>/' + path.relative(rootDir || '', f);
  const toRealpath = f => fs.realpathSync(f);
  const isSymlink = f => fs.lstatSync(f).isSymbolicLink();
  const srcRootsReal = srcRoots.map(toRealpath);
  const isInSrcRoot = realPath => {
    for (let i = 0; i < srcRootsReal.length; i++) {
      if (realPath.startsWith(srcRootsReal[i] + path.sep)) {
        return true;
      }
    }
    return false;
  };
  const appNodeModules = path.join(rootDir || '.', 'node_modules');
  const appLinkedSrcPaths = fs.existsSync(appNodeModules)
    ? fs
        .readdirSync(appNodeModules)
        .map(f => path.join(appNodeModules, f))
        .filter(isSymlink)
        .map(toRealpath)
        .filter(isInSrcRoot)
    : [];
  const testIncDirsRel = [(rootDir || '.') + '/src']
    .concat(appLinkedSrcPaths)
    .map(toRelRootDir);

  // TODO: I don't know if it's safe or not to just use / as path separator
  // in Jest configs. We need help from somebody with Windows to determine this.
  const config = {
    collectCoverageFrom: ['src/**/*.{js,jsx,mjs}'],
    setupFiles: [resolve('config/polyfills.js')],
    setupTestFrameworkScriptFile: setupTestsFile,
    testMatch: testIncDirsRel.reduce(
      (m, srcRoot) =>
        m.concat([
          srcRoot + '/**/__tests__/**/*.{js,jsx,mjs}',
          srcRoot + '/**/?(*.)(spec|test).{js,jsx,mjs}',
        ]),
      []
    ),
    testEnvironment: 'node',
    testURL: 'http://localhost',
    transform: {
      '^.+\\.(js|jsx|mjs)$': isEjecting
        ? '<rootDir>/node_modules/babel-jest'
        : resolve('config/jest/babelTransform.js'),
      '^.+\\.css$': resolve('config/jest/cssTransform.js'),
      '^(?!.*\\.(js|jsx|mjs|css|json)$)': resolve(
        'config/jest/fileTransform.js'
      ),
    },
    // jest doesn't match against realpaths, so pattern matching doesn't work
    // for monorepos with symlinks from node_modules to module source
    // moved pattern matching into babelTransform for now
    // jest 22.0.x does match patterns against realpath so this can probably
    // changed back to pattern matching with jest 22.0.x+
    transformIgnorePatterns: [], //['[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs)$'],
    moduleNameMapper: {
      '^react-native$': 'react-native-web',
    },
    moduleFileExtensions: [
      'web.js',
      'mjs',
      'js',
      'json',
      'web.jsx',
      'jsx',
      'node',
    ],
  };
  if (rootDir) {
    config.rootDir = rootDir;
  }
  if (testIncDirsRel) {
    // where to search for tests
    config.roots = testIncDirsRel;
  }
  const overrides = Object.assign({}, require(paths.appPackageJson).jest);
  const supportedKeys = [
    'collectCoverageFrom',
    'coverageReporters',
    'coverageThreshold',
    'snapshotSerializers',
    'watchPathIgnorePatterns',
  ];
  if (overrides) {
    supportedKeys.forEach(key => {
      if (overrides.hasOwnProperty(key)) {
        config[key] = overrides[key];
        delete overrides[key];
      }
    });
    const unsupportedKeys = Object.keys(overrides);
    if (unsupportedKeys.length) {
      console.error(
        chalk.red(
          'Out of the box, Create React App only supports overriding ' +
            'these Jest options:\n\n' +
            supportedKeys.map(key => chalk.bold('  \u2022 ' + key)).join('\n') +
            '.\n\n' +
            'These options in your package.json Jest configuration ' +
            'are not currently supported by Create React App:\n\n' +
            unsupportedKeys
              .map(key => chalk.bold('  \u2022 ' + key))
              .join('\n') +
            '\n\nIf you wish to override other Jest options, you need to ' +
            'eject from the default setup. You can do so by running ' +
            chalk.bold('npm run eject') +
            ' but remember that this is a one-way operation. ' +
            'You may also file an issue with Create React App to discuss ' +
            'supporting more options out of the box.\n'
        )
      );
      process.exit(1);
    }
  }
  // temp fix until JEST 22.0.0+ with realpath matching arrives
  // after ejecting, we can't filter using our custom babelTransform
  // ... with below, monorepo source won't transpile, so monorepos won't work
  // after ejecting
  if (isEjecting) {
    config.transformIgnorePatterns = [
      '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs)$',
    ];
  }
  return config;
};
