define('es-next/dynamic-string-import', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var x = './dir';

  var y = new Promise(function (resolve) {
    return resolve(require('./dir/class.js'));
  });

  exports.default = y;
});