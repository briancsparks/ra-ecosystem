
/**
 * @file
 *
 * Calls an RA function.
 *
 */
const sg                                    = require('sg0');
const {run_v2,build_fnTable}                = require('../../lib/v3/invoke');

module.exports.mkInvokeRa = mkInvokeRa;

// ----------------------------------------------------------------------------------------------------------------------------
function mkInvokeRa(options_, handler, fnName_) {
  var options = options_ || {};
  var getting_fnTable = false;

  // For example, handler.getKey(), options.ttl
  const {sys_argv ={}}    = options;
  var   {fnTable}         = sys_argv;
  get_fnTable(function() {});

  return function(argv_, context, callback) {
    var   {fnName, ...argv}    = argv_;

    fnName = fnName || fnName_;

    // ... call ra
    return get_fnTable(function(err, fnTable) {
      return run_v2({...sys_argv, fnTable}, fnName, argv, continuation, {context});
    });

    // ========================================================
    function continuation(err, data, ...rest) {
      return callback(err, data, ...rest);
    }
  };

  // ========================================================================================================================
  function get_fnTable(callback) {
    if (fnTable) {
      return callback(null, fnTable);
    }

    if (getting_fnTable) {
      // Someone is already getting it... wait
      return retry();
    }

    // Its me... Im getting it
    getting_fnTable = true;

    return build_fnTable(sys_argv, function(err, fnTable_) {
      fnTable           = fnTable_;
      getting_fnTable   = false;

      return callback(err, fnTable);
    });

    // ========================================================
    function retry() {
      if (fnTable) {
        return callback(null, fnTable);
      }

      return sg.setTimeout(10, retry);
    }
  }
}
