
// DIAG.usage({aliases:{streamToS3:{}}});
module.exports.getFnNameFromFnConfig = function(config) {
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
  }

  return;
};
