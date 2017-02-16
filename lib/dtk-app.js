'use strict';

let fs = require('fs');
let funnel = require('broccoli-funnel');
let source = require('broccoli-source');
let mergeTrees = require('broccoli-merge-trees');
let merge = require('lodash.merge');
let modernizr = require('modernizr');
let crypto = require('crypto');

let defaultAmdModule = require('./default-amd-module');
let vendor = require('./vendor');
let appJsTree = require('./trees/js');
let appCssTree = require('./trees/css');
let assetsTree = require('./trees/assets');
let buildXsl = require('./build-xsl');

let projectName = process.cwd().split('/').pop();

module.exports = DtkApp;

DtkApp.prototype = Object.create({});
DtkApp.prototype.constructor = DtkApp;

function DtkApp(buildOptions) {
  this.buildOptions = merge({
    'modernizr': require('./modernizr'),
    'npm': {},
    'scss': 'site/screen.scss',
    'hash': crypto.randomBytes(5).toString('hex')
  }, buildOptions);
}

DtkApp.prototype.build = function (requestedEnvironmentOptions) {

  let environmentOptions = merge({
    'name': projectName,
    'modulesDir': process.cwd() + '/node_modules',
    'baseDir': process.cwd(),
  }, requestedEnvironmentOptions);

  let amdModules = {
    'modernizr': merge(
      defaultAmdModule('modernizr'),
      {'return': 'Modernizr'}
    )
  };

  if (this.buildOptions['npm']) {
    for (let module of Object.keys(this.buildOptions['npm'])) {
      amdModules[module] = merge(
        defaultAmdModule(module),
        this.buildOptions['npm'][module]
      );
    }
  }

  modernizr.build(this.buildOptions['modernizr'], (result) => {
    fs.writeFileSync(environmentOptions['modulesDir'] + '/modernizr.js', result, {encoding: 'utf8'});
  });

  let templates = new source.WatchedDir(environmentOptions['baseDir'] + '/app/templates');
  let vendorFiles = vendor(amdModules);

  if (environmentOptions['environment'] === 'production') {
    buildXsl(environmentOptions['baseDir'] + '/app/templates/build.xsl', this.buildOptions['hash']);
  }

  let appJs = appJsTree(environmentOptions, this.buildOptions, vendorFiles, amdModules);
  let appCss = appCssTree(environmentOptions, this.buildOptions, vendorFiles);
  let assets = assetsTree(environmentOptions, this.buildOptions, vendorFiles);

  return mergeTrees([appJs, appCss, assets, templates]);
};