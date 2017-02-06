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

let projectName = process.cwd().split('/').pop();

function DtkApp() {

}

DtkApp.prototype.build = function (options) {
  function shimAmd(tree, nameMapping) {
    return stew.map(tree, (content, relativePath) => {
      console.log(relativePath);
      let name = nameMapping[relativePath];
      if (name) {
        return [
          '(function(define){\n',
          content,
          '\n})((function(){ function newDefine(){ var args = Array.prototype.slice.call(arguments);',
          'while (typeof args[0] === "string") { args.shift(); }',
          'args.unshift("',
          name,
          '"); return define.apply(null, args); }; newDefine.amd = true; return newDefine; })());',
        ].join('');
      } else {
        return content;
      }
    });
  }

  let vendorJs;
  let amdModuleNames = {};
  let vendorExtensions = {
    'js': (files) => {
      vendorJs = funnel('bower_components', {
        'files': files.map((file) => {
          let filename = file.replace(process.cwd() + '/bower_components/', '');
          amdModuleNames[filename] = file.split('/').reverse()[0].split('.')[0];
          return filename;
        })
      });
    },
    'scss': (files) => {
      let fileContent = files.map((file) => {
        return fs.readFileSync(file, {encoding: 'utf8'});
      }).join('\n');

      fs.writeFileSync('bower_components/_bower.scss', fileContent, {encoding: 'utf8'});
    }
  };

  for (let extension of Object.keys(vendorExtensions)) {
    let vendorFiles = mainBowerFiles().filter((file) => {
      return new RegExp('\\.' + extension + '$').test(file);
    });

    vendorExtensions[extension](vendorFiles);
  }

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
      'css/screen.css'
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

  options['projectName'] = projectName;

  appJs = concat(mergeTrees([appJs, shimAmd(vendorJs, amdModuleNames), loader]), {
    inputFiles: ['**/*.js'],
    outputFile: 'js/scripts.js',
    header: ";(function() {",
    headerFiles: ['loader.js'],
    footer: "require(['" + projectName + "/index'])['default'](" + JSON.stringify(options) + ");}());",
  });

  return mergeTrees([appJs, styles, assets, templates]);
};

module.exports = DtkApp;