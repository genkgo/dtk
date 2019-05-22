"use strict";

let Babel = require('broccoli-babel-transpiler');
let merge = require('lodash.merge');

let transformModulesAmd = require('babel-plugin-transform-es2015-modules-amd');
let transformStrictMode = require('babel-plugin-transform-strict-mode');
let transformDynamicImport = require('babel-plugin-dynamic-import-amd');
let transformCustomElementClasses = require('babel-plugin-transform-custom-element-classes');
let transformEs2015 = require('babel-preset-es2015');

module.exports = {
  Local: LocalTranspiler,
  Vendor: VendorTranspiler,
};

function LocalTranspiler (inputTree, projectName, _options) {

  let options = merge(_options || {}, {
    moduleIds: true,
    moduleRoot: projectName,
    presets: [transformEs2015],
    plugins: [
      transformCustomElementClasses,
      transformModulesAmd,
      transformStrictMode,
      transformDynamicImport
    ]
  });

  Babel.call(this, inputTree, options);
}

LocalTranspiler.prototype = Object.create(Babel.prototype);
LocalTranspiler.prototype.constructor = LocalTranspiler;

function VendorTranspiler (inputTree, _options) {

  let options = merge(_options || {}, {
    moduleIds: false,
    presets: [transformEs2015],
    plugins: [
      transformCustomElementClasses,
      transformModulesAmd,
      transformStrictMode,
      transformDynamicImport
    ]
  });

  Babel.call(this, inputTree, options);
}

VendorTranspiler.prototype = Object.create(Babel.prototype);
VendorTranspiler.prototype.constructor = VendorTranspiler;