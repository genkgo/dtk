"use strict";

let fs = require('fs');
let path = require('path');
let compileSass = require('broccoli-sass-simultaneous');
let funnel = require('broccoli-funnel');
let compileCSS = require('broccoli-postcss');
let mergeTrees = require('broccoli-merge-trees');
let autoprefixer = require('autoprefixer');
let flexibility = require('postcss-flexibility');
let objectFitImages = require('postcss-object-fit-images');
let temp = require('fs-temp');

module.exports = function (environmentOptions, buildOptions, vendorFiles) {

  let vendorCssFiles = vendorFiles['css'];
  let vendorCssFilter = vendorFiles['css-filter'];

  let fileContent = vendorCssFiles.map((file) => {
    return vendorCssFilter[file](fs.readFileSync(file, {encoding: 'utf8'}));
  }).join('\n');


  let npmPath = temp.template('dtk-npm-%s').mkdirSync();
  fs.writeFileSync(npmPath + '/_npm.scss', fileContent, {encoding: 'utf8'});

  let cssTrees = [];
  let sassSettings = {
    outputStyle: environmentOptions['environment'] === 'production' ? 'compressed' : 'nested',
    sourceMap: environmentOptions['environment'] !== 'production',
  };

  if (environmentOptions['environment'] === 'production') {
    sassSettings.afterBuild = function (tree) {
      return compileCSS(tree, {
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
      });
    };
  }

  let sassDirs = [
    environmentOptions['baseDir'] + '/app/assets/scss',
    environmentOptions['modulesDir'] + '/bourbon/app/assets/stylesheets/',
    environmentOptions['modulesDir'] + '/bourbon-neat/app/assets/stylesheets/',
    npmPath,
  ];

  let inputToOutputMap = {};
  for (let file of buildOptions['scss']['compile']) {
    let targetName = path.basename(file, '.scss');
    if (environmentOptions['environment'] === 'development') {
      targetName = `css/${targetName}.css`;
    } else {
      targetName = `css/${buildOptions['hash']}-${targetName}.css`;
    }

    inputToOutputMap[file] = targetName;
  }

  cssTrees.push(compileSass(sassDirs, inputToOutputMap, sassSettings));

  cssTrees.push(
    funnel(environmentOptions['baseDir'] + '/app/assets/scss', {
      'include': buildOptions['scss']['include'],
      'destDir': 'css',
    })
  );

  return mergeTrees(cssTrees);
};