"use strict";

const Babel = require('broccoli-babel-transpiler');
const merge = require('lodash.merge');

module.exports = {
  Local: LocalTranspiler,
  Vendor: VendorTranspiler,
};

function LocalTranspiler (inputTree, projectName, _options) {

  let options = merge(_options || {}, {
    moduleIds: true,
    moduleRoot: projectName,
    sourceRoot: process.cwd(),
    presets: [
      ['@babel/preset-env', {
        'targets': {
          'browsers': ['last 2 versions']
        }
      }]
    ],
    plugins: [
      '@babel/plugin-transform-modules-amd',
      '@babel/plugin-transform-strict-mode',
      '@babel/plugin-transform-classes',
      '@babel/plugin-proposal-dynamic-import',
      '@babel/plugin-transform-async-to-generator',
    ]
  });

  Babel.call(this, inputTree, options);
}

LocalTranspiler.prototype = Object.create(Babel.prototype);
LocalTranspiler.prototype.constructor = LocalTranspiler;

function VendorTranspiler (inputTree, _options) {

  let options = merge(_options || {}, {
    moduleIds: false,
    presets: [
      ['@babel/preset-env', {
        'targets': {
          'browsers': ['last 2 versions']
        }
      }]
    ],
    plugins: [
      '@babel/plugin-transform-modules-amd',
      '@babel/plugin-transform-strict-mode',
      '@babel/plugin-transform-classes',
      '@babel/plugin-proposal-dynamic-import',
      '@babel/plugin-transform-async-to-generator',
    ]
  });

  Babel.call(this, inputTree, options);
}

VendorTranspiler.prototype = Object.create(Babel.prototype);
VendorTranspiler.prototype.constructor = VendorTranspiler;
