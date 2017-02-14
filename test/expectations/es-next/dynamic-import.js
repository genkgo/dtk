define('es-next/dynamic-import', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var x = './dir';

  var y = new Promise(resolve => require(x + '/class.js'));

  exports.default = y;
});