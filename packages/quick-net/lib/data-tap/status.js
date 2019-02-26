
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


// Put at top of file
//const libAws                  = require('../aws');


mod.xport({pushStatus: function(argv, context, callback) {

  // ra invoke lib\ec2\.js pushStatus --arg=

  const ractx     = context.runAnywhere || {};
  const { rax }   = ractx.datatapStatus__pushStatus;
  const dquiet    = getDQuiet(context);

  return rax.iwrap(function(abort) {

    const { pushData } = rax.loads(libFanout, 'pushData', rax.opts({}), abort);

    const name              = rax.arg(argv, 'name', {required:true});
    const data              = rax.arg(argv, 'data', {required:true});

    if (rax.argErrors())    { return rax.abort(); }

    // TODO: push to my listeners, and global status slot

    return pushData({name, data}, rax.opts({}), (err, receipt) => {
      if (!dquiet)  { sg.log(`pushData ${name}`, {data, err, receipt}); }
      return callback(err, receipt);
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


