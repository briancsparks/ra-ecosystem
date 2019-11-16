if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

const sg                      = require('sg0');
const { _ }                   = sg;

_.each(require('./lib/_2XX'), (x,k) => { sg[k] = x; });
_.each(require('./lib/_4XX'), (x,k) => { sg[k] = x; });
_.each(require('./lib/_5XX'), (x,k) => { sg[k] = x; });

var getRawBody = sg.getRawBody = function(req, callback) {
  // req.end might have already been called
  if (req.bufferChunks) {
    return callback(null, req.bufferChunks);
  }

  var onEnd = function() {
    req.bufferChunks = Buffer.concat(req.rawChunks);
    return callback(null, req.bufferChunks);
  };

  req.on('end', onEnd);

  // Only collect the data once
  if (req.rawChunks) {
    return;
  }

  /* otherwise */
  req.rawChunks = [];
  req.on('data', function(chunk) {
    req.rawChunks.push(chunk);
  });
};

/**
 * Gets the HTTP request body as JSON.
 *
 * @param {ClientRequest}   req       - The standard Node request object.
 * @param {function}        callback  - The standard callback.
 * @returns {Object}                  - The parsed JSON object.
 */
var getBodyJson = sg.getBodyJson = function(req, callback) {
  var json;

  return getRawBody(req, function(err, buf) {
    if (err)                { return callback(err, {}); }
    if (buf.length === 0)   { return callback('ENOBODY', {}); }

    if (req.bodyJson)       { return callback(null, req.bodyJson); }

    // Get JSON
    json = sg.safeJSONParse(buf.toString());
    if (!json) {
      return callback('EPARSE', {body:json});
    }

    // Success! Return it
    req.bodyJson = json;

    return callback(null, req.bodyJson);
  });
};


// Export the `sg` object
_.each(sg, (v,k) => {
  module.exports[k] = v;
});

