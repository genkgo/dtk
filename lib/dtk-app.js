'use strict';

let fs = require('fs');
let funnel = require('broccoli-funnel');
let mergeTrees = require('broccoli-merge-trees');
let merge = require('lodash.merge');
let modernizr = require('modernizr');

let defaultAmdModule = require('./default-amd-module');
let vendor = require('./vendor');
let appJsTree = require('./trees/js');
let appCssTree = require('./trees/css');
let assetsTree = require('./trees/assets');

let projectName = process.cwd().split('/').pop();

module.exports = DtkApp;

DtkApp.prototype = Object.create({});
DtkApp.prototype.constructor = DtkApp;

function DtkApp(buildOptions) {
  this.buildOptions = merge({
    'modernizr': require('./modernizr'),
    'npm': {},
    'scss': 'site/screen.scss'
  }, buildOptions);
}

DtkApp.prototype.build = function (environmentOptions) {

  environmentOptions['name'] = projectName;
  environmentOptions['baseDir'] = process.cwd();

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
    fs.writeFileSync(environmentOptions['baseDir'] + '/node_modules/modernizr.js', result, {encoding: 'utf8'});
  });

  let templates = funnel(environmentOptions['baseDir'] + '/app/templates', {
    exclude: ['**/*']
  });

  let vendorFiles = vendor(amdModules);

  let appJs = appJsTree(environmentOptions, this.buildOptions, amdModules, vendorFiles['js']);
  let appCss = appCssTree(environmentOptions, this.buildOptions, vendorFiles['css'], vendorFiles['css-filter']);
  let assets = assetsTree(environmentOptions, this.buildOptions, vendorFiles['images']);

  return mergeTrees([appJs, appCss, assets, templates]);
};