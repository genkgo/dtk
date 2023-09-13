define("es-next/async-await", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _ref;
  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
  function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
  let asyncFunc = function asyncFunc() {
    return (_ref = _ref || _asyncToGenerator(function* () {
      let result = yield Promise.resolve();
      return Promise.resolve();
    })).apply(this, arguments);
  };
  function syncFunc() {
    return Promise.all([asyncFunc()]);
  }
  var _default = syncFunc;
  _exports.default = _default;
});
