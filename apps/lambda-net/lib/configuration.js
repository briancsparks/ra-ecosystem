
const sg                      = require('sg-config');

var theConfiguration;
var data;

module.exports.getConfiguration = function(domains_, callback =function(){}) {
  var count = 0;

  if (domains_) {
    var domains = sg.arrayify(domains_);
    var lookup  = domains.map(d => `lambdanet.${d}`);

    var  theConfiguration_ = sg.Configuration(lookup);
    return theConfiguration_.load(null, function(err, data_) {
      // console.error(c.rootTable);
      // console.log(JSON.stringify({data: err || data, rootTable: c.rootTable}));

      theConfiguration = theConfiguration_;
      data             = data_;

      return callback(err, theConfiguration);
    });
  }

  // I am not the thread to fetch the configuration. Just wait until it arrives
  return spin();

  // ==========================================================================================================================
  function spin() {
    if (theConfiguration)     { return callback(null, theConfiguration); }
    if (++count > 10)         { return callback(`ENOCONFIGURATION`); }

    return sg.setTimeout(100, spin);
  }
};
