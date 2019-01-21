

const sg                      = require('sg-flow');
const ra                      = require('run-anywhere').v2;
const awsDefs                 = require('../aws-defs');
const AWS                     = require('aws-sdk');
const superb                  = require('superb');

const mod                     = ra.modSquad(module);

const ec2 = new AWS.EC2({region: 'us-east-1', ...awsDefs.options});


mod.xport({tag: function(argv, context, callback) {

  const type      = argv.type;
  const Resources = sg.ap([...(argv.resources || []), ...(argv.ids || [])], argv.resource, argv.id);

  const tags  = argv.tags || exports.mkTags(type, argv.rawTags);
  const Tags  = sg.reduce(tags || {}, [], (m, Value, Key) => {
    return sg.ap(m, {Key, Value});
  });

  return ec2.createTags({Resources, Tags}, function(err, data) {
    // console.error(`ct`, sg.inspect({argv, Resources, Tags, err, data}));
    return callback(err, data);
  });

  // return callback(null, {Resources, Tags});
}});

const gTags = {
  namespace:  process.env.NAMESPACE || process.env.NS,
  owner:      process.env.OWNER
};

exports.mkTags = function(type, seed) {
  if (sg.isnt(seed))      { return; }

  var result = sg.reduce(seed || {}, {}, (m, v, k) => {
    // v === true means caller wants us to fill in
    if (v === true) {
      return sg.kv(m, k, gTags[k.toLowerCase()] || process.env[k.toLowerCase()] || nonsense(k, type));
    }

    // v === false means not to include it
    if (v === false) {
      return m;
    }

    return sg.kv(m, k, v);
  });

  return result;
  // return {tags: result};
};

function nonsense(str, type) {
  if (str.toLowerCase() === 'name') {
    return `${superb.random()}-${type}`;
  }

  return `${superb.random()}-${str}`;
}

// (function() {
//   var params = {
//     resources: ['abcd', '1234'],
//     resource: 'defg',
//     tags: {
//       foo: 'bar',
//       bazz: 42,
//       nonsense:true,
//       namespace:true
//     }
//   };

//   console.error(exports.mkTags(params.tags));

//   // exports.tag(params, {}, function(err, data) {
//   //   console.error(sg.inspect({err, data}));
//   // });
// }());
