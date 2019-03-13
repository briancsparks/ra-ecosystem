
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
const libHttp                 = require('./http');
const request                 = require('superagent');

const mod                     = ra.modSquad(module, 'dataTransfer');


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

// TODO: add modes always fetch, or not.
mod.xport({fetchAndCache: function(argv, context, callback) {

  // ra invoke lib\ec2\.js fetchAndCache --arg=

  const ractx             = context.runAnywhere || {};
  const { rax }           = ractx.dataTransfer__fetchAndCache;
  const { redis, close }  = redisUtils.getRedis(context);

  var   haveGivenResult = false;
  return rax.iwrap(rax.mkLocalAbort(allDone), function(abort) {

    const { GET,EXPIRE }    = rax.wrapFns(redis, 'GET,EXPIRE', rax.opts({emptyOk:true, abort:false}));
    const { SET }           = rax.wrapFns(redis, 'SET', rax.opts({emptyOk:true}));

    const key               = rax.arg(argv, 'key');
    const url               = rax.arg(argv, 'url', {required:true});

    if (rax.argErrors())    { return rax.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {

      return GET(key, function(err, data) {
        // sg.elog(`redis GET ${key}`, {err, data});

        // We try to get from redis. If we are successful, we still fetch from the API,
        // because that is what warms the API

        if (sg.ok(err) && data)  {

          const result = sg.safeJSONParse(data) || {just:data};
          // sg.elog(`alldone`, {haveGivenResult, result});

          if (!haveGivenResult) {
            haveGivenResult = true;
            callback(null, result);
          }

          // No return here... go on to fetch from the API
        }

        return next();
      });

    }, function(my, next) {
      return request.get(url).end(function(err, res) {
        // const response = libHttp.superagentPodResponse(res);
        // sg.elog(`superagent GET ${url}`, {err: libHttp.superagentPodErr(err), response});

        if (sg.ok(err, res) && res.ok) {
          // console.log(`super`, sg.keys(res), sg.inspect({body: res.body}));

          if (res.body) {
            my.body = res.body;
            return next();
          }
        }

        // The fetch failed.
        return abort(libHttp.superagentPodErr(err), `fetch ${url} failed.`);
      });

    }, function(my, next) {
      const json = JSON.stringify(my.body || {});
      return SET([key, json], function(err, receipt) {
        // sg.elog(`SET ${key} ${json}`, {err, receipt});

        return EXPIRE([key, 1 * 60 * 60 /* one hour */], (err, receipt) => {
          return next();
        });
      });

    }, function(my, next) {
      return allDone(null, my.body);
    }]);
  });


  function allDone(...args) {
    // sg.elog(`allDone`, {haveGivenResult, args});

    close();

    if (!haveGivenResult) {
      haveGivenResult = true;
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


