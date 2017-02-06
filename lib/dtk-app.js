'use strict';

let fs = require('fs');
let babel = require('broccoli-babel-transpiler');
let funnel = require('broccoli-funnel');
let concat = require('broccoli-concat');
let mergeTrees = require('broccoli-merge-trees');
let compileSass = require('broccoli-sass');
let mainBowerFiles = require('main-bower-files');
let stew = require('broccoli-stew');
let compileCSS = require('broccoli-postcss');
let autoprefixer = require('autoprefixer');
let flexibility = require('postcss-flexibility');
let objectFitImages = require('postcss-object-fit-images');
let uglify = require('broccoli-uglify-sourcemap');
let modernizr = require('modernizr');
let merge = require('lodash.merge');

let projectName = process.cwd().split('/').pop();

module.exports = DtkApp;

DtkApp.prototype = Object.create({});
DtkApp.prototype.constructor = DtkApp;

function DtkApp(buildOptions) {
  this.buildOptions = merge({
    'modernizr': require('./modernizr'),
    'bower': {}
  }, buildOptions);
}

DtkApp.prototype.build = function (environmentOptions) {
  function shimAmd(tree, nameMapping) {
    return stew.map(tree, (content, relativePath) => {
      let amdSettings = nameMapping[relativePath];
      if (amdSettings['name']) {
        if (Object.keys(amdSettings['dependencies']).length > 0 || amdSettings['return']) {
          let dependencies = '';
          let variables = '';
          let returnVariable = '';

          if (Object.keys(amdSettings['dependencies']).length > 0) {
            dependencies = '["' + Object.keys(amdSettings['dependencies']).join('","') + '"], ';
            variables = Object.keys(amdSettings['dependencies']).map(key => amdSettings['dependencies'][key]).join(',');
          }

          if (amdSettings['return'] !== '') {
            returnVariable = 'return ' + amdSettings['return'] + ';';
          }

          content = [
            '(function(factory) {\n',
            'define(' + dependencies + 'factory);',
            '})(function (' + variables + ') {',
            content,
            returnVariable,
            '});',
          ].join('');
        }

        return [
          '(function(define){\n',
          content,
          '\n})((function(){ function newDefine(){ var args = Array.prototype.slice.call(arguments);',
          'while (typeof args[0] === "string") { args.shift(); }',
          'args.unshift("',
          amdSettings['name'],
          '"); return define.apply(null, args); }; newDefine.amd = true; return newDefine; })());',
        ].join('');
      } else {
        return content;
      }
    });
  }

  let vendorFiles = [];
  let amdModuleNames = {};
  let vendorExtensions = {
    'js': (files) => {
      vendorFiles = vendorFiles.concat(
        files.map((file) => {
          let filename = file.replace(process.cwd() + '/bower_components/', '');
          let moduleName = filename.split('/')[0];

          amdModuleNames[filename] = {
            'name': moduleName,
            'exclude': false,
            'dependencies': {},
            'return': ''
          };

          if (this.buildOptions['bower'][moduleName]) {
            amdModuleNames[filename] = merge(
              amdModuleNames[filename],
              this.buildOptions['bower'][moduleName]
            );
          }

          return filename;
        }).filter((filename) => {
          return !amdModuleNames[filename]['exclude'];
        })
      );
    },
    'scss': (files) => {
      let fileContent = files.map((file) => {
        return fs.readFileSync(file, {encoding: 'utf8'});
      }).join('\n');

      fs.writeFileSync('bower_components/_bower.scss', fileContent, {encoding: 'utf8'});
    }
  };

  for (let extension of Object.keys(vendorExtensions)) {
    let bowerMainFiles = mainBowerFiles().filter((file) => {
      return new RegExp('\\.' + extension + '$').test(file);
    });

    vendorExtensions[extension](bowerMainFiles);
  }

  modernizr.build(this.buildOptions['modernizr'], (result) => {
    fs.writeFileSync('bower_components/modernizr.js', result, {encoding: 'utf8'});
    vendorFiles.push('modernizr.js');
    amdModuleNames['modernizr.js'] = {
      'name': 'modernizr',
      'exclude': false,
      'dependencies': {},
      'return': ''
    };
  });

  let vendorJs = funnel('bower_components', {
    'files': vendorFiles
  });

  let sassDirs = [
    'app/assets/scss',
    __dirname + '/../node_modules/node-bourbon/node_modules/bourbon/app/assets/stylesheets/',
    __dirname + '/../node_modules/node-neat/node_modules/bourbon-neat/app/assets/stylesheets/',
    'bower_components',
  ];

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

  // let styles = compileSass(sassDirs, 'site/screen.scss', 'css/screen.css');
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

  appJs = concat(mergeTrees([appJs, shimAmd(vendorJs, amdModuleNames), loader]), {
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

  return mergeTrees([appJs, styles, assets, templates]);
};