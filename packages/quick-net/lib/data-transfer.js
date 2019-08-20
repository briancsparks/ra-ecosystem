
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
const { qm }                  = require('quick-merge');
const redisUtils              = ra.redisUtils;
const { getQuiet }            = ra.utils;
const { smJson }              = require('./utils');
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

  // console.log(`fetchandcache`, sg.inspect({
  //   argv,
  //   context : {...qm(_.omit(context, 'runAnywhere'), {
  //     runAnywhere: {..._.pick(context.runAnywhere, 'req_url', 'current', 'event', 'stage'),
  //       current: {..._.omit(context.runAnywhere.current, 'rax')}
  //     }
  //   })}}));

  // ra invoke lib\ec2\.js fetchAndCache --arg=

  const ractx             = context.runAnywhere || {};
  const { rax }           = ractx.dataTransfer__fetchAndCache;
  const quiet             = getQuiet(context);
  const { redis, close }  = process.env.NO_REDIS ? {redis:{}, close:noop} : redisUtils.getRedis(context);

  var   key, url;
  var   haveGivenResult = false;
  return rax.iwrap(rax.mkLocalAbort(allDone), function(abort) {

    const { GET,EXPIRE }    = rax.wrapFns(redis, 'GET,EXPIRE', rax.opts({emptyOk:true, abort:false}));
    const { SET }           = rax.wrapFns(redis, 'SET', rax.opts({emptyOk:true}));

    key                     = rax.arg(argv, 'key');
    url                     = rax.arg(argv, 'url', {required:true});

    if (rax.argErrors())    { return rax.abort(); }

    return sg.__run2({result:{}}, callback, [function(my, next, last) {
      if (process.env.NO_REDIS) { return next(); }

      return GET(key, function(err, data) {
        if (!quiet) { sg.elog(`GET ${key}`, {err, data: smJson(data)}); }

        // We try to get from redis. If we are successful, we still fetch from the API,
        // because that is what warms the API

        if (sg.ok(err) && data)  {

          const result = sg.safeJSONParse(data) || {just:data};
          // sg.elog(`alldone`, {haveGivenResult, result});

          if (!haveGivenResult) {
            haveGivenResult = true;

            if (!quiet) { sg.elog(`fetchAndCache GET(${key})`, {err, data: smJson(data)}); }
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
      if (process.env.NO_REDIS) { return next(); }

      const json = JSON.stringify(my.body || {});
      return SET([key, json], function(err, receipt) {
        if (!quiet) { sg.elog(`SET ${key} |${smJson(json)}|`, {err, receipt}); }

        const ttl = 1 * 60 * 60; /* one hour */
        return EXPIRE([key, ttl], (err, receipt) => {
          if (!quiet) { sg.elog(`EXPIRE ${key} ${ttl}`, {err, receipt}); }
          return next();
        });
      });

    }, function(my, next) {
      return allDone(null, my.body);
    }]);
  });

  function allDone(err, data) {
    // sg.elog(`allDone`, {haveGivenResult, args});

    close();

    if (!haveGivenResult) {
      haveGivenResult = true;

      if (!quiet) { sg.elog(`fetchAndCache superagent(${url})`, {err, data: smJson(data)}); }
      return callback(err, data);
    }
  }
}});

mod.xport({fetchAndCacheSimple: function(argv, context, callback) {

  // console.log(`fetchandcache`, sg.inspect({
  //   argv,
  //   context : {...qm(_.omit(context, 'runAnywhere'), {
  //     runAnywhere: {..._.pick(context.runAnywhere, 'req_url', 'current', 'event', 'stage'),
  //       current: {..._.omit(context.runAnywhere.current, 'rax')}
  //     }
  //   })}}));

  // ra invoke lib\ec2\.js fetchAndCache --arg=


  const { rax }           = ra.getContext(context, argv);
  const { redis, close }  = process.env.NO_REDIS ? {redis:{}, close:noop} : redisUtils.getRedis(context);
  const quiet             = getQuiet(context);

  var   key, url;

  return rax.iwrap2(rax.mkLocalAbort(allDone), function(abort) {
    const { GET,EXPIRE }    = rax.wrapFns(redis, 'GET,EXPIRE', rax.opts({emptyOk:true, abort:false}));
    const { SET }           = rax.wrapFns(redis, 'SET', rax.opts({emptyOk:true}));

    key                     = rax.arg(argv, 'key');
    url                     = rax.arg(argv, 'url', {required:true});

    if (rax.argErrors())    { return rax.abort(); }

    return rax.__run2({result:{}}, callback, [function(my, next, last) {
      if (process.env.NO_REDIS) { return next(); }

      return GET(key, function(err, data) {
        if (!quiet) { sg.elog(`GET ${key}`, {err, data: smJson(data)}); }

        // We try to get from redis.

        if (sg.ok(err) && data)  {

          const result = sg.safeJSONParse(data) || {just:data};
          // sg.elog(`alldone`, {result});

          return allDone(null, result);
        }

        return next();
      });

    }, function(my, next) {

      // Get the URL

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
      if (process.env.NO_REDIS) { return next(); }

      // Put the result into the cache

      const json = JSON.stringify(my.body || {});
      return SET([key, json], function(err, receipt) {
        if (!quiet) { sg.elog(`SET ${key} |${smJson(json)}|`, {err, receipt}); }

        const ttl = 1 * 60 * 60; /* one hour */
        return EXPIRE([key, ttl], (err, receipt) => {
          if (!quiet) { sg.elog(`EXPIRE ${key} ${ttl}`, {err, receipt}); }
          return next();
        });
      });

    }, function(my, next) {
      return allDone(null, my.body);
    }]);
  });


  function allDone(err, data) {
    if (!quiet) { sg.elog(`fetchAndCache superagent(${url})`, {err, data: smJson(data)}); }

    close();
    return callback(err, data);
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

function noop(){}

