"use strict";

let Babel = require('broccoli-babel-transpiler');
let merge = require('lodash.merge');

let transformModulesAmd = require('babel-plugin-transform-es2015-modules-amd');
let transformStrictMode = require('babel-plugin-transform-strict-mode');
let transformBlockScoping = require('babel-plugin-transform-es2015-block-scoping');
let transformArrowFunctions = require('babel-plugin-transform-es2015-arrow-functions');

let transformDynamicImport = require('./dynamic-import');

function Transpiler (inputTree, projectName, _options) {

  let options = merge(_options || {}, {
    browserPolyfill: true,
    moduleIds: true,
    moduleRoot: projectName,
    plugins: [
      transformModulesAmd,
      transformStrictMode,
      transformBlockScoping,
      transformArrowFunctions,
      transformDynamicImport
    ]
  });

  Babel.call(this, inputTree, options);
}

Transpiler.prototype = Object.create(Babel.prototype);
Transpiler.prototype.constructor = Transpiler;

module.exports = Transpiler;