
const sg                      = require('sg-clihelp');
const AWS                     = require('aws-sdk');

const ARGV  = sg.ARGV();

sg.runTopAsync(main);

async function main() {
  const [awsModName, awsFnName] = ARGV._;
  if (!awsModName)                                  { return sg.dieAsync(`Usage: qaws mod fn params. \n\n      'mod' not found in params: "${ARGV._.join(' ')}"`); }
  if (!awsFnName)                                   { return sg.dieAsync(`Usage: qaws mod fn params. \n\n      'fn' not found in params: "${ARGV._.join(' ')}"`); }

  const ctor        = AWS[awsModName] || AWS[awsModName.toUpperCase()];
  if (!ctor)                                        { return sg.dieAsync(`Usage: qaws mod fn params. \n\n      'AWS.${awsModName}' is not a constructor.`); }

  const config      = new AWS.Config({paramValidation:false, region:'us-east-1'});
  const mod         = new (ctor)(config);
  if (!mod)                                         { return sg.dieAsync(`Usage: qaws mod fn params. \n\n      '${awsModName}' not found in AWS API`); }

  if (typeof mod[awsFnName] !== 'function')         { return sg.dieAsync(`Usage: qaws mod fn params. \n\n      '${awsFnName}' is not a function on AWS.${awsModName}`); }

  var result = await mod[awsFnName](ARGV).promise();

  return [null, result];
}
