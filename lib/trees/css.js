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

module.exports = function (environmentOptions, buildOptions, vendorFiles) {

  let vendorCssFiles = vendorFiles['css'];
  let vendorCssFilter = vendorFiles['css-filter'];

  let sassDirs = [
    environmentOptions['baseDir'] + '/app/assets/scss',
    environmentOptions['modulesDir'] + '/bourbon/app/assets/stylesheets/',
    environmentOptions['modulesDir'] + '/bourbon-neat/app/assets/stylesheets/',
    environmentOptions['modulesDir'],
  ];

  let fileContent = vendorCssFiles.map((file) => {
    return vendorCssFilter[file](fs.readFileSync(file, {encoding: 'utf8'}));
  }).join('\n');

  fs.writeFileSync(environmentOptions['modulesDir'] + '/_npm.scss', fileContent, {encoding: 'utf8'});

  let cssTrees = [];

  for (let file of buildOptions['scss']['compile']) {
    let targetName = path.basename(file, '.scss');
    if (environmentOptions['environment'] === 'development') {
      targetName = `css/${targetName}.css`;
    } else {
      targetName = `css/${buildOptions['hash']}-${targetName}.css`;
    }

    let tree = compileSass(
      sassDirs,
      file,
      targetName,
      { outputStyle: environmentOptions['environment'] === 'production' ? 'compressed' : 'nested' }
    );

    if (environmentOptions['environment'] === 'production') {
      tree = compileCSS(
        tree,
        {
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