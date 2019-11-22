
/**
 * @file
 *
 * This functionality began as a sample on the Node.js ssh2 github:
 *
 * https://github.com/mscdex/ssh2
 *
 */
const ra                      = require('run-anywhere').v2;
var   sg                      = require('sg-diag');
var   Client                  = require('ssh2').Client;
var   convention              = require('../../conventions');
const mod                     = ra.modSquad(module, 'quickNetEc2');
var   DIAG                    = sg.DIAG(module);

const dg                      = DIAG.dg;






// =======================================================================================================
// useBastion

DIAG.usage({ aliases: { useBastion: { args: {
}}}});

DIAG.usefulCliArgs({
});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--bastion-ip=bastion.cdr0.net --server-name=webtier --debug`);
DIAG.activeDevelopment(`--bastion-ip=bastion.cdr0.net --server-name=db`);
DIAG.activeName = 'useBastion';

/**
 * Run a command on target, using bastion as jump server.
 */
mod.xport(DIAG.xport({useBastion: function(argv, context, callback) {

  return _useBastion_(argv, context, callback);
}}));





/**
 * Run a command on target, using bastion as jump server.
 */
mod.xport(DIAG.xport({_useBastion_: function(argv_, context, callback) {

  var   bastionIp         = '';
  var   targetPrivateIp   = '';
  var   argv              = {...convention, ...argv_, bastionIp, targetPrivateIp};

  // var {
  //   bastionSshKey,    username,     sshPort,  workerSshKey, bastionSshTunnel,

  //   adminKeyFilename,
  // }                           = rest;

  // username      = username      || convention.server.username;
  // adminKeyFilename    = adminKeyFilename    || convention.server.admin.adminKey;


  // bastionSshTunnel     = bastionSshTunnel     || convention.server.bastion.sshLocal;
  // workerSshKey   = workerSshKey   || convention.server.worker.workerKey;
  // sshPort             = sshPort             || convention.server.sshPort;
  // username        = username        || convention.server.username;
  // bastionSshKey   = bastionSshKey   || convention.server.bastion.accessKey;

  var conn1 = new Client();           /* The first connection - to the bastion */
  var conn2 = new Client();           /* The second connection - to the target */

  // Runs commands on target via bastion server

  conn1.on('ready', function() {
    console.log('FIRST :: connection ready');
    // Alternatively, you could use netcat or socat with exec() instead of
    // forwardOut()

    conn1.forwardOut('127.0.0.1', argv.bastionSshTunnel, argv.targetPrivateIp, argv.sshPort, function(err, stream) {
      if (err) {
        console.log('FIRST :: forwardOut error: ' + err);
        return conn1.end();
      }

      console.log('FIRST :: forwardOut ready... connecting...: ');

      conn2.connect({
        sock:         argv.stream,
        username:     argv.username,
        privateKey:   require('fs').readFileSync(argv.workerSshKey),

      }, function(...args) {
        console.log('connected', {args});
      });
    });
  }).connect({
    host:       argv.bastionIp,
    port:       argv.sshPort             || 22,
    username:   argv.username,
    privateKey: require('fs').readFileSync(argv.bastionSshKey)
  });

  conn2.on('ready', function() {
    console.log('SECOND :: connection ready');

    conn2.exec('uptime', function(err, stream) {
      if (err) {
        console.log('SECOND :: exec error: ' + err);
        return conn1.end();
      }

      stream.on('end', function() {
        conn1.end(); // close parent (and this) connection

      }).on('data', function(data) {
        console.log(data.toString());
      });
    });
  });
}}));
const _useBastion_ = module.exports._useBastion_;


module.exports.ra_active_fn_name = DIAG.activeName;

