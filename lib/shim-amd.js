'use strict';

let stew = require('broccoli-stew');

module.exports = shimAmd;

function shimAmd(tree, amdModules, fileToAmdModule) {
  return stew.map(tree, (content, relativePath) => {
    let moduleName = fileToAmdModule[relativePath];
    let amdModule = amdModules[moduleName];

    let hasDependencies = Object.keys(amdModule['factory']['dependencies']).length > 0;
    let hasReturn = amdModule['factory']['return'] !== '';

    if (hasDependencies || hasReturn) {
      let dependencies = '';
      let variables = '';
      let returnVariable = '';

      if (hasDependencies) {
        dependencies = '["' + Object.keys(amdModule['factory']['dependencies']).join('","') + '"], ';
        variables = Object.keys(amdModule['factory']['dependencies']).map(key => amdModule['factory']['dependencies'][key]).join(',');
      }

      if (hasReturn) {
        returnVariable = 'return ' + amdModule['factory']['return'] + ';';
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