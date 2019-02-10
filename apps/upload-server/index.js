
/**
 * @file
 *
 */


// -------------------------------------------------------------------------------------
//  Requirements
//
const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg-flow');
const quickNet                = require('quick-net');
const sg                      = sg0.merge(sg0, quickNet.get3rdPartyLib('sg-argv'), require('sg-config'));
const { _ }                   = sg;
const utils                   = sg.extend(ra.utils, require('./lib/utils'));
const {
  setDQuiet,
}                             = utils;


// -------------------------------------------------------------------------------------
//  Data
//

const ARGV                  = sg.ARGV();


// -------------------------------------------------------------------------------------
//  Functions
//

const main = function() {
  if (ARGV.express) {
    setDQuiet(false);
    const app = require('./express');

    // TODO: call ra.express.close()
    const port = 3003;
    app.listen(port, () => console.log(`Example app listening on port ${port}!`));

    // ra.express.listen(app, function(err, port) {
    //   console.log(`Server is listening on ${port}`);
    // });
  }
};

main();


// -------------------------------------------------------------------------------------
//  Helper Functions
//


