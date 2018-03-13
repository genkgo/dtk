module.exports = {
  "minify": false,
  "options": [
    "domPrefixes",
    "prefixes",
    "addTest",
    "hasEvent",
    "mq",
    "testAllProps",
    "setClasses"
  ],
  "feature-detects": [
    "test/custom-elements",
    "test/forcetouch",
    "test/input",
    "test/inputsearchevent",
    "test/inputtypes",
    "test/css/cssgrid",
    "test/css/flexbox",
    "test/css/flexboxlegacy",
    "test/css/flexwrap",
    "test/css/positionsticky",
    "test/css/transforms3d"
  ]
};
