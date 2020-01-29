const amdModule = require('@babel/plugin-transform-modules-amd');
const core = require("@babel/core");
const helperModuleTransforms = require("@babel/helper-module-transforms");
const utils = require("babel-plugin-dynamic-import-node/utils");

module.exports = amdModuleWithLoaderJsDynamicImportFix;
module.exports.baseDir = function() { return __dirname; };

function amdModuleWithLoaderJsDynamicImportFix (api, options) {
  let plugin = amdModule.default(api, options);

  api.assertVersion(7);
  const { noInterop } = options;

  return {
    name: plugin.name,

    pre() {
      return plugin.pre.call(this);
    },

    visitor: {
      CallExpression(path, state)
      {
        if (!this.file.has("@babel/plugin-proposal-dynamic-import")) return;
        if (!path.get("callee").isImport()) return;
        let {
          requireId,
          resolveId,
          rejectId
        } = state;

        if (!requireId) {
          requireId = path.scope.generateUidIdentifier("require");
          state.requireId = requireId;
        }

        if (!resolveId || !rejectId) {
          resolveId = path.scope.generateUidIdentifier("resolve");
          rejectId = path.scope.generateUidIdentifier("reject");
          state.resolveId = resolveId;
          state.rejectId = rejectId;
        }

        let result = core.types.identifier("imported");

        if (!noInterop) result = (0, helperModuleTransforms.wrapInterop)(path, result, "namespace");
        path.replaceWith(core.template.expression.ast`
            new Promise((${resolveId}, ${rejectId}) => {
              try {
                ${resolveId}(${requireId}(
                  ${(0, utils.getImportSource)(core.types, path.node)}
                ))
              } catch (e) {
                ${rejectId}();
              }
            })`);
      },

      Program: plugin.visitor.Program
    },
  };
}
