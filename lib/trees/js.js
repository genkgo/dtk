"use strict";

let fs = require('fs');
let path = require('path');
let concat = require('broccoli-concat');
let source = require('broccoli-source');
let uglify = require('broccoli-uglify-sourcemap');
let funnel = require('broccoli-funnel');
let mergeTrees = require('broccoli-merge-trees');
let lint = require('broccoli-lint-eslint');
let merge = require('lodash.merge');
let modernizr = require('modernizr');
let temp = require('fs-temp');

let defaultAmdModule = require('../default-amd-module');
let Transpiler = require('../esnext-transpiler');
let npmMainFiles = require('../npm-main');
let shimAmd = require('../shim-amd');

module.exports = function (environmentOptions, buildOptions, vendorFiles, amdModules) {

  let vendorJsFiles = vendorFiles['js'];
  let fileToAmdMap = vendorFiles['jsAmdMap'];

  let vendorJavascripts = (files) => {
    for (let moduleName of Object.keys(files)) {
      if (!amdModules[moduleName]) {
        amdModules[moduleName] = defaultAmdModule(moduleName);
      }

      if (!amdModules[moduleName]['name']) {
        amdModules[moduleName]['name'] = moduleName + '/index';
      }

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

  let modernizrPath = temp.template('dtk-modernizr-%s').mkdirSync();

  fileToAmdMap['modernizr.js'] = 'modernizr';
  amdModules['modernizr'] = merge(
    defaultAmdModule('modernizr'),
    {'factory': {'return': 'Modernizr'}}
  );

  modernizr.build(buildOptions['modernizr'], (result) => {
    fs.writeFileSync(modernizrPath + '/modernizr.js', result, {encoding: 'utf8'});
  });

  let modernizrFile = funnel(new source.UnwatchedDir(modernizrPath), {
    'files': ['modernizr.js']
  });

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

  let loaderFile = require.resolve('loader.js');
  let loader = funnel(new source.UnwatchedDir(path.dirname(loaderFile)), {
    files: [path.basename(loaderFile)]
  });

  let babelPolyfill = funnel(new source.UnwatchedDir(environmentOptions['modulesDir'] + '/babel-polyfill/dist'), {
    files: ['polyfill.js']
  });

  let apps = [];
  for (let app of buildOptions['js']['apps']) {
    let appJs = lint(environmentOptions['baseDir'] + buildOptions['js']['directory'], {
      options: {
        configFile: rcfile
      }
    });

    let concatScript;
    if (environmentOptions['environment'] === 'development') {
      concatScript = app['concat-script'];
    } else {
      concatScript = path.dirname(app['concat-script']) + '/' + buildOptions['hash'] + '-' + path.basename(app['concat-script']);
    }

    appJs = new Transpiler.Local(appJs, environmentOptions['name']);

    let exposedVariables = Object.assign({}, environmentOptions);
    delete exposedVariables['baseDir'];
    delete exposedVariables['modulesDir'];

    let concatJs = concat(mergeTrees([
      appJs,
      shimAmd(modernizrFile, amdModules, fileToAmdMap),
      shimAmd(vendorJsUntranspiled, amdModules, fileToAmdMap),
      shimAmd(vendorJsTranspiled, amdModules, fileToAmdMap),
      loader,
      babelPolyfill
    ]), {
      inputFiles: ['**/*.js'],
      outputFile: concatScript,
      header: ";(function() {",
      headerFiles: ['loader.js', 'polyfill.js'],
      footer: "require(['" + environmentOptions['name'] + "/" + app['entrypoint'] + "'])['default'](" + JSON.stringify(exposedVariables) + ");}());",
    });

    if (environmentOptions['environment'] === 'production') {
      concatJs = uglify(concatJs, {
        sourceMapIncludeSources: false,
        sourceMapConfig: {
          'enabled': false
        }
      });
    }

    apps.push(concatJs);
  }

  return mergeTrees(apps);
};