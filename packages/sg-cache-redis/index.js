/* eslint-disable valid-jsdoc */

/**
 * @file
 */
const sg0                     = require('sg0');
const sg                      = sg0.merge(sg0, require('sg-diag'));
const { _ }                   = sg;
const fs                      = require('fs');
const path                    = require('path');
const quickMerge              = require('quick-merge');
const AWS                     = require('aws-sdk');
const {smlog}                 = require('@sg0/sg-smart-value/logging');
const localRedis              = require('./lib/redis');
const DIAG                    = sg.DIAG(module);

const qm                      = quickMerge.quickMergeImmutable;

// const ARGV                    = sg.ARGV();
// const ENV                     = sg.ENV();
const diag                    = DIAG.dg;



//===========================================================================================================================
function getCache(key, expensiveOp, callback) {
  var [redis, close] = localRedis.mkConnection();

  return redis.GET(key, function(err, cacheData_) {       // ===========================================      This is where data was just read out of redis
    var   cacheData = cacheData_;

    if (err)  { return fin(err); }

    if (sg0.ok(err, cacheData_)) {
      cacheData = sg.safeJSONParse(cacheData_) || cacheData_;
      diag.v(`Retrieved key: (${key}) from cache`, smlog({err, cacheData}));
      return fin(null, cacheData);
    }
    diag.v(`CacheMiss on key: (${key}) from cache`, {err, cacheData});

    return expensiveOp(function(err, data) {
      if (err)  { return fin(err); }

      return storeCache(key, data, function(err, storeRectipt) {
        if (err) { return fin(err); }
        return fin(err, data, storeRectipt);
      });
    });
  });

  //===========================================================================================================================
  function storeCache(key, data_, storeCacheCallback) {

    // Stringify the payload
    var data;
    if (typeof data_ === 'string') {
      data = `{"__Just__":"${data_}"}`;
    } else {
      data = sg.safeJSONStringify(data_);
    }

    // Insert `data` at the `key`
    return redis.SET(key, data, function(err, result) {           // ===========================================      This is where data gets put into redis
      diag.v(`Stored key: (${key}) in cache`, smlog({data, err, result}));

      // Now, set the TTL on the key, so it doesnt stick around forever
      redis.EXPIRE(key, /*ttl=*/40, function(err, result) {
        // Report the results, but do not block
        diag.v(`Stored key: (${key}) in cache`, {err, result});
      });

      return storeCacheCallback(err, result);
    });
  }

  function fin(...args) {
    close();
    return callback(...args);
  }
}

