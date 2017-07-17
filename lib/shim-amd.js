'use strict';

let stew = require('broccoli-stew');

module.exports = shimAmd;

function shimAmd(tree, amdModules, fileToAmdModule) {
  return stew.map(tree, (content, relativePath) => {
    let moduleName = fileToAmdModule[relativePath];
    let amdModule = amdModules[moduleName];

    let hasDependencies = Object.keys(amdModule['factory']['dependencies']).length > 0;
    let hasReturn = amdModule['factory']['return'] !== '';
    let skipAnonymousCheck = amdModule['factory']['anonymous-check'] === false;
    let skipCallbackCheck = amdModule['factory']['callback-check'] === false;

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

    let anonymousCheck = [];
    if (skipAnonymousCheck) {
      anonymousCheck = [
        'if (typeof args[0] !== "string") {',
        'args.unshift("',
        amdModule['name'],
        '"); } '
      ];
    } else {
      anonymousCheck = [
        'while (typeof args[0] === "string") { args.shift(); }',
        'args.unshift("',
        amdModule['name'],
        '"); '
      ];
    }

    let callbackCheck = [];
    if (skipCallbackCheck) {
      callbackCheck = [];
    } else {
      callbackCheck = [
        'if (typeof args[args.length - 1] !== "function") { ',
        'var returnCallbackValue = args[args.length - 1];',
        'args[args.length - 1] = function () { return returnCallbackValue; }',
        '}'
      ];
    }

    return [
      '(function(define, module){\n',
      content,
      '\nif (define.defined === false && module.exports) { define(function () { return module.exports; }); }',
      '\n})((function(){ function newDefine(){ var args = Array.prototype.slice.call(arguments);',
      anonymousCheck.join(''),
      callbackCheck.join(''),
      'define.defined = true; return define.apply(null, args); }; newDefine.amd = true; newDefine.defined = false; return newDefine; })(), {});',
    ].join('');
  });
}