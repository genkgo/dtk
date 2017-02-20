"use strict";

let funnel = require('broccoli-funnel');

module.exports = function (environmentOptions) {

  return funnel(environmentOptions['baseDir'] + '/app/assets/favicon/', {
    'destDir': 'img/favicon'
  });
};