// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @remove-on-eject-end
'use strict';

const path = require('path');
const fs = require('fs');
const url = require('url');
const findMonorepo = require('react-dev-utils/workspaceUtils').findMonorepo;

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const envPublicUrl = process.env.PUBLIC_URL;

function ensureSlash(inputPath, needsSlash) {
  const hasSlash = inputPath.endsWith('/');
  if (hasSlash && !needsSlash) {
    return inputPath.substr(0, inputPath.length - 1);
  } else if (!hasSlash && needsSlash) {
    return `${inputPath}/`;
  } else {
    return inputPath;
  }
}

const getPublicUrl = appPackageJson =>
  envPublicUrl || require(appPackageJson).homepage;

// We use `PUBLIC_URL` environment variable or "homepage" field to infer
// "public path" at which the app is served.
// Webpack needs to know it to put the right <script> hrefs into HTML even in
// single-page apps that may serve index.html for nested URLs like /todos/42.
// We can't use a relative path in HTML because we don't want to load something
// like /todos/42/static/js/bundle.7289d.js. We have to know the root.
function getServedPath(appPackageJson) {
  const publicUrl = getPublicUrl(appPackageJson);
  const servedUrl =
    envPublicUrl || (publicUrl ? url.parse(publicUrl).pathname : '/');
  return ensureSlash(servedUrl, true);
}

const defaultTargOpts = {
  appBuild: 'build',
  appHtml: 'index.html',
  appIndexJs: 'index.js',
  jsExts: [],
};

const getPathOpts = appPackageJson => {
  console.error('get path opts for: ', appPackageJson);
  const appPackage = require(appPackageJson);
  const target = process.env.TARGET;
  let targOpts = defaultTargOpts;

  if (target) {
    targOpts = appPackage.targets && appPackage.targets[target];
    if (!targOpts) {
      throw new Error(`Target ${target} not defined in package.json`);
    }
    targOpts = Object.assign({}, defaultTargOpts, targOpts);
    targOpts.appBuild = `${defaultTargOpts.appBuild}_${target}`;
  }

  return {
    appBuild: targOpts.appBuild,
    appHtml: path.join('public', targOpts.appHtml),
    appIndexJs: path.join('src', targOpts.appIndexJs),
    jsExts: targOpts.jsExts,
  };
};

//const appPackageJson = resolveApp('package.json');
let pathOpts = getPathOpts(resolveApp('package.json'));
console.error('Path opts: ', pathOpts);

// config after eject: we're in ./config/
module.exports = {
  dotenv: resolveApp('.env'),
  appPath: resolveApp('.'),
  appBuild: resolveApp(pathOpts.appBuild),
  appPublic: resolveApp('public'),
  appHtml: resolveApp(pathOpts.appHtml),
  appIndexJs: resolveApp(pathOpts.appIndexJs),
  appPackageJson: resolveApp('package.json'),
  appSrc: resolveApp('src'),
  jsExts: pathOpts.jsExts,
  testsSetup: resolveApp('src/setupTests.js'),
  proxySetup: resolveApp('src/setupProxy.js'),
  appNodeModules: resolveApp('node_modules'),
  publicUrl: getPublicUrl(resolveApp('package.json')),
  servedPath: getServedPath(resolveApp('package.json')),
};

let checkForMonorepo = true;

// @remove-on-eject-begin
const resolveOwn = relativePath => path.resolve(__dirname, '..', relativePath);

// config before eject: we're in ./node_modules/react-scripts/config/
module.exports = {
  dotenv: resolveApp('.env'),
  appPath: resolveApp('.'),
  appBuild: resolveApp(pathOpts.appBuild),
  appPublic: resolveApp('public'),
  appHtml: resolveApp(pathOpts.appHtml),
  appIndexJs: resolveApp(pathOpts.appIndexJs),
  appPackageJson: resolveApp('package.json'),
  appSrc: resolveApp('src'),
  jsExts: pathOpts.jsExts,
  testsSetup: resolveApp('src/setupTests.js'),
  proxySetup: resolveApp('src/setupProxy.js'),
  appNodeModules: resolveApp('node_modules'),
  publicUrl: getPublicUrl(resolveApp('package.json')),
  servedPath: getServedPath(resolveApp('package.json')),
  // These properties only exist before ejecting:
  ownPath: resolveOwn('.'),
  ownNodeModules: resolveOwn('node_modules'), // This is empty on npm 3
};

// detect if template should be used, ie. when cwd is react-scripts itself
const useTemplate =
  appDirectory === fs.realpathSync(path.join(__dirname, '..'));

checkForMonorepo = !useTemplate;

if (useTemplate) {
  module.exports = {
    dotenv: resolveOwn('template/.env'),
    appPath: resolveApp('.'),
    appBuild: resolveOwn('../../' + pathOpts.appBuild),
    appPublic: resolveOwn('template/public'),
    appHtml: resolveOwn('template/' + pathOpts.appHtml),
    appIndexJs: resolveOwn('template/' + pathOpts.appIndexJs),
    appPackageJson: resolveOwn('package.json'),
    appSrc: resolveOwn('template/src'),
    jsExts: pathOpts.jsExts,
    testsSetup: resolveOwn('template/src/setupTests.js'),
    proxySetup: resolveOwn('template/src/setupProxy.js'),
    appNodeModules: resolveOwn('node_modules'),
    publicUrl: getPublicUrl(resolveOwn('package.json')),
    servedPath: getServedPath(resolveOwn('package.json')),
    // These properties only exist before ejecting:
    ownPath: resolveOwn('.'),
    ownNodeModules: resolveOwn('node_modules'),
  };
}
// @remove-on-eject-end

module.exports.srcPaths = [module.exports.appSrc];

module.exports.useYarn = fs.existsSync(
  path.join(module.exports.appPath, 'yarn.lock')
);

if (checkForMonorepo) {
  // if app is in a monorepo (lerna or yarn workspace), treat other packages in
  // the monorepo as if they are app source
  const mono = findMonorepo(appDirectory);
  if (mono.isAppIncluded) {
    Array.prototype.push.apply(module.exports.srcPaths, mono.srcPkgPaths);
    module.exports.isMonorepo = true;
    module.exports.monorepoRoot = mono.rootPath;
  }
  module.exports.useYarn = module.exports.useYarn || mono.isYarnWs;
}
