"use strict";

module.exports = function (amdModules) {
  let vendorJsFiles = [];
  let vendorImageFiles = [];
  let vendorCssFiles = [];
  let vendorCssFilter = {};

  for (let moduleName of Object.keys(amdModules)) {
    for (let file of Object.keys(amdModules[moduleName]['include'])) {
      let relativeFile = moduleName + '/' + file;

      let extraAmdModule = merge(
        defaultAmdModule(''),
        amdModules[moduleName]['include'][file]
      );

      vendorJsFiles.push(relativeFile);
      amdModules[extraAmdModule['name']] = extraAmdModule;
      fileToAmdMap[relativeFile] = extraAmdModule['name'];
    }
  }

  for (let moduleName of Object.keys(amdModules)) {
    for (let file of amdModules[moduleName]['css']) {
      let filename = process.cwd() + '/node_modules/' + moduleName + '/' + file;
      vendorCssFiles.push(filename);
      vendorCssFilter[filename] = amdModules[moduleName]['css-filter'];
    }
  }

  for (let moduleName of Object.keys(amdModules)) {
    for (let file of amdModules[moduleName]['images']) {
      vendorImageFiles.push(moduleName + '/' + file);
    }
  }

  return {
    'js': vendorJsFiles,
    'css': vendorCssFiles,
    'css-filter': vendorCssFilter,
    'images': vendorImageFiles,
  };
};