
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
// const ra                      = require('run-anywhere').v2;
// const sg                      = ra.get3rdPartyLib('sg-flow');
// const { _ }                   = sg;

const superb                  = require('superb');
var   ApiBuilder              = require('claudia-api-builder'),
      api                     = new ApiBuilder();

module.exports = api;


// -------------------------------------------------------------------------------------
//  Data
//



// -------------------------------------------------------------------------------------
//  Functions
//

api.get('/greet', function (request, context) {
  return request.queryString.name + ' is ' + superb.random();
});


// -------------------------------------------------------------------------------------
// routes
//


// -------------------------------------------------------------------------------------
// exports
//


// -------------------------------------------------------------------------------------
//  Helper Functions
//






