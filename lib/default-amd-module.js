"use strict";

module.exports = (moduleName => {
  return {
    'main': '',
    'name': moduleName,
    'exclude': false,
    'include': {},
    'dependencies': {},
    'css': [],
    'css-filter': c => c,
    'images': [],
    'return': '',
  };
});