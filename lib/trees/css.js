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
    __dirname + '/../../node_modules/node-bourbon/node_modules/bourbon/app/assets/stylesheets/',
    __dirname + '/../../node_modules/node-neat/node_modules/bourbon-neat/app/assets/stylesheets/',
    environmentOptions['baseDir'] + '/node_modules',
  ];

  let fileContent = vendorCssFiles.map((file) => {
    return vendorCssFilter[file](fs.readFileSync(file, {encoding: 'utf8'}));
  }).join('\n');

  fs.writeFileSync(environmentOptions['baseDir'] + '/node_modules/_npm.scss', fileContent, {encoding: 'utf8'});

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