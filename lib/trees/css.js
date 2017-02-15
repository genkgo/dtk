"use strict";

let fs = require('fs');
let compileSass = require('broccoli-sass');
let compileCSS = require('broccoli-postcss');
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

  return compileCSS(
    compileSass(
      sassDirs,
      buildOptions['scss'],
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
};