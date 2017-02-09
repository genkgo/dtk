'use strict';

let fs = require('fs');
let babel = require('broccoli-babel-transpiler');
let funnel = require('broccoli-funnel');
let concat = require('broccoli-concat');
let mergeTrees = require('broccoli-merge-trees');
let compileSass = require('broccoli-sass');
let npmMainFiles = require('./npm-main');
let compileCSS = require('broccoli-postcss');
let autoprefixer = require('autoprefixer');
let flexibility = require('postcss-flexibility');
let objectFitImages = require('postcss-object-fit-images');
let uglify = require('broccoli-uglify-sourcemap');
let modernizr = require('modernizr');
let merge = require('lodash.merge');
let shimAmd = require('./shim-amd');

let projectName = process.cwd().split('/').pop();

module.exports = DtkApp;

DtkApp.prototype = Object.create({});
DtkApp.prototype.constructor = DtkApp;

function DtkApp(buildOptions) {
  this.buildOptions = merge({
    'modernizr': require('./modernizr'),
    'npm': {}
  }, buildOptions);
}

DtkApp.prototype.build = function (environmentOptions) {


  let defaultAmdModule = (moduleName => {
    return {
      'name': moduleName,
      'exclude': false,
      'include': {},
      'dependencies': {},
      'css': [],
      'css-filter': c => c,
      'images': [],
      'return': '',
    };
  });

  let vendorJsFiles = ['modernizr.js'];
  let vendorImageFiles = [];
  let vendorCssFiles = [];
  let vendorCssFilter = {};

  let amdModules = {
    'modernizr': merge(
      defaultAmdModule('modernizr'),
      {'return': 'Modernizr'}
    )
  };
  let fileToAmdMap = {
    'modernizr.js': 'modernizr'
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
    fs.writeFileSync('node_modules/modernizr.js', result, {encoding: 'utf8'});
  });

  let vendorJavascripts = (files) => {
    for (let moduleName of Object.keys(files)) {
      if (!amdModules[moduleName]) {
        amdModules[moduleName] = defaultAmdModule(moduleName);
      }

      amdModules[moduleName]['name'] = moduleName + '/index';
      if (!amdModules[moduleName]['exclude']) {
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
    }).map((file) => {
      return fs.realpathSync(process.cwd() + file.substring(1));
    });
  });

  vendorJavascripts(files);

  for (let moduleName of Object.keys(amdModules)) {
    for (let file of Object.keys(amdModules[moduleName]['include'])) {
      let relativeFile = moduleName + '/' + file;
      let extraAmdModule = merge(
        defaultAmdModule(''),
        amdModules[moduleName]['include'][file]
      );

      vendorJsFiles.push(relativeFile);
      amdModules[extraAmdModule['name']] = extraAmdModule;
      fileToAmdMap[relativeFile] = extraAmdModule['name'];
    }
  }

  for (let moduleName of Object.keys(amdModules)) {
    for (let file of amdModules[moduleName]['css']) {
      let filename = process.cwd() + '/node_modules/' + moduleName + '/' + file;
      vendorCssFiles.push(filename);
      vendorCssFilter[filename] = amdModules[moduleName]['css-filter'];
    }
  }

  for (let moduleName of Object.keys(amdModules)) {
    for (let file of amdModules[moduleName]['images']) {
      vendorImageFiles.push(moduleName + '/' + file);
    }
  }

  let vendorJs = funnel('node_modules', {
    'files': vendorJsFiles
  });

  let vendorImages = funnel('node_modules', {
    'include': vendorImageFiles,
    'destDir': 'img',

    getDestinationPath: function(relativePath) {
      return relativePath.split('/').reverse()[0];
    }
  });

  let sassDirs = [
    'app/assets/scss',
    __dirname + '/../node_modules/node-bourbon/node_modules/bourbon/app/assets/stylesheets/',
    __dirname + '/../node_modules/node-neat/node_modules/bourbon-neat/app/assets/stylesheets/',
    'node_modules',
  ];

  let fileContent = vendorCssFiles.map((file) => {
    return vendorCssFilter[file](fs.readFileSync(file, {encoding: 'utf8'}));
  }).join('\n');

  fs.writeFileSync('node_modules/_npm.scss', fileContent, {encoding: 'utf8'});

  let styles = compileCSS(
    compileSass(
      sassDirs,
      'site/screen.scss',
      'css/screen.css',
      { outputStyle: environmentOptions['environment'] === 'production' ? 'compressed' : 'nested' }
    ), {
      plugins: [
        {
          module: autoprefixer,
          options: {
            browsers: ['last 4 versions']
          }
        },
        {module: flexibility},
        {module: objectFitImages}
      ]
    }
  );

  let appJs = babel('app/assets/js', {
    browserPolyfill: true,
    modules: 'amdStrict',
    moduleIds: true,
    moduleRoot: projectName
  });

  let loader = funnel(__dirname + '/../node_modules/loader.js/lib/loader', {
    files: ['loader.js']
  });

  let assets = funnel('app/assets/img/', {
    'destDir': 'img'
  });

  let templates = funnel('app/templates', {
    exclude: ['**/*']
  });

  environmentOptions['name'] = projectName;

  appJs = concat(mergeTrees([appJs, shimAmd(vendorJs, amdModules, fileToAmdMap), loader]), {
    inputFiles: ['**/*.js'],
    outputFile: 'js/scripts.js',
    header: ";(function() {",
    headerFiles: ['loader.js'],
    footer: "require(['" + projectName + "/index'])['default'](" + JSON.stringify(environmentOptions) + ");}());",
  });

  if (environmentOptions['environment'] === 'production') {
    appJs = uglify(appJs, {
      sourceMapIncludeSources: false,
      sourceMapConfig: {
        'enabled': false
      }
    });
  }

  return mergeTrees([appJs, styles, assets, templates, vendorImages]);
};