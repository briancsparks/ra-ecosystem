
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const _                       = require('lodash');
const upload                  = require('./app/routes/upload');
const quickNet                = require('quick-net');
const superb                  = require('superb');

const {
  initialReqParams,
  _400, _200
}                             = quickNet.libHttp;


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

exports.addRoutes = function(app) {
  app.use('/upload',      upload);

  app.use('/greet', function(req, res) {
    const query = require('url').parse(req.url, true).query;
    return _200(req, res, {greetings: query.name + ' is ' + superb.random()});
  });
};



// -------------------------------------------------------------------------------------
//  Helper Functions
//


