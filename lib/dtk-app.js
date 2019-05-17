'use strict';

let fs = require('fs');
let funnel = require('broccoli-funnel');
let source = require('broccoli-source');
let stew = require('broccoli-stew');
let mergeTrees = require('broccoli-merge-trees');
let merge = require('lodash.merge');
let crypto = require('crypto');
let path = require('path');

let defaultAmdModule = require('./default-amd-module');
let vendor = require('./vendor');
let appJsTree = require('./trees/js');
let appCssTree = require('./trees/css');
let assetsTree = require('./trees/assets');
let copyTree = require('./trees/copy');
let buildXsl = require('./build-xsl');

let projectName = process.cwd().split(path.sep).pop();

module.exports = DtkApp;

DtkApp.prototype = Object.create({});
DtkApp.prototype.constructor = DtkApp;

function DtkApp(buildOptions) {
  this.buildOptions = merge({
    'modernizr': require('./modernizr'),
    'npm': {},
    'scss': {'compile': ['site/screen.scss'], 'include': []},
    'js': {
      'directory': '/app/assets/js',
      'apps': [{ 'entrypoint': 'index', 'concat-script': 'js/scripts.js'}],
      'includeDefaults': ['modernizr', 'babelPolyfill', 'loader'],
      'splitVendor': false,
    },
    'hash': crypto.randomBytes(5).toString('hex'),
    'copy': ['favicon', 'fonts']
  }, buildOptions);
}

DtkApp.prototype.build = function (requestedEnvironmentOptions) {
  if (typeof this.buildOptions.outputDir === 'function') {
    requestedEnvironmentOptions.outputDir = this.buildOptions.outputDir(requestedEnvironmentOptions);
  }

  let environmentOptions = merge({
    'name': projectName,
    'modulesDir': path.join(process.cwd(), 'node_modules'),
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
  trees.push(copyTree(environmentOptions, this.buildOptions, vendorFiles));

  return mergeTrees(trees);
};