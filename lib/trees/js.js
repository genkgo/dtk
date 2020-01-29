"use strict";

const fs = require('fs');
const path = require('path');
const concat = require('broccoli-concat');
const source = require('broccoli-source');
const uglify = require('broccoli-uglify-sourcemap');
const funnel = require('broccoli-funnel');
const mergeTrees = require('broccoli-merge-trees');
const ESLint = require('broccoli-lint-eslint');
const merge = require('lodash.merge');
const modernizr = require('modernizr');
const temp = require('fs-temp');

let defaultAmdModule = require('../default-amd-module');
let Transpiler = require('../esnext-transpiler');
let npmMainFiles = require('../npm-main');
let shimAmd = require('../shim-amd');

function newVendorTree(outputFile, scripts, amdModules, fileToAmdMap, trees, entrypoint, isolate) {
  let headerFiles = [];

  if (scripts.modernizr) {
    trees.push(shimAmd(scripts.modernizr, amdModules, fileToAmdMap));
  }

  trees.push(shimAmd(scripts.untranspiled, amdModules, fileToAmdMap));
  trees.push(shimAmd(scripts.transpiled, amdModules, fileToAmdMap));

  if (scripts.loader) {
    trees.push(scripts.loader);
    headerFiles.push('loader.js');
  }

  if (scripts.babelPolyfill) {
    trees.push(scripts.babelPolyfill);
    headerFiles.push('polyfill.js');
  }

  if (scripts.webcomponents) {
    trees.push(scripts.webcomponents);
    headerFiles.push('webcomponents-bundle.js');
  }

  return concat(mergeTrees(trees), {
    inputFiles: ['**/*.js'],
    outputFile: outputFile,
    headerFiles: headerFiles,
    footer: entrypoint,
  });
}

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
            return path.join(environmentOptions['modulesDir'], moduleName, mainFile);
          });
        }

        for (let file of files[moduleName]) {
          let relativeFile = file.replace(environmentOptions['modulesDir'] + path.sep, '').split(path.sep).join('/');
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

  let includeDefaults = buildOptions.js.includeDefaults || [];
  let vendorScripts = {};

  if (includeDefaults.includes('modernizr')) {
    let modernizrPath = temp.template('dtk-modernizr-%s').mkdirSync();

    fileToAmdMap['modernizr.js'] = 'modernizr';
    amdModules['modernizr'] = merge(
      defaultAmdModule('modernizr'),
      {'factory': {'return': 'Modernizr'}}
    );

    modernizr.build(buildOptions['modernizr'], (result) => {
      fs.writeFileSync(modernizrPath + '/modernizr.js', result, {encoding: 'utf8'});
    });

    vendorScripts.modernizr = funnel(new source.UnwatchedDir(modernizrPath), {
      'files': ['modernizr.js']
    });
  }

  if (includeDefaults.includes('loader')) {
    let loaderFile = require.resolve('loader.js');
    vendorScripts.loader = funnel(new source.UnwatchedDir(path.dirname(loaderFile)), {
      files: [path.basename(loaderFile)]
    });
  }

  if (includeDefaults.includes('babelPolyfill')) {
    vendorScripts.babelPolyfill = funnel(new source.UnwatchedDir(environmentOptions['modulesDir'] + '/@babel/polyfill/dist'), {
      files: ['polyfill.js']
    });
  }

  if (fs.existsSync(environmentOptions['modulesDir'] + '/@webcomponents/webcomponentsjs')) {
    vendorScripts.webcomponents = funnel(new source.UnwatchedDir(environmentOptions['modulesDir'] + '/@webcomponents/webcomponentsjs'), {
      files: ['webcomponents-bundle.js', 'webcomponents-bundle.js.map']
    });
  }

  vendorScripts.untranspiled = funnel(new source.UnwatchedDir(environmentOptions['modulesDir']), {
    'files': vendorJsFiles.filter((file) => {
      return !amdModules[fileToAmdMap[file]]['transpile'];
    })
  });

  vendorScripts.transpiled = new Transpiler.Vendor(
    funnel(new source.UnwatchedDir(environmentOptions['modulesDir']), {
      'files': vendorJsFiles.filter((file) => {
        return amdModules[fileToAmdMap[file]]['transpile'];
      })
    }), {
      sourceMaps: false,
      inputSourceMap: false
    }
  );

  let rcfile = environmentOptions['baseDir'] + '/.eslintrc.js';
  if (!fs.existsSync(rcfile)) {
    rcfile = __dirname + '/../../.eslintrc.js';
  }

  let apps = [];
  for (let app of buildOptions['js']['apps']) {
    let appJs = ESLint.create(environmentOptions['baseDir'] + buildOptions['js']['directory'], {
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

    appJs = new Transpiler.Local(appJs, environmentOptions['name'], {
      sourceMaps: false,
      inputSourceMap: false
    });

    let exposedVariables = Object.assign({}, environmentOptions);
    delete exposedVariables['baseDir'];
    delete exposedVariables['modulesDir'];
    delete exposedVariables['outputDir'];

    if (buildOptions.js.splitVendor) {
      let concatJs = concat(mergeTrees([
        appJs,
      ]), {
        inputFiles: ['**/*.js'],
        outputFile: concatScript,
        footer: "require(['" + environmentOptions['name'] + "/" + app['entrypoint'] + "'])['default'](" + JSON.stringify(exposedVariables) + ");",
      });

      if (environmentOptions['environment'] === 'production') {
        concatJs = uglify(concatJs, {
          outputFile: concatScript,
          uglify: {
            sourceMap: false,
          },
          async: true,
        });
      }

      apps.push(concatJs);
    } else {
      let concatJs = newVendorTree(
        concatScript,
        vendorScripts,
        amdModules,
        fileToAmdMap,
        [appJs],
        "require(['" + environmentOptions['name'] + "/" + app['entrypoint'] + "'])['default'](" + JSON.stringify(exposedVariables) + ");"
      );

      if (environmentOptions['environment'] === 'production') {
        concatJs = uglify(concatJs, {
          uglify: {
            sourceMap: false,
          },
          async: true,
        });
      }

      apps.push(concatJs);
    }
  }

  if (buildOptions.js.splitVendor) {
    let vendorScript;
    if (environmentOptions['environment'] === 'development') {
      vendorScript = 'js/vendor.js';
    } else {
      vendorScript = 'js/' + buildOptions['hash'] + '-vendor.js';
    }

    let vendorResultJs = newVendorTree(vendorScript, vendorScripts, amdModules, fileToAmdMap, [], '', false);

    if (environmentOptions['environment'] === 'production') {
      vendorResultJs = uglify(vendorResultJs, {
        uglify: {
          sourceMap: false,
        },
      });
    }

    apps.push(vendorResultJs);
  }

  return mergeTrees(apps);
};
