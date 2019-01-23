

const sg                      = require('sg-flow');
const _                       = sg._;
const ra                      = require('run-anywhere').v2;
const AWS                     = require('aws-sdk');
const awsDefs                 = require('./aws-defs');

const mod                     = ra.modSquad(module);

const ec2 = new AWS.EC2({region: 'us-east-1', ...awsDefs.options});

const awsService = function(name, options) {
  const service = new AWS[name](awsDefs.options);

  return service;
}

const awsFns = function(service, names_, abort) {
  const names = _.isString(names_) ? names_.split(',') : names_;

  var result = sg.reduce(names, {}, (m, fname) => {
    var awsFn = service[fname];
    if (_.isFunction(awsFn)) {

      // We have found the AWS function `awsFn`. What we want, however, is to return
      // a function that integrates much better to the sg-flow and run-anywhere style.

      // --------------------------------------------------------------------------
      var interceptedAwsFn = function(params, ...rest) {
        const continuation  = rest.pop();
        var   options       = rest.shift() || {};

        if (options === true)   { options = { debug:true }; }

        // Defaults
        options.abort   = ('abort' in options) ? options.abort : true;

        const callback = function(err, data, ...rest) {
          if (options.abort) {
            if (!sg.ok(err, data))  { return abort(err); }
          }

          if (options.debug) {
            console.log(`AWS::${fname}()`, sg.inspect({params, err, data}));
          }

          return continuation(err, data, ...rest);
        };

        // console.log(`calling AWS::${fname}`);
        abort.calling(`AWS::${fname}`, params);
        return awsFn.apply(service, [params, callback]);
      };
      // --------------------------------------------------------------------------

      return sg.kv(m, fname, interceptedAwsFn);
    }

    // The passed-in name isnt a function on the AWS class
    return abort('ENOTFN');
  });

  return result;
};

const awsFilters = function(kvs) {
  return {
    Filters: _.map(_.keys(kvs), (key) => {
      return {Name: key, Values:kvs[key]};
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

exports.awsService  = awsService;
exports.awsFns      = awsFns;
exports.awsFilters  = awsFilters;
exports.awsFilter   = awsFilter;

