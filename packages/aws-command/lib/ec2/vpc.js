
/**
 * @file
 */

const sg                      = require('sg-flow');
const ra                      = require('run-anywhere').v2;
const AWS                     = require('aws-sdk');

const mod                     = ra.modSquad(module);

const ec2 = new AWS.EC2({region: 'us-east-1'});

var lib = {};

mod.xport({getSubnets: function(argv, context, callback) {

  const classB = argv.classB;

  return sg.__runll([function(next) {
    return next();
  }, function(next) {
    return next();
  }, function(next) {
    return next();
  }], function done() {
    return ec2.describeVpcs({}, function(err, data) {
      // console.log(sg.inspect(data), err);

      var result = [];

      if (classB) {
        result = sg.reduce(data.Vpcs || [], result, function(m, vpc) {
          let parts = (vpc.CidrBlock || '').split(/[^0-9]+/);
          if (parts.length === 5 && parts[1] === classB) {
            return sg.ap(m, vpc);
          }
          return m;
        });
      }

      return callback(err, result);
    });
    });

}});
