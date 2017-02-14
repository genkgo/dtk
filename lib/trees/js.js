"use strict";

let fs = require('fs');
let concat = require('broccoli-concat');
let source = require('broccoli-source');
let uglify = require('broccoli-uglify-sourcemap');
let funnel = require('broccoli-funnel');
let mergeTrees = require('broccoli-merge-trees');

let defaultAmdModule = require('../default-amd-module');
let Transpiler = require('../esnext-transpiler');
let npmMainFiles = require('../npm-main');
let shimAmd = require('../shim-amd');

module.exports = function (environmentOptions, buildOptions, amdModules, vendorFiles) {

  let vendorJsFiles = vendorFiles['js'];
  let fileToAmdMap = vendorFiles['jsAmdMap'];

  vendorJsFiles.unshift('modernizr.js');
  fileToAmdMap['modernizr.js'] = 'modernizr';

  let vendorJavascripts = (files) => {
    for (let moduleName of Object.keys(files)) {
      if (!amdModules[moduleName]) {
        amdModules[moduleName] = defaultAmdModule(moduleName);
      }

      amdModules[moduleName]['name'] = moduleName + '/index';
      if (!amdModules[moduleName]['exclude']) {
        if (amdModules[moduleName]['main'] !== '') {
          files[moduleName] = amdModules[moduleName]['main'].map((mainFile) => {
            return process.cwd() + '/node_modules/' + moduleName + '/' + mainFile;
          });
        }

        for (let file of files[moduleName]) {
          let relativeFile = file.replace(process.cwd() + '/node_modules/', '');
          vendorJsFiles.push(relativeFile);
          fileToAmdMap[relativeFile] = moduleName;
        }
      }
    }
  };

  let files = npmMainFiles();
  Object.keys(files).map(key => {
    files[key] = files[key].filter((file) => {
      return new RegExp('\\.js$').test(file);
    }).filter((file) => {
      return fs.existsSync(process.cwd() + file.substring(1));
    }).map((file) => {
      return fs.realpathSync(process.cwd() + file.substring(1));
    });
  });

  vendorJavascripts(files);

  let vendorJs = funnel(new source.UnwatchedDir(environmentOptions['baseDir'] + '/node_modules'), {
    'files': vendorJsFiles
  });

  let appJs = new Transpiler(environmentOptions['baseDir'] + '/app/assets/js', environmentOptions['name']);

  let loader = funnel(new source.UnwatchedDir(__dirname + '/../../node_modules/loader.js/lib/loader'), {
    files: ['loader.js']
  });

  let promise = funnel(new source.UnwatchedDir(__dirname + '/../../node_modules/promise-polyfill'), {
    files: ['promise.js']
  });

  appJs = concat(mergeTrees([appJs, shimAmd(vendorJs, amdModules, fileToAmdMap), loader, promise]), {
    inputFiles: ['**/*.js'],
    outputFile: 'js/scripts.js',
    header: ";(function() {",
    headerFiles: ['loader.js', 'promise.js'],
    footer: "require(['" + environmentOptions['name'] + "/index'])['default'](" + JSON.stringify(environmentOptions) + ");}());",
  });

  if (environmentOptions['environment'] === 'production') {
    appJs = uglify(appJs, {
      sourceMapIncludeSources: false,
      sourceMapConfig: {
        'enabled': false
      }
    });
  }

  return appJs;
};