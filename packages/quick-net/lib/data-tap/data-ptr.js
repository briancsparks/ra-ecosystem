
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
const libFanout               = require('./fanout');
const { getDQuiet }           = ra.utils;

const mod                     = ra.modSquad(module, 'datatapDataPtr');

// -------------------------------------------------------------------------------------
//  Data
//

mod.xport({pushDataPtr: function(argv, context, callback) {

  // ra invoke lib\ec2\.js pushDataPtr --name= --data= --loc=

  const ractx     = context.runAnywhere || {};
  const { rax }   = ractx.datatapDataPtr__pushDataPtr;
  const dquiet    = getDQuiet(context);

  return rax.iwrap(function(abort) {

    const { pushData } = rax.loads(libFanout, 'pushData', rax.opts({}), abort);

    const name              = rax.arg(argv, 'name', {required:true});
    var   data              = rax.arg(argv, 'data', {required:true});
    var   location          = rax.arg(argv, 'location,loc', {required:true});

    if (rax.argErrors({}))    { return rax.abort(); }

    if (data === 'magic') {
      data = magicData(context);
    }

    if (location === 'magic') {
      location = magicLocation(context);
    }

    // TODO: make summary of data
    // sg.log(`aff`, {ps: payloadStats(data)});

    return pushData({name, data:{...location, ...payloadStats(data)}}, rax.opts({}), (err, receipt) => {
      if (!dquiet)  { sg.log(`pushData ${name}`, {data, err, receipt}); }
      return callback(err, receipt);
    });
  });
}});

// -------------------------------------------------------------------------------------
//  Functions
//



// -------------------------------------------------------------------------------------
// routes
//


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//


function magicData(context) {
  if (!context.isRaInvoked) { return; }

  return {
    items: [{
      eventType: 'foo'
    },{
      eventType: 'bar'
    },{
      eventType: 'foo'
    }]
  };
}

function magicLocation(context) {
  if (!context.isRaInvoked) { return; }

  return {
    Bucket: 'myBucket',
    Key:    'myKey'
  };
}

function payloadStats(body) {

  const items   = body.payload || body.items || [];
  var   counts  = {
    startTick:        Number.MAX_SAFE_INTEGER,
    endTick:          -1
  };

  if (!Array.isArray(items)) { return {}; }

  if (body.dataType === 'logs') {
    arrayValues(counts, items);
  } else {
    arrayStats(counts, items);
  }

  if (counts.endTick < counts.startTick) {
    counts = _.omit(counts, 'startTick', 'endTick');
  } else if (body.tick0) {
    counts.startTick += body.tick0;
    counts.endTick   += body.tick0;
  }

  return counts;
}

function arrayStats(counts, items) {
  items.forEach(item => {
    if (Array.isArray(item)) {
      arrayStats(counts, item);
    } else {
      objStats(counts, item);
    }
  });
}

function objStats(counts, obj) {
  countOne(counts, obj, 'eventType');
  countTwo(counts, obj, 'type', 'key');

  if ('tick' in obj || 'when' in obj) {
    counts.startTick = Math.min(counts.startTick, obj.tick || obj.when);
    counts.endTick   = Math.max(counts.endTick,   obj.tick || obj.when);
  }
}

function countOne(counts, obj, key) {
  if (key in obj) {
    const value = ''+obj[key];
    counts[key]             = counts[key] || {};
    counts[key][value]      = (counts[key][value] || 0) + 1;
  }
}

function countTwo(counts, obj, key1, key2) {
  if (key1 in obj && key2 in obj) {
    const val1                    = obj[key1];
    const val2                    = obj[key2];
    counts.types                  = counts.types        || {};
    counts.types[val1]            = counts.types[val1]  || {};
    counts.types[val1][val2]      = (counts.types[val1][val2] || 0) + 1;
  }
}

// Works for logs
function arrayValues(counts, items) {
  items.forEach(item => {
    countValues(counts, item);
  });
}

function countValues(counts, obj) {
  const keys = Object.keys(obj);

  counts.values = counts.values || {};

  keys.forEach(key => {
    counts.values[key] = (counts.values[key] || 0) + 1;
  });
}

