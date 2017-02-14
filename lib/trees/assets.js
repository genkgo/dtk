"use strict";

let mergeTrees = require('broccoli-merge-trees');
let funnel = require('broccoli-funnel');

module.exports = function (environmentOptions, buildOptions, vendorFiles) {

  let vendorImageFiles = vendorFiles['images'];

  let vendorImages = funnel(environmentOptions['baseDir'] + '/node_modules', {
    'include': vendorImageFiles,
    'destDir': 'img',

    getDestinationPath: function(relativePath) {
      return relativePath.split('/').reverse()[0];
    }
  });

  let assets = funnel(environmentOptions['baseDir'] + '/app/assets/img/', {
    'destDir': 'img'
  });

  return mergeTrees([vendorImages, assets]);
};