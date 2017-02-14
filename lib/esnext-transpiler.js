"use strict";

let Babel = require('broccoli-babel-transpiler');
let merge = require('lodash.merge');

let transformModulesAmd = require('babel-plugin-transform-es2015-modules-amd');
let transformStrictMode = require('babel-plugin-transform-strict-mode');
let transformEs2015 = require('babel-preset-es2015');
let transformDynamicImport = require('./dynamic-import');

function Transpiler (inputTree, projectName, _options) {

  let options = merge(_options || {}, {
    browserPolyfill: true,
    moduleIds: true,
    moduleRoot: projectName,
    presets: [transformEs2015],
    plugins: [
      transformModulesAmd,
      transformStrictMode,
      transformDynamicImport
    ]
  });

  Babel.call(this, inputTree, options);
}

Transpiler.prototype = Object.create(Babel.prototype);
Transpiler.prototype.constructor = Transpiler;

module.exports = Transpiler;