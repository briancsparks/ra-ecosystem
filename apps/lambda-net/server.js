if (process.env.SG_VVVERBOSE) console[process.env.SG_LOAD_STREAM || 'log'](`Loading ${__filename}`);

/**
 * @file
 *
 */
const ra                      = require('run-anywhere').v2;

const quickNet                = require('quick-net');
const sg0                     = ra.get3rdPartyLib('sg-flow');
const sg                      = sg0.merge(sg0, quickNet.get3rdPartyLib('sg-argv'), require('sg-config'), require('sg-http'));
const libUrl                  = require('url');

const {
  handle,
  clientStartConfig}          = require('./lib/handlers');

const http                    = require('http');
const port                    = process.env.SIDECAR_PORT || 3009;

const server = http.createServer((req, res) => {
  console.log(`Handling: ${req.url}...`);

  const url = libUrl.parse(req.url);

  var   context = { event: { } };
  context.event.path = url.pathname;

  var   should = url.pathname.toLowerCase() === '/clientstart';

  // should = true;
  if (should) {
    let config    = clientStartConfig({}, context);
    const revUrl  = `${config.upstream}${url.pathname}${url.search ||''}`;

    const fCargv  = {key: req.url, url: revUrl};
    console.log(`fetchingandcacheing`, fCargv);
    return quickNet.fetchAndCache(fCargv, context, function(err, data) {
      console.log(`fetchandcache`, err, data);

      if (!sg.ok(err, data)) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ok:false}));
        return;
      }

      // TODO: Update DB

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    });
  }

  console.log(`handleing`, context);
  return handle({}, context, function(err, data) {
    console.log(`handle`, err, data);

    if (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ok:false}));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));

  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`listening on ${port}`);
});



