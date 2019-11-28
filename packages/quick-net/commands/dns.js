

const ra                      = require('run-anywhere').v2;
const sg                      = ra.get3rdPartyLib('sg-diag');
const { _ }                   = sg;
const mod                     = ra.modSquad(module, 'quickNetDns');
const AWS                     = require('aws-sdk');
const awsDefs                 = require('../lib/aws-defs');

const config_                 = {paramValidation:false, region:'us-east-1', ...awsDefs.options};
const config                  = new AWS.Config(config_);
const route53                 = new AWS.Route53(config);

const DIAG                    = sg.DIAG(module);

// =======================================================================================================
// checkDns

DIAG.usage({ aliases: { checkDns: { args: {
}}}});

DIAG.usefulCliArgs({
});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(``);
// DIAG.activeName = 'checkDns';


mod.async(DIAG.async({checkDns: async function(argv, context) {
  const diag    = DIAG.diagnostic({argv, context});

}}));


