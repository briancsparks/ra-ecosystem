if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

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
const { getQuiet }            = ra.utils;

const mod                     = ra.modSquad(module, 'datatapFanout');


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

mod.xport({pushData: function(argv, context, callback) {

  if (process.env.NO_REDIS) {
    return callback(null, {});
  }

  /*
    quick-net pushData --name=them --data='{\"a\":42}'
  */

  const { rax }           = ra.getContext(context, argv);
  const { redis, close }  = redisUtils.getRedis(context);
  const quiet             = getQuiet(context);

  const localAbort = function(err, msg) {
    if (msg) { sg.logError(err, msg, {}, {EFAIL:`pushData`}); }

    sg.elog(`fanout::abort`, {err});
    return allDone(err);
  };

  return rax.iwrap(localAbort, function(abort) {

    const { SMEMBERS }    = rax.wrapFns(redis, 'SMEMBERS', rax.opts({emptyOk:true}));
    const { LPUSH }       = rax.wrapFns(redis, 'LPUSH',    rax.opts({}));
    const { EXPIRE }      = rax.wrapFns(redis, 'EXPIRE',   rax.opts({abort:false}));

    const status            = false;
    const dataTypeName      = (status ? 'status' : 'feed');
    var   signalName        = rax.arg(argv, 'signalName,name')            || ((argv._ && argv._.length) > 0 ? argv._.shift() : null);
    const key               = rax.arg(argv, 'key')                        || (signalName && `datatap:${dataTypeName}from:${signalName}`);
    const data_             = rax.arg(argv, 'data', {required:true});

    if (rax.argErrors({key}))    { return rax.abort(); }

    var   data    = data_;
    if (_.isString(data)) {
      data = sg.safeJSONParse(data) || data;
    }
    if (sg.isObject(data)) {
      data = {...data, __from__: key};
    }

    var   result = [];
    return SMEMBERS(key, rax.opts({}), (err, destKeys) => {

      if (err)                        { return allDone(err); }
      if (!destKeys)                  { return allDone(null, result); }
      if (destKeys.length === 0)      { return allDone(null, result); }

      const done    = _.after(destKeys.length, allDone);
      const dataStr = (_.isString(data) ? data : JSON.stringify(data));

      return destKeys.forEach(destKey => {
        return LPUSH(destKey, dataStr, rax.opts({}), function(err, redisReceipt) {
          if (!quiet)  { sg.log(`LPUSH ${destKey}`, {err, redisReceipt}); }
          result.push({[destKey]:{redisReceipt}});

          return EXPIRE(destKey, 20, rax.opts({}), (err, receipt) => {
            if (!quiet)  { sg.log(`EXPIRE ${destKey} 20`, {err, receipt}); }
            return done(err, result);
          });
        });
      });

    });
  });

  function allDone(...args) {
    close();
    callback(...args);
  }
}});

mod.xport({pushAction: function(argv_, context, callback) {
  var   argv = Object.assign({}, argv_);

  /*
    quick-net pushAction --name=tsvdata --type=ADD_SOMETHING_OR_OTHER --payload='{\"a\":42}'
    quick-net pushAction --name=tsvdata --type=ADD_SOMETHING_OR_OTHER --payload='@filename'
  */

  const { rax }  = ra.getContext(context, argv);
  return rax.iwrap2(function( /*abort*/ ) {
    const { pushData } = rax.loads2('pushData');

    const type              = rax.extractArg(argv, 'type',     {required:true});
    const payload           = rax.extractArg(argv, 'payload',  {required:true, json:true});

    if (rax.argErrors())    { return rax.abort(); }

    const data = {type, payload};

    return pushData({...argv, data}, callback);
  });
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


