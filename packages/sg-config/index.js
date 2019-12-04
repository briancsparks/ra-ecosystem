/* eslint-disable valid-jsdoc */
if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const { qm, qmResolve }       = require('quick-merge');
var   sg                      = require('sg0');
const { _ }                   = sg._;
const path                    = require('path');
const util                    = require('util');
const AWS                     = require('aws-sdk');

// const awsConfig = { sslEnabled: false, httpOptions: {proxy: 'http://web-proxy.corp.hp.com:8088'}, paramValidation:false, region:'us-east-1' };
const awsConfig = { paramValidation:false, region:'us-east-1' };
const config                  = new AWS.Config(awsConfig);
const lambda                  = new AWS.Lambda(config);


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

/**
 * For when you are defining a config.
 *
 * @param {*} configs
 * @returns
 */
sg.config = function(...args) {
  return new Config(...args);
};

/**
 * For when you want to use/load a configuration.
 *
 * @param {*} dir
 * @param {*} file
 */
sg.configuration = function(...args) {
  var configuration = new Configuration(...args);

  return function(key, callback) {
    return configuration.value(key, callback);
  };
};

sg.Configuration = Configuration;

_.each(sg, (v,k) => {
  exports[k] = v;
});



// -------------------------------------------------------------------------------------
//  Helper Functions
//

function Config(...configs) {
  return qmResolve(...configs);
}

// Assuming new Configuration('racerX')
function Configuration(...args) {
  if (!(this instanceof Configuration))   { return new Configuration(...args); }
  var self      = this;
  var rootName  = args[0];

  self.rootTable  = getRootTable(...args);                                                                  // { racerX: {id: 'racerX'} }
  self.rootKeys   = Object.keys(self.rootTable);                                                            // [ 'racerX' ]

  self.load = function(moreArgs =[], callback) {
    // TODO: do not reload
    // TODO: cache
    const moreKeys = Object.keys(getRootTable(moreArgs));
    var data = {...self.rootTable};
    var params = {
      FunctionName: 'configurationfor',
      Payload:      JSON.stringify({cfg: [...self.rootKeys, ...moreKeys]})
    };

    // console.log(`invoking ${params.FunctionName}`, params);
    return lambda.invoke(params, function(err, data) {
      if (typeof data.Payload === 'string') {
        data.Payload = JSON.parse(data.Payload);
      }
      const keys = Object.keys(data.Payload.body);
      const body = keys.reduce((m, key) => {
        const {event, ...body} = data.Payload.body[key];
        return {...m, [key]:body};
      }, {});                                                                                               // { racerX: {from: {server:42}} }

      self.rootTable = sg.reduce({...body}, {...self.rootTable}, (m,v,k) => {
        return sg.kv(m, k, {...(m[k] ||{}), ...v});
      });                                                                                                   // { racerX: {id: 'racerX', from: {server:42}} }

      return callback(err, {$$$:{orig:data}, body});
    });
  };

  // Get a value (after wait for load())
  self.value = function(key, callback) {
    const ENV_KEY = `config_${rootName}_${key}`.toUpperCase();
    return callback(null, process.env[ENV_KEY]);
  };

  function getRootTable(...args) {
    const argsObjects = args.reduce((m, arg) => [...m, (typeof arg === 'string' ? {[arg]:{}} : arg)], []);    // [{ racerX: {} }]
    const topKeys   = argsObjects.reduce((m, arg) => ({...m, ...sg.keyMirror(arg)}), {});                     // { racerX: 'racerX' }

    return sg.reduce(topKeys, {}, (m0, v, k) => {
      m0[k] = {...(m0[k] ||{}), id:k};
      return sg.reduce(argsObjects, m0, (m, arg) => {
        return sg.kv(m, k, {...m[k] ||{}, ...arg[k]});
      });
    });                                                                                                       // { racerX: {id: 'racerX'} }
  }

  function readRootTableFromName(name) {
  }
}

// var c = Configuration('api__cdr0__net');
// c.load('api__coder00zero__net', function(err, data) {
//   // console.error(c.rootTable);
//   console.log(JSON.stringify({data: err || data, rootTable: c.rootTable}));
// });
