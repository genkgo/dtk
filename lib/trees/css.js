"use strict";

let fs = require('fs');
let path = require('path');
const compileSass = require('../sass-simultaneous');
let funnel = require('broccoli-funnel');
let compileCSS = require('broccoli-postcss');
let mergeTrees = require('broccoli-merge-trees');
let autoprefixer = require('autoprefixer');
let cssnano = require('cssnano');
let flexibility = require('postcss-flexibility');
let objectFitImages = require('postcss-object-fit-images');
let temp = require('fs-temp');
let packageImporter = require('node-sass-package-importer');

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
    outputStyle: environmentOptions['environment'] === 'production' ? 'compressed' : 'expanded',
    sourceMap: environmentOptions['environment'] !== 'production',
    sourceMapContents: environmentOptions['environment'] !== 'production',
    sourceMapEmbed: environmentOptions['environment'] !== 'production',
    importer: packageImporter()
  };

  let sassDirs = [
    environmentOptions['baseDir'] + '/app/assets/scss',
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

  let compiled = compileSass(sassDirs, inputToOutputMap, sassSettings);

  if (environmentOptions['environment'] === 'production') {
    compiled = compileCSS(compiled, {
      plugins: [
        {
          module: cssnano,
          options: {
            preset: ['advanced', {
              zindex: false,
              autoprefixer: false
            }],
          }
        },
        {
          module: autoprefixer,
          options: {
            overrideBrowserslist: ['last 4 versions'],
            grid: true
          }
        },
        {module: flexibility},
        {module: objectFitImages}
      ]
    });
  } else {
    compiled = compileCSS(compiled, {
      plugins: [
        {
          module: autoprefixer,
          options: {
            overrideBrowserslist: ['last 4 versions'],
            grid: "no-autoplace"
          }
        },
        {module: flexibility},
        {module: objectFitImages}
      ],
      map: {
        inline: true,
        annotation: false
      }
    });
  }

  cssTrees.push(compiled);

  cssTrees.push(
    funnel(environmentOptions['baseDir'] + '/app/assets/scss', {
      'include': buildOptions['scss']['include'],
      'destDir': 'css',
    })
  );

  return mergeTrees(cssTrees);
};
