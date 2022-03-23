const compiler = require('broccoli-sass-source-maps')(require('node-sass'));
const Plugin = require('broccoli-plugin');

module.exports = class SassSimultaneousCompiler extends Plugin {

  constructor(inputNodes, inputOutputMap, options) {
    if (!Array.isArray(inputNodes)) { throw new Error('Expected array for first argument - did you mean [tree] instead of tree?'); }

    super(inputNodes, {
      annotation: options.annotation
    });

    this.inputOutputMap = inputOutputMap;
    this.options = options || {};
  }

  build () {
    let promises = [];

    Object.keys(this.inputOutputMap).forEach((inputFile)  => {
      let compilerInstance = compiler(
        this._inputNodes,
        inputFile,
        this.inputOutputMap[inputFile],
        this.options
      );

      compilerInstance.inputPaths = this.inputPaths;
      compilerInstance.outputPath = this.outputPath;
      compilerInstance.cachePath = this.cachePath;

      promises.push(compilerInstance.build());
    });

    return Promise.all(promises);
  }

};
