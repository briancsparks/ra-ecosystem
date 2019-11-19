
/**
 * @file
 *
 * Looks at the data passing through, and sends notices for anomolies.
 *
 */
const sg                      = require('sg-env');
const {assertArgvContext}     = require('../utils');

const ENV                     = sg.ENV();

module.exports.mkDetector = mkDetector;


// ----------------------------------------------------------------------------------------------------------------------------
function mkDetector(options_, next) {
  const options   = {...options_};

  // For example, options.ttl

  return function(argv, context, callback) {
    // console.log(`check-config doing its thing`);
    const fails = assertArgvContext(`check-config-detector`, true, argv, false, context, __filename, !!ENV.at('RA_LOUD_CHECKS'));

    // TODO: Do something with the fails

    return next(argv, context, function(err, data, ...rest) {

      // TODO: check response

      // console.log(`check-config finishing`);
      return callback(err, data, ...rest);
    });
  };
}
