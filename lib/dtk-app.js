'use strict';

let fs = require('fs');
let funnel = require('broccoli-funnel');
let source = require('broccoli-source');
let stew = require('broccoli-stew');
let mergeTrees = require('broccoli-merge-trees');
let merge = require('lodash.merge');
let crypto = require('crypto');

let defaultAmdModule = require('./default-amd-module');
let vendor = require('./vendor');
let appJsTree = require('./trees/js');
let appCssTree = require('./trees/css');
let assetsTree = require('./trees/assets');
let faviconTree = require('./trees/favicon');
let buildXsl = require('./build-xsl');

let projectName = process.cwd().split('/').pop();

module.exports = DtkApp;

DtkApp.prototype = Object.create({});
DtkApp.prototype.constructor = DtkApp;

function DtkApp(buildOptions) {
  this.buildOptions = merge({
    'modernizr': require('./modernizr'),
    'npm': {},
    'scss': {'compile': ['site/screen.scss'], 'include': []},
    'hash': crypto.randomBytes(5).toString('hex')
  }, buildOptions);
}

DtkApp.prototype.build = function (requestedEnvironmentOptions) {

  let environmentOptions = merge({
    'name': projectName,
    'modulesDir': process.cwd() + '/node_modules',
    'baseDir': process.cwd(),
  }, requestedEnvironmentOptions);

  let amdModules = {};

  if (this.buildOptions['npm']) {
    for (let module of Object.keys(this.buildOptions['npm'])) {
      amdModules[module] = merge(
        defaultAmdModule(module),
        this.buildOptions['npm'][module]
      );
    }
  }

  let templates = funnel(environmentOptions['baseDir'] + '/app/templates', {
    exclude: ['**/*']
  });

  let vendorFiles = vendor(amdModules);

  if (environmentOptions['environment'] === 'production') {
    buildXsl(environmentOptions['baseDir'] + '/app/templates/build.xsl', this.buildOptions['hash']);
  }

  let trees = [];
  trees.push(appJsTree(environmentOptions, this.buildOptions, vendorFiles, amdModules));
  trees.push(appCssTree(environmentOptions, this.buildOptions, vendorFiles));
  trees.push(assetsTree(environmentOptions, this.buildOptions, vendorFiles));

  try {
    trees.push(faviconTree(environmentOptions, this.buildOptions, vendorFiles));
  } catch (e) {
  }

  return mergeTrees(trees);
};