
/**
 * @file
 *
 */
const ra                      = require('run-anywhere').v2;
const sg0                     = ra.get3rdPartyLib('sg0');
const sg                      = sg0.merge(sg0, require('sg-env'), require('sg-argv'), require('sg-http'));
const mod                     = ra.modSquad(module, 'awsLambdaHost');
const http                    = require('http');

const ARGV                    = sg.ARGV();
const ENV                     = sg.ENV();


const hostname                = ARGV.hostname  || ENV.at('hostname')  || '127.0.0.1';
const port                    = ARGV.port      || ENV.at('port')      || 3000;


var   modjule;
var   fn;

//-----------------------------------------------------------------------------------------------------------------------------
mod.xport({loadHandler: function(argv, context, callback) {
  const { rax }               = ra.getContext(context, argv);

  return rax.iwrap(function(abort) {
    const filename          = rax.arg(argv, 'filename', {required:true});
    var   fnName            = rax.arg(argv, 'fnName,fn', {required:true});

    const loadResult = safeLoad({filename, fnName});
    if (!loadResult) {
      return callback(new Error(`ENOLOAD`));
    }

    [fn, modjule] = loadResult;
    console.log(`loaded ${filename}::${fnName}`);

  });
}});

//-----------------------------------------------------------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  var json;

  return sg.getBodyJson(req, function(err, bodyJson) {
    if (err) {
      console.error(`Failed to get body`);

      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ok:'false'}));
    }

    // Call the hosted fn -------------------------
    var argv, context;
    if (Array.isArray(bodyJson)) {
      [argv,context] = bodyJson;
    }

    if ('argv' in bodyJson) {
      ({argv,context} = bodyJson);
    }

    fn(argv, context, handleLambdaOutput);

    function handleLambdaOutput(err, data, ...rest) {
      if (err) {
        console.error(`Function call failure`);

        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ok:'false', ...err}));
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ok:'true', ...data}));
    }


    // return callback(null, req.bodyJson);
  });
});

//--------------------------------------------------------------
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});


//-----------------------------------------------------------------------------------------------------------------------------
function safeLoad({filename, fnName}) {
  try {
    var localModjule = require(`${process.cwd()}/${filename}`);
    var localFn      = modjule[fnName];

    return [localFn, localModjule];
  } catch(err) {
    console.error(err, `ENOTSAFELOAD`, {filename, fnName});
  }
}
