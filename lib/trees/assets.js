'use strict';

let mergeTrees = require('broccoli-merge-trees');
let funnel = require('broccoli-funnel');
let source = require('broccoli-source');
let Imagemin = require('broccoli-imagemin');
let svgo = require('imagemin-svgo');
let optipng = require('imagemin-optipng');
let jpegtran = require('imagemin-jpegtran');
let gifsicle = require('imagemin-gifsicle');

module.exports = function (environmentOptions, buildOptions, vendorFiles) {

  let vendorImageFiles = vendorFiles['images'];

  let vendorImages = funnel(new source.UnwatchedDir(environmentOptions['modulesDir']), {
    'include': vendorImageFiles,
    'destDir': 'img',

    getDestinationPath: function(relativePath) {
      return relativePath.split('/').reverse()[0];
    }
  });

  let assets = new Imagemin(
    funnel(environmentOptions['baseDir'] + '/app/assets/img/', {
      'destDir': 'img'
    }),
    {
      plugins: [
        jpegtran(),
        gifsicle(),
        optipng(),
        svgo(),
      ]
    }
  );

  return mergeTrees([vendorImages, assets]);
};
