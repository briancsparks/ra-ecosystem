
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
const libFanout               = require('./fanout');
const redisUtils              = ra.redisUtils;
const { getDQuiet }           = ra.utils;

const mod                     = ra.modSquad(module, 'datatapStatus');


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

mod.xport({pushStatus: function(argv, context, callback) {

  // ra invoke lib\ec2\.js pushStatus --name=them --data='{\"msg\":\"my updated status\"}'

  const ractx               = context.runAnywhere || {};
  const { rax }             = ractx.datatapStatus__pushStatus;
  const { redis, close }    = redisUtils.getRedis(context);
  const dquiet              = getDQuiet(context);

  return rax.iwrap(function(abort) {

    const { pushData } = rax.loads(libFanout, 'pushData', rax.opts({}), abort);

    const status            = true;
    const dataTypeName      = (status ? 'status' : 'feed');
    const name              = rax.arg(argv, 'name', {required:true});
    const data              = rax.arg(argv, 'data', {required:true});

    if (rax.argErrors())    { return rax.abort(); }

    var   key = `datatap:${dataTypeName}from:${name}`;
    return pushData({key, data}, rax.opts({}), (err, receipt) => {
      if (!dquiet)  { sg.log(`pushData ${key}`, {data, err, receipt}); }

      key = `datatap:${dataTypeName}`;
      return pushData({key, data}, rax.opts({}), (err, receipt) => {
        if (!dquiet)  { sg.log(`pushData ${key}`, {data, err, receipt}); }

        close();
        return callback(err, receipt);
      });
    });
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


