if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 * As a host, I will:
 *
 * 1. Receive input from an entrypoint function.
 *    * Originally, the nginx-sidecar-rewrite entrypoint.
 * 2. Dispatch it.
 * 3. Sanitize the result.
 *
 */

const sg0                       = require('sg-http');
const sg                        = sg0.merge(sg0, require('sg-env'));
const _                         = require('lodash');
const http                      = require('http');
const utils                     = require('../entrypoint/utils-req-res');
const {cleanLog}                = require('../platform-utils');
const {mkLogApi,
       mkLogApiV}               = require('../platform-utils');

const logApi                    = mkLogApi('host', 'hostinstance');
const logApiV                   = mkLogApiV('host', 'hostinstance');

const ENV                       = sg.ENV();


// ----------------------------------------------------------------------------------------------------------------------------
exports.startServer = function(argv) {
  const hostname                = argv.hostname;
  const port                    = argv.port       || ENV.at('SIDECAR_PORT') || 3009;

  const server = http.createServer((req, res) => {

    // ----- BEFORE ---------------

    console.log(`Handling: ${req.url}...`);
    return  utils.contextify(req, res, function(err, event, context) {

        // ----- INVOKE ---------------
        return exports.platform_entrypoint(event, context, function(err, {httpCode, ...data}) {

        // ----- AFTER ---------------
        console.log(`handled ${req.url}`, err, httpCode, data);

        // TODO: Put in right format for rpxi if requested
        var   contentType = 'application/json';

        res.statusCode = httpCode;
        res.setHeader('Content-Type', contentType);
        res.end(sg.safeJSONStringify2(data));

      });
    });
  });

  server.listen(port, hostname, () => {
    console.log(`listening on ${port}`);
  });

};

// // ------------------------------------------------------------------------------------------------------------------------------
// // Handler for the function of being the host
// exports.hostinstance_handler = exports.platform_host_hostinstance_handler = function(event, context_, callback) {
//   const startTime = new Date().getTime();

//   logApiV(`hostinstance_handler.params`, {event, context:context_});
//   console.log(`hostinstance_handler.params`, sg.inspect({event:smEvent(event)}));

//   // Fix args
//   return reqRes.inboundify(event, context_, function(err, argv, context) {

//     return dispatcher(argv, context, function(err, response) {
//       const endTime = new Date().getTime();

//       const fixedResponse = reqRes.fixResponse(response);
//       // console.log(`host_reqResInstance-dispatch: (${(endTime - startTime) * 1})`, {err, response, fixedResponse});

//       logApi(`hostinstance_handler: (${(endTime - startTime) * 1000})`, {argv, err, response, fixedResponse});

//       // OK?
//       if (err || !fixedResponse || !fixedResponse.ok) {
//         return callback(err, fixedResponse);
//       }

//       callback(err, fixedResponse);
//     });
//   });
// };


// function smEvent(event) {
//   return {...event,
//     req : event.req.url,
//     res : !!event.res,
//   };
// }



// // ------------------------------------------------------------------------------------------------------------------------------
// exports.setDispatcher = function(d) {
//   dispatcher = d;
// };

// // ------------------------------------------------------------------------------------------------------------------------------
// exports.registerHandler = function(selector, handler) {
//   handlerFns.push(mkHandlerWrapper(selector, handler));
// };


// // ------------------------------------------------------------------------------------------------------------------------------
// function dispatch(event, context, callback) {
//   var   handled       = false;
//   _.each(handlerFns, (handler) => {
//     if (handled) { return; }

//     if (handler.select(event, context)) {
//       handled = true;
//       return handler.handleIt(event, context, callback);
//     }
//   });

//   if (!handled) {
//     console.log(`hostinstance_handler not found`);

//     return callback(null, reqRes.fixResponse({statusCode: 404, body: {ok: false}}));
//   }
// }


// // ------------------------------------------------------------------------------------------------------------------------------
// function mkHandlerWrapper(select, handleIt) {
//   return {select, handleIt};
// }

