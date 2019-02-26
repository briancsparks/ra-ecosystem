
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const redisUtils              = ra.redisUtils;
const { getDQuiet }           = ra.utils;

const mod                     = ra.modSquad(module, 'datatapFanout');


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

mod.xport({pushData: function(argv, context, callback) {

  // ra invoke lib\ec2\.js pushData --name=them --data='{\"a\":42}'

  const ractx             = context.runAnywhere || {};
  const { rax }           = ractx.datatapFanout__pushData;
  const { redis, close }  = redisUtils.getRedis(context);
  const dquiet            = getDQuiet(context);

  const localAbort = function(err, msg) {
    if (msg) { sg.logError(err, msg, {}, {EFAIL:`pushData`}); }

    sg.elog(`fanout::abort`, {err});
    return allDone(err);
  };

  return rax.iwrap(localAbort, function(abort) {

    const { smembers }    = redisUtils.redisFns(redis, 'smembers', rax.opts({emptyOk:true}), abort);
    const { lpush }       = redisUtils.redisFns(redis, 'lpush', rax.opts({}), abort);

    const status            = false;
    const dataTypeName      = (status ? 'status' : 'feed');
    var   signalName        = rax.arg(argv, 'signalName,name');
    const key               = rax.arg(argv, 'key')                        || (signalName && `datatap:${dataTypeName}from:${signalName}`);
    const data              = rax.arg(argv, 'data', {required:true});

    if (rax.argErrors({key}))    { return rax.abort(); }

    var   result = [];
    return smembers(key, rax.opts({}), (err, destKeys) => {

      if (err)                        { return allDone(err); }
      if (!destKeys)                  { return allDone(null, result); }
      if (destKeys.length === 0)      { return allDone(null, result); }

      const done    = _.after(destKeys.length, allDone);
      const dataStr = (_.isString(data) ? data : JSON.stringify(data));

      return destKeys.forEach(destKey => {
        return lpush(destKey, dataStr, rax.opts({}), function(err, redisReceipt) {
          if (!dquiet)  { sg.log(`lpush ${destKey}`, {err, redisReceipt}); }
          result.push({[destKey]:{redisReceipt}});
          return done(err, result);
        });
      });

    });
  });

  function allDone(...args) {
    close();
    callback(...args);
  }
}});


// -------------------------------------------------------------------------------------
// routes
//


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//


