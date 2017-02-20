"use strict";

let fs = require('fs');
let funnel = require('broccoli-funnel');

module.exports = function (environmentOptions) {

  if (!fs.existsSync(environmentOptions['baseDir'] + '/app/assets/favicon/')) {
    throw new ReferenceError('No favicons');
  }

  return funnel(environmentOptions['baseDir'] + '/app/assets/favicon/', {
    'destDir': 'img/favicon'
  });
};