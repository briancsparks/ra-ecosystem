
const sg                      = require('sg0');
const { _ }                   = sg;

// DIAG.usage({aliases:{streamToS3:{}}});
module.exports.getNameFromConfig = function(config) {
  var   aspects = {};

  _.each(config, (aspect /*, aspectKey */) => {
    // I.e. aspectKey === 'aliases'
    _.each(aspect, (x, name) => {
      aspects[name] = name;
    });
  });

  const names = Object.keys(aspects);   /* i.e. names === ['streamToS3'] */
  if (names.length === 1) {
    return names[0];                    /* Therefore, getNameFromConfig({aliases:{streamToS3:{}}}) => 'streamToS3' */
  } else if (names.length === 0) {
    return;
  }

  // NOTE: I think its OK to pass in a config with multiple names, it is just not a config that targets one name.
  // /* otherwise, config is not properly constructed */
  // console.error(`Error: config is not properly constructed in call to getNameFromConfig. It should have only one name, but has ${names.join()}`);

  /* Therefore, getNameFromConfig({aliases:{streamToS3:{}, other:{}}}) => undefined */

  return;
};
