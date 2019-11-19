
/**
 * @file
 *
 * Calls an RA function.
 *
 */
const sg                      = require('sg0');
const {logSmData}             = require('../../lib/v3/utils');
const {
  run_v2,
  build_fnTable,
  build_fnTableSmart,
}                             = require('../../lib/v3/invoke');
const {assertArgvContext}     = require('../utils');

module.exports.mkInvokeRa     = mkInvokeRa;
module.exports.mkInvokeRaV2   = mkInvokeRaV2;
module.exports.getFnTable     = getFnTable;

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
    // assertArgvContext(`invoke-ra.enter`, true, argv, false, context, __filename);

    fnName = fnName || fnName_;

    // ... call ra
    return get_fnTable(function(err, fnTable) {
      assertArgvContext(`invoke-ra.pre-run-v2`, true, argv, false, context, __filename);
      return run_v2({...sys_argv, fnTable}, fnName, argv, continuation, {context});
    });

    // ========================================================
    function continuation(err, data, ...rest) {
      // console.log(`invoke-ra-continuation`, {err, ...logSmData({data, rest})});
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

    return build_fnTableSmart(sys_argv, function(err, fnTable_) {
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

// ----------------------------------------------------------------------------------------------------------------------------
function mkInvokeRaV2(fnTable, getRequestInfo) {

  return function(argv, context, callback) {
    return getRequestInfo(argv, context, function(err, info) {
      var   {fnName, sys_argv}    = info;

      assertArgvContext(`invoke-ra.pre-run2-v2`, true, argv, false, context, __filename);
      return run_v2({...sys_argv, fnTable}, fnName, argv, continuation, {context});

      // ========================================================
      function continuation(err, data, ...rest) {
        // console.log(`invoke-ra-continuation`, {err, ...logSmData({data, rest})});
        return callback(err, data, ...rest);
      }
    });
  };
}

// ----------------------------------------------------------------------------------------------------------------------------
function getFnTable(sys_argv, callback) {
  return build_fnTableSmart(sys_argv, function(err, fnTable) {
    return callback(err, fnTable);
  });
}
