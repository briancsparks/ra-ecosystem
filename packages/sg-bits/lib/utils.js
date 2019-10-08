
const sg                      = require('sg0');
const { _ }                   = sg;

// DIAG.usage({aliases:{streamToS3:{}}});
module.exports.getNameFromConfig = function(config) {
  var   fnConfigs = {};

  _.each(config, (fnConfig, key) => {
    // I.e. key === 'aliases'
    _.each(fnConfig, (x, fnName) => {
      fnConfigs[fnName] = fnName;
    });
  });

  const names = Object.keys(fnConfigs);
  if (names.length === 1) {
    return names[0];
  } else if (names.length === 0) {
    return;
  }

  /* otherwise, config is not properly constructed */
  console.error(`Error: config is not properly constructed in call to getNameFromConfig. It should have only one name, but has ${names.join()}`);
  return;
};
