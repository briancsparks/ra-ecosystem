/* eslint-disable valid-jsdoc */

/**
 * @file
 */
const sg0                     = require('sg0');
const sg                      = sg0.merge(sg0, require('sg-diag'), require('sg-flow'));
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

module.exports.getCache = getCache;


//===========================================================================================================================
function getCache(key, options, expensiveOp, last) {
  const [onMiss, onHit, callback]   = crackLast(last);
  var   [redis, close]              = localRedis.mkConnection();
  var   {ttl}                       = options;

  var theNewWay = options.theNewWay;
  if (!theNewWay) {
    return redis.GET(key, function(err, cacheData_) {       // ===========================================      This is where data was just read out of redis
      var   cacheData = cacheData_;

      if (err)  { return fin(err); }

      if (sg.ok(err, cacheData_)) {
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
  }

  // New version that allows notification of hits and misses
  return redis.GET(key, function(err, cacheData_) {       // ===========================================      This is where data was just read out of redis
    var   cacheData = cacheData_;

    if (err)  { return fin(err); }

    if (sg.ok(err, cacheData_)) {
      // Hit
      cacheData = sg.safeJSONParse(cacheData_) || cacheData_;

      diag.v(`Retrieved key: (${key}) from cache`, smlog({err, cacheData}));
      return onHit(cacheData, function(err, newCacheData, storeIt) {
        cacheData = sg.ok(err, newCacheData) ? newCacheData : cacheData;

        return passItOn(cacheData, storeIt);
      });
    }

    diag.v(`CacheMiss on key: (${key}) from cache`, {err, cacheData});
    return onMiss(function(err, newCacheData, skipStoringIt) {
      if (err)  { return fin(err); }
      cacheData = newCacheData;

      return passItOn(cacheData, !skipStoringIt);
    });

    function passItOn(newCacheData, storeIt) {
      if (!storeIt) {
        return fin(null, newCacheData);
      }

      return storeCache(key, newCacheData, function(err, storeRectipt) {
        if (err) { return fin(err); }
        return fin(err, newCacheData, storeRectipt);
      });
    }
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

      return storeCacheCallback(err, result);
    });
  }

  function fin(err, ...args) {
    // Return the results, then stick around to finish up.
    callback(err, ...args);

    if (!err) {
      // Now, set the TTL on the key, so it doesnt stick around forever
      return redis.EXPIRE(key, ttl, function(err, result) {
        diag.v(`Stored key: (${key}) in cache`, {err, result});         // Report the results, but do not block

        return closeIt();
      });
    }

    return closeIt();

    function closeIt() {
      // Need to keep the connection open until we are done
      close();
    }
  }

  function crackLast(last) {
    if (typeof last === 'function') {
      return [defOnMiss, defOnHit, last];
    } else {
      return [last.onMiss || defOnMiss, last.onHit || defOnHit, last.callback];
    }
  }

  function defOnMiss(callback) {
    return expensiveOp(function(err, newCacheData, ...rest) {
      return callback(err, newCacheData, ...rest);
    });
  }

  function defOnHit(data, callback) {
    return callback();
  }
}

