"use strict";

module.exports = (moduleName => {
  return {
    'main': '',
    'name': moduleName,
    'exclude': false,
    'include': {},
    'factory': {
      'return': '',
      'dependencies': {},
    },
    'css': [],
    'css-filter': c => c,
    'images': [],
    'transpile': false,
  };
});