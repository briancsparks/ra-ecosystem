

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-flow');
const { _ }                   = sg;
const awsDefs                 = require('../aws-defs');
const AWS                     = require('aws-sdk');
const superb                  = require('superb');

const mod                     = ra.modSquad(module);

const config                  = new AWS.Config({paramValidation:false, region:'us-east-1', ...awsDefs.options});
const ec2                     = new AWS.EC2(config);

mod.xport({tag: function(argv, context, callback) {

  const type      = argv.type;
  const Resources = sg.ap([...(argv.resources || []), ...(argv.ids || [])], argv.resource, argv.id);

  // const tags  = argv.tags || exports.mkTags(type, argv.rawTags);
  const tags  = { ...exports.mkTags(type, argv.rawTags, argv.adjective, argv.suffix),  ...(argv.tags || {}) };
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

exports.mkTags = function(type, seed, adjective, suffix) {
  if (sg.isnt(seed))      { return; }

  var result = sg.reduce(seed || {}, {}, (m, v, k) => {
    // v === true means caller wants us to fill in
    if (v === true) {
      return sg.kv(m, k, gTags[k.toLowerCase()] || process.env[k.toLowerCase()] || nonsense(k, type, adjective, suffix));
      // return sg.kv(m, k, gTags[k.toLowerCase()] || process.env[k.toLowerCase()]);
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

function nonsense(str, type, adjective_, suffix) {
  var   adjective = adjective_ || superb.random();

  if (str.toLowerCase() === 'name') {
    return _.compact([adjective, type, suffix]).join('-');
  }

  return `${adjective}-${str}`;
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
