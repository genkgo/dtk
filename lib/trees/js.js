"use strict";

let fs = require('fs');
let concat = require('broccoli-concat');
let source = require('broccoli-source');
let uglify = require('broccoli-uglify-sourcemap');
let funnel = require('broccoli-funnel');
let mergeTrees = require('broccoli-merge-trees');
let lint = require('broccoli-lint-eslint');

let defaultAmdModule = require('../default-amd-module');
let Transpiler = require('../esnext-transpiler');
let npmMainFiles = require('../npm-main');
let shimAmd = require('../shim-amd');

module.exports = function (environmentOptions, buildOptions, vendorFiles, amdModules) {

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
            return environmentOptions['modulesDir'] + '/' + moduleName + '/' + mainFile;
          });
        }

        for (let file of files[moduleName]) {
          let relativeFile = file.replace(environmentOptions['modulesDir'] + '/', '');
          vendorJsFiles.push(relativeFile);
          fileToAmdMap[relativeFile] = moduleName;
        }
      }
    }
  };

  let files = npmMainFiles(environmentOptions['baseDir'] + '/package.json');
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

  let vendorJsUntranspiled = funnel(new source.UnwatchedDir(environmentOptions['modulesDir']), {
    'files': vendorJsFiles.filter((file) => {
      return !amdModules[fileToAmdMap[file]]['transpile'];
    })
  });

  let vendorJsTranspiled = new Transpiler.Vendor(
    funnel(new source.UnwatchedDir(environmentOptions['modulesDir']), {
      'files': vendorJsFiles.filter((file) => {
        return amdModules[fileToAmdMap[file]]['transpile'];
      })
    })
  );

  let rcfile = environmentOptions['baseDir'] + '/.eslintrc.js';
  if (!fs.existsSync(rcfile)) {
    rcfile = __dirname + '/../../.eslintrc.js';
  }

  let appJs = lint(environmentOptions['baseDir'] + '/app/assets/js', {
    options: {
      configFile: rcfile
    }
  });

  let loader = funnel(new source.UnwatchedDir(environmentOptions['modulesDir'] + '/loader.js/lib/loader'), {
    files: ['loader.js']
  });

  let promise = funnel(new source.UnwatchedDir(environmentOptions['modulesDir'] + '/promise-polyfill'), {
    files: ['promise.js']
  });

  appJs = new Transpiler.Local(appJs, environmentOptions['name']);

  let concatJs = concat(mergeTrees([
    appJs,
    shimAmd(vendorJsUntranspiled, amdModules, fileToAmdMap),
    shimAmd(vendorJsTranspiled, amdModules, fileToAmdMap),
    loader,
    promise
  ]), {
    inputFiles: ['**/*.js'],
    outputFile: environmentOptions['environment'] === 'development' ? 'js/scripts.js' : 'js/' + buildOptions['hash'] + '-scripts.js',
    header: ";(function() {",
    headerFiles: ['loader.js', 'promise.js'],
    footer: "require(['" + environmentOptions['name'] + "/index'])['default'](" + JSON.stringify(environmentOptions) + ");}());",
  });

  if (environmentOptions['environment'] === 'production') {
    concatJs = uglify(concatJs, {
      sourceMapIncludeSources: false,
      sourceMapConfig: {
        'enabled': false
      }
    });
  }

  return concatJs;
};