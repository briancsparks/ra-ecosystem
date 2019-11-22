
// ----- The libs we are using -----
const sg                      = require('sg0');
const raLib                   = require('run-anywhere');
const ra                      = raLib.v2;
const express                 = require('express');
const ARGV                    = require('sg-argv').ARGV;

// The echo function
const libEcho                 = require('./lib/echo');
const echo                    = ra.load(libEcho, 'echo');

// Typical express -- create an `app` object, and get the port
const app       = express();
const port      = ARGV.port   || process.env.PORT || 3003;

// Register a handler for the route.
app.get('/echo', function(req, res) {

  // So far, this has been a dead-borig express app. Now we are going to do
  // steps that are unique to the run-anywhere style.

  // START ---------- (of run-anywhere specific items.) ----------
  // Have run-anywhere come up with the argv and context variables.
  return ra.paramsFromExpress(req, res, function(err, data) {
    const { argv, context } = data;

    // Call the function that has already been run-anywhere-ified
    return echo(argv, context, function(err, result) {
      // END ---------- (of run-anywhere specific items.) ----------

      // Back to normal express stuff -- return the result

      // Stringify the result and send back to the requestor.
      res.send(JSON.stringify(result));
    });
  });
});


if (require.main === module) {
  app.listen(port, function() {
    console.log(`Listening on port ${port}`);
  });
}
