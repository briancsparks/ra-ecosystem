
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
    return allDone(err);
  };

  return rax.iwrap(localAbort, function(abort) {

    const { smembers,lpush } = redisUtils.redisFns(redis, 'smembers,lpush', rax.opts({}), abort);

    var   signalName        = rax.arg(argv, 'signalName,name', {required:true});
    const data              = rax.arg(argv, 'data', {required:true});

    if (rax.argErrors())    { return rax.abort(); }

    signalName = `datatap:feedfrom:${signalName}`;
    return smembers(signalName, rax.opts({}), (err, destKeys) => {

      if (err)                        { return allDone(err); }
      if (!destKeys)                  { return allDone(); }
      if (destKeys.length === 0)      { return allDone(); }

      const done    = _.after(destKeys.length, allDone);
      const dataStr = (_.isString(data) ? data : JSON.stringify(data));

      return destKeys.forEach(destKey => {
        return lpush(destKey, dataStr, rax.opts({}), function(err, redisReceipt) {
          if (!dquiet)  { sg.log(`lpush ${destKey}`, {err, redisReceipt}); }
          return done(err, {lpush:redisReceipt});
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


