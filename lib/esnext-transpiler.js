"use strict";

let Babel = require('broccoli-babel-transpiler');
let merge = require('lodash.merge');
let dynamicImport = require('./dynamic-import');

function Transpiler (inputTree, projectName, _options) {

  let options = merge(_options || {}, {
    browserPolyfill: true,
    moduleIds: true,
    moduleRoot: projectName,
    plugins: [
      'transform-es2015-modules-amd',
      'transform-strict-mode',
      'transform-es2015-block-scoping',
      dynamicImport
    ]
  });

  Babel.call(this, inputTree, options);
}

Transpiler.prototype = Object.create(Babel.prototype);
Transpiler.prototype.constructor = Transpiler;

module.exports = Transpiler;