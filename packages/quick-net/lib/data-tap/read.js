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

const mod                     = ra.modSquad(module, 'datatapRead');


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//


mod.xport({readData: function(argv, context, callback) {

  if (process.env.NO_REDIS) {
    return callback(null, []);
  }

  /*
    quick-net readData --name=us --from=them --hold=500
    quick-net readData --name=us --from=them --hold=500 --status
    quick-net readData --name=us --hold=500 --status
  */

  const { rax }           = ra.getContext(context, argv);
  const { redis, close }  = redisUtils.getRedis(context);
  const quiet             = getQuiet(context);

  const blockingClient    = redis.duplicate();

  // Needed for cleanup
  var   fromList;

  var   result            = [];

  const localAbort = function(err, msg) {
    if (msg) { sg.logError(err, msg, {}, {EFAIL:`pushData`}); }
    return allDone(err);
  };

  return rax.iwrap(localAbort, function(abort) {

    const { SADD }                  = rax.wrapFns(redis, 'SADD',            rax.opts({}));
    const { LLEN,DEL,EXPIRE }       = rax.wrapFns(redis, 'LLEN,EXPIRE,DEL', rax.opts({abort:false}));

    const holdFor           = argv.holdfor      || argv.hold    || 25;
    const iteration         = argv.iteration    || argv.iter    || 1;
    const status            = argv.status;
    const name              = argv.name;
    const from              = argv.fromList     || argv.from;

    fromList                = sg.arrayify(from);

    const dataTypeName      = (status ? 'status' : 'feed');
    const dataFeedName      = `datatap:${dataTypeName}:${name}`;

    if (sg.isnt(name))      { return allDone(new Error(`ENONAME`)); }
    if (sg.isnt(from)) {
      if (!status)          { return allDone(new Error(`ENOFROM`)); }
    }

    if (rax.argErrors())    { return rax.abort(); }

    // Build the key list
    fromList = sg.keys(sg.reduce(sg.arrayify(from), {}, (m, fromName) => {
      const feedFromKey = `datatap:${dataTypeName}from:${fromName}`;
      return sg.kv(m, feedFromKey, feedFromKey);
    }));

    if (status) {
      fromList.push(`datatap:status`);
    }

    return clearDataForFirstIter();
    function clearDataForFirstIter() {
      if (iteration >= 2)   { return setDataRetrieval(holdFor); }

      // If this is the first time getting this data, clear out any stale data
      return DEL(dataFeedName, rax.opts({}), (err, receipt) => {
        if (!quiet)  { sg.log(`DEL ${dataFeedName}`, {err, receipt}); }

        return setDataRetrieval(holdFor);
      });
    }

    // Set the listener on changes
    function setDataRetrieval(timeoutSecs, dataFeedName_ = dataFeedName) {
      // We try to get more than one data chunk, if possible. But if we've gotten enough already...
      if (result.length >= 5)   { return allDone(); }

      // Block and wait for data
      blockingClient.brpop(dataFeedName_, timeoutSecs, (err, data) => {
        if (!quiet) {
          sg.log(`------------------------------------------------`);
          sg.log(`brpop ${dataFeedName_}`, {err, data});
        }

        if (err)                { return allDone(err); }
        if (!data)              { return allDone(); }        /* timed out */

        const [ readFeedName, payloadStr ]   = data;

        // Add the new data to our result
        const json    = sg.safeJSONParse(payloadStr) || {};
        const payload = sg.merge({channel: readFeedName}, {from: sg.extract(json, '__from__')}, {[dataTypeName]:json});
        result = [ ...result, ...[payload] ];

        // See if there are more data elements to be gotten
        return LLEN(readFeedName, rax.opts({}), (err, count) => {
          if (err)  { return allDone(err); }

          if (count > 0) {
            return setDataRetrieval(1, readFeedName);
          }

          return allDone();
        });
      });

      return setSources();
    }

    // Set which items we are watching
    function setSources() {
      const next = _.after(fromList.length, () => {
        return setSourcesDone();
      });

      return fromList.forEach(feedFromKey => {

        return SADD(feedFromKey, dataFeedName, rax.opts({}), (err, receipt) => {
          if (!quiet)  { sg.log(`SADD ${feedFromKey} ${dataFeedName}`, {err, receipt}); }

          if (!err) {
            EXPIRE(feedFromKey, holdFor, rax.opts({}), (err, receipt) => {
              if (!quiet)  { sg.log(`EXPIRE ${feedFromKey} ${holdFor}`, {err, receipt}); }
            });
          }

          return next();
        });
      });

      function setSourcesDone() {
        if (!quiet)  { sg.log(`setSourcesDone`); }
        if (context.isRaInvoked) {
          sg.elog(`waiting for ${fromList}`);
        }
      }
    }
  });

  function allDone(err) {
    return removeKeys();
    function removeKeys() {

      const next = _.after(fromList.length, cleanup);

      return fromList.forEach(fromClientId => {
        // return redis.del(fromClientId, function(err, receipt) {
        //   if (!quiet)   console.log(`redis.DEL ${fromClientId}`, {err, receipt});

          // console.log(`redis.DEL-x ${fromClientId}`);

          return next();
        // });
      });
    }


    function cleanup() {
      close();
      blockingClient.quit();

      if (err) {
        return callback(err, result);
      }

      return callback(null, result);
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


