

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

      var protectedFn = function(params, continuation) {

        const callback = function(err, data, ...rest) {
          if (!sg.ok(err, data))  { return abort(err); }

          // console.log(`hello from con ${fname}`, sg.inspect({err, data}));

          return continuation(err, data, ...rest);
        };

        abort.calling(`AWS::${fname}`, params);
        return awsFn.apply(service, [params, callback]);
      };

      return sg.kv(m, fname, protectedFn);
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

exports.awsService  = awsService;
exports.awsFns      = awsFns;
exports.awsFilters  = awsFilters;

