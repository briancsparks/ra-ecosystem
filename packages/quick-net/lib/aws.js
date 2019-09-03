if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);


const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const AWS                     = require('aws-sdk');
const awsDefs                 = require('./aws-defs');

const mod                     = ra.modSquad(module);

const config_                 = {paramValidation:false, region:'us-east-1', ...awsDefs.options};
const config                  = new AWS.Config(config_);
const ec2                     = new AWS.EC2(config);
const sts                     = new AWS.STS(config);

exports.defs                  = {...awsDefs.options, options:awsDefs.options};

const awsService = function(name, options) {
  const config  = new AWS.Config(sg.merge(config_, options));
  const service = new AWS[name](config);

  return service;
};

const awsFns = function(service, names_, options1, abort) {
  const names = _.isString(names_) ? names_.split(',') : names_;

  var result = sg.reduce(names, {}, (m, fname) => {
    var awsFn = service[fname];
    if (_.isFunction(awsFn)) {

      // We have found the AWS function `awsFn`. What we want, however, is to return
      // a function that integrates much better to the sg-flow and run-anywhere style.

      // --------------------------------------------------------------------------
      var interceptedAwsFn = function(params, ...rest) {
        const continuation  = rest.pop();
        var   options_      = rest.shift() || {};
        var   options       = sg.merge({...options1, ...options_});

        // Defaults
        options.abort   = ('abort' in options ? options.abort : true);

        const callback = function(err, data, ...rest) {
          var   ok = false;
          if (arguments.length === 0)     { ok = true; }
          if (arguments.length > 1)       { ok = sg.ok(err, data, ...rest); }

          // Report normal (ok === true) and errors that are aborted (!ok && options.abort)
          if (options.debug && (ok || (!ok && options.abort))) {
            console.error(`AWS::${fname}(67)`, sg.inspect({params, err, data}));
          }

          if (!ok) {
            if (options.abort) {
              return abort(err);
            }

            // Report, but leave out the verbose error
            if (options.debug) {
              console.error(`AWS::${fname}(23)`, sg.inspect({params, err:(options.verbose ? err : true), data}));
            }
          }

          return continuation(err, data, ...rest);
        };

        if (options.verbose) {
          console.error(`calling AWS::${fname}`, sg.inspect({params}));
        }

        abort.calling(`AWS::${fname}(44)`, params);

        var lastError;
        return sg.until(function(again , lastX, count /*, elapsed*/) {

          // Only try so many times
          if (count > 8) {
            return callback(lastError);
          }

          return awsFn.apply(service, [params, function(err, data, ...rest) {
            lastError = err;
            if (sg.ok(err, data))   { return callback(err, data, ...rest); }

            /* is it one that says retriable, but really isnt? */
            if (err.errno === 'EPIPE') {
              console.error(`----------------------------------------------------------`);
              console.error(`  Error EPIPE might mean your proxy is not setup correctly`);
              console.error(`----------------------------------------------------------`);
              return callback(err, data, ...rest);
            }

            /* otherwise -- is it a retryable error? */
            if (err.retryable) {
              return again(250);
            }

            /* otherwise -- is it one of the known to say not retryable, but really is? */
            if (err.RequestLimitExceeded) {
              return again(1000);
            }

            /* otherwise -- give up, let caller retry on their own, if they want */
            return callback(err, data, ...rest);
          }]);
        }, function(){});
      };
      // --------------------------------------------------------------------------

      return sg.kv(m, fname, interceptedAwsFn);
    }

    // The passed-in name isnt a function on the AWS class
    return abort(`ENOTFN: ${fname}`);
  });

  return result;
};

const awsFilters = function(kvs) {
  return {
    Filters: sg.reduce(_.keys(kvs), [], (m, key) => {
      const Value = kvs[key];
      if (sg.isnt(Value))                     { return m; }
      return [ ...m, {Name: key, Values:kvs[key]}];
    })
  };
};

const awsFilter = function(kvs) {
  return {
    Filter: _.map(_.keys(kvs), (key) => {
      return {Name: key, Values:kvs[key]};
    })
  };
};

const isId = function(type, str) {
  if (sg.isnt(str))                     { return false; }
  if (!str.startsWith(type+'-'))        { return false; }

  var   parts = str.split('-');
  if (parts.length !== 2)               { return false; }

  const hex = parts[1];

  return hex.match(/^[0-9a-zA-Z]+$/);
};

const isVpcId = function(str) {
  return isId('vpc', str);
};

const isAwsProp = function(key, obj) {
  if (sg.isnt(key))     { return false; }

  // Can look at other things.

  return key[0].match(/[A-Z]/);
};

const awsKey = function(key, obj) {
  if (!isAwsProp(key, obj))   { return; }
  return key;
};

const AwsFilterObject = function(obj, ...rest) {
  const result = sg.reduce(obj, {}, (m,v,k) => {
    if (sg.isnt(k))     { return m; }
    if (sg.isnt(v))     { return m; }

    if (k[0].toUpperCase() === k[0]) {
      return sg.kv(m,k,v);
    }

    return m;
  });

  if (rest.length > 0) {
    return sg.merge(result, AwsFilterObject(...rest));
  }

  return result;
};

const getCallerAccount = async function() {
  const identity = await sts.getCallerIdentity({}).promise();
  return identity.Account;
};

const getCallerArn = async function() {
  const identity = await sts.getCallerIdentity({}).promise();
  return identity.Arn;
};

exports.awsService        = awsService;
exports.awsFns            = awsFns;
exports.awsFilters        = awsFilters;
exports.awsFilter         = awsFilter;
exports.isId              = isId;
exports.isVpcId           = isVpcId;
exports.AwsFilterObject   = AwsFilterObject;
exports.isAwsProp         = isAwsProp;
exports.awsKey            = awsKey;
exports.AWS               = AWS;
exports.getCallerArn      = getCallerArn;
exports.getCallerAccount  = getCallerAccount;
