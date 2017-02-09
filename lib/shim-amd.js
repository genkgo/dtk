'use strict';

let stew = require('broccoli-stew');

module.exports = shimAmd;

function shimAmd(tree, amdModules, fileToAmdModule) {
  return stew.map(tree, (content, relativePath) => {
    let moduleName = fileToAmdModule[relativePath];
    let amdModule = amdModules[moduleName];

    if (Object.keys(amdModule['dependencies']).length > 0 || amdModule['return']) {
      let dependencies = '';
      let variables = '';
      let returnVariable = '';

      if (Object.keys(amdModule['dependencies']).length > 0) {
        dependencies = '["' + Object.keys(amdModule['dependencies']).join('","') + '"], ';
        variables = Object.keys(amdModule['dependencies']).map(key => amdModule['dependencies'][key]).join(',');
      }

      if (amdModule['return'] !== '') {
        returnVariable = 'return ' + amdModule['return'] + ';';
      }

      content = [
        '(function(factory) {\n',
        'define(' + dependencies + 'factory);',
        '})(function (' + variables + ') {',
        content,
        returnVariable,
        '});',
      ].join('');
    }

    return [
      '(function(define, module){\n',
      content,
      '\nif (define.defined === false && module.exports) { define(function () { return module.exports; }); }',
      '\n})((function(){ function newDefine(){ var args = Array.prototype.slice.call(arguments);',
      'while (typeof args[0] === "string") { args.shift(); }',
      'args.unshift("',
      amdModule['name'],
      '"); define.defined = true; return define.apply(null, args); }; newDefine.amd = true; newDefine.defined = false; return newDefine; })(), {});',
    ].join('');
  });
}