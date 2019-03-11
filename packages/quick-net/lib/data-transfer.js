
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
const request                 = require('superagent');

const mod                     = ra.modSquad(module, 'dataTransfer');


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

mod.xport({fetchAndCache: function(argv, context, callback) {

  // ra invoke lib\ec2\.js fetchAndCache --arg=

  const ractx             = context.runAnywhere || {};
  const { rax }           = ractx.dataTransfer__fetchAndCache;
  const { redis, close }  = redisUtils.getRedis(context);

  var   haveReturnedToClient = false;
  return rax.iwrap(rax.mkLocalAbort(allDone), function(abort) {

    const { GET }           = rax.wrapFns(redis, 'GET', rax.opts({emptyOk:true, abort:false}));
    const { SET }           = rax.wrapFns(redis, 'SET', rax.opts({emptyOk:true}));

    const key               = rax.arg(argv, 'key');
    const url               = rax.arg(argv, 'url', {required:true});

    if (rax.argErrors())    { return rax.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return GET(key, function(err, data) {
        sg.elog(`GET ${key}`, {err, data});

        // We try to get from redis. If we are successful, we still fetch from the API,
        // because that is what pre-ish-warms the API

        if (sg.ok(err) && data)  {

          const result = sg.safeJSONParse(data) || {just:data};
          sg.elog(`alldone`, {result, haveReturnedToClient});

          if (!haveReturnedToClient) {
            haveReturnedToClient = true;
            callback(null, result);
          }

          // No return here... go on to fetch from the API
        }

        return next();
      });

    }, function(my, next) {
      return request.get(url).end(function(err, res) {
        if (sg.ok(err, res) && res.ok) {
          console.log(`super`, sg.keys(res), sg.inspect({body: res.body}));

          if (res.body) {
            my.body = res.body;
            return next();
          }
        }

        return abort(err);
      });

    }, function(my, next) {
      const json = JSON.stringify(my.body || {});
      return SET([key, json], function(err, receipt) {
        sg.elog(`SET ${key} ${json}`, {err, receipt});
        return next();
      });

    }, function(my, next) {
      return allDone(null, my.body);
    }]);
  });


  function allDone(...args) {
    sg.elog(`allDone`, {args, haveReturnedToClient});

    close();

    if (!haveReturnedToClient) {
      haveReturnedToClient = true;
      return callback(...args);
    }
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


