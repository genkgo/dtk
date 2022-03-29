'use strict';

let fs = require('fs');
let funnel = require('broccoli-funnel');
let mergeTrees = require('broccoli-merge-trees');

module.exports = function (environmentOptions, buildOptions) {

  let trees = [];

  for (let dir of buildOptions['copy']) {
    if (fs.existsSync(environmentOptions['baseDir'] + '/app/assets/' + dir)) {
      trees.push(
        funnel(environmentOptions['baseDir'] + '/app/assets/' + dir, {
          'destDir': dir
        })
      );
    }
  }

  return mergeTrees(trees);
};
