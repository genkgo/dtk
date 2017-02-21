"use strict";

let fs = require('fs');
let path = require('path');
let compileSass = require('broccoli-sass');
let funnel = require('broccoli-funnel');
let compileCSS = require('broccoli-postcss');
let mergeTrees = require('broccoli-merge-trees');
let autoprefixer = require('autoprefixer');
let flexibility = require('postcss-flexibility');
let objectFitImages = require('postcss-object-fit-images');
let quickTemp = require('quick-temp');

module.exports = function (environmentOptions, buildOptions, vendorFiles) {

  let vendorCssFiles = vendorFiles['css'];
  let vendorCssFilter = vendorFiles['css-filter'];

  let fileContent = vendorCssFiles.map((file) => {
    return vendorCssFilter[file](fs.readFileSync(file, {encoding: 'utf8'}));
  }).join('\n');

  let tempPath = {};
  quickTemp.makeOrReuse(tempPath, 'dir');
  fs.writeFileSync(environmentOptions['modulesDir'] + '/_npm.scss', fileContent, {encoding: 'utf8'});

  let cssTrees = [];
  let sassSettings = {
    outputStyle: environmentOptions['environment'] === 'production' ? 'compressed' : 'nested'
  };

  let postCssSettings = {
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
  };

  let sassDirs = [
    environmentOptions['baseDir'] + '/app/assets/scss',
    environmentOptions['modulesDir'] + '/bourbon/app/assets/stylesheets/',
    environmentOptions['modulesDir'] + '/bourbon-neat/app/assets/stylesheets/',
    tempPath.dir,
  ];

  for (let file of buildOptions['scss']['compile']) {
    let targetName = path.basename(file, '.scss');
    if (environmentOptions['environment'] === 'development') {
      targetName = `css/${targetName}.css`;
    } else {
      targetName = `css/${buildOptions['hash']}-${targetName}.css`;
    }

    let tree = compileSass(sassDirs, file, targetName, sassSettings);
    if (environmentOptions['environment'] === 'production') {
      tree = compileCSS(tree, postCssSettings);
    }

    cssTrees.push(tree);
  }

  cssTrees.push(
    funnel(environmentOptions['baseDir'] + '/app/assets/scss', {
      'include': buildOptions['scss']['include'],
      'destDir': 'css',
    })
  );

  return mergeTrees(cssTrees);
};