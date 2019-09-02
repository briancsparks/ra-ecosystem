
const raLib                   = require('run-anywhere');
const ra                      = raLib.v2;
const mod                     = ra.modSquad(module);
const echo                    = require('@sg0/sg-echo').echo;


mod.xport({echo: function(argv, context, callback) {
  const result = {
    argv    :   echo(argv)[0],
    context :   echo(context)[0]
  };

  return callback(null, result);
}});
