define("es-next/async-await", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function _asyncToGenerator(fn) {
    return function () {
      var gen = fn.apply(this, arguments);
      return new Promise(function (resolve, reject) {
        function step(key, arg) {
          try {
            var info = gen[key](arg);
            var value = info.value;
          } catch (error) {
            reject(error);
            return;
          }

          if (info.done) {
            resolve(value);
          } else {
            return Promise.resolve(value).then(function (value) {
              step("next", value);
            }, function (err) {
              step("throw", err);
            });
          }
        }

        return step("next");
      });
    };
  }

  var asyncFunc = function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
      var result;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return Promise.resolve();

            case 2:
              result = _context.sent;
              return _context.abrupt("return", Promise.resolve());

            case 4:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function asyncFunc() {
      return _ref.apply(this, arguments);
    };
  }();

  function syncFunc() {
    return Promise.all([asyncFunc()]);
  }

  exports.default = syncFunc;
});
