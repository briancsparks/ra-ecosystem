
/**
 * @file
 *
 * This functionality began as a sample on the Node.js ssh2 github:
 *
 * https://github.com/mscdex/ssh2
 *
 */
const ra                      = require('run-anywhere').v2;
var   sg0                     = ra.get3rdPartyLib('sg-argv');
var   sg                      = sg0.merge(sg0, require('sg-diag'));
const quickMerge              = require('quick-merge');
var   Client                  = require('ssh2').Client;
const qnutils                 = require('../../../lib/utils');
var   convention              = require('../../conventions');
const mod                     = ra.modSquad(module, 'quickNetEc2');
var   DIAG                    = sg.DIAG(module);

const {addClip}               = qnutils;
const qm                      = quickMerge.quickMergeImmutable;
const {stitch}                = quickMerge;
const dg                      = DIAG.dg;

var   rawUseBastionPtr;
var   _rawUseBastionPtr_;

// console.log({quickMerge, qm});


// =======================================================================================================
// useBastion

DIAG.usage({ aliases: { useBastion: { args: {
}}}});

DIAG.usefulCliArgs({
});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--bastion-ip=bastion.cdr0.net --server-name=webtier --debug`);
DIAG.activeDevelopment(`--bastion-ip=bastion.cdr0.net --server-name=db`);
// DIAG.activeName = 'useBastion';




/**
 * Run a command on target, using bastion as jump server.
 */
mod.xport(DIAG.xport({useBastion: rawUseBastionPtr = function(argv, context, callback) {
  var   bastionIp         = 'bastion.cdr0.net';
  var   targetPrivateIp   = '10.13.54.167';

  return _rawUseBastionPtr_({...argv, bastionIp, targetPrivateIp}, context, callback);
}}));




/**
 * Run a command on target, using bastion as jump server.
 */
mod.xport(DIAG.xport({_useBastion_: _rawUseBastionPtr_ = function(argv_, context, callback) {

  var   argv  = {...convention /*, bastionIp, targetPrivateIp */, ...argv_};

  var   conn1 = new Client();           /* The first connection - to the bastion */
  var   conn2 = new Client();           /* The second connection - to the target */

  // Runs commands on target via bastion server


  dg.i(`DoubleSSHing...`, {
    cli:[argv.bastionSshTunnel, argv.targetPrivateIp, argv.sshPort],

    workerKey: argv.workerSshKey,
    username : argv.username,

    bastionhost:       argv.bastionIp,
    bastionport:       argv.sshPort,
    bastionusername:   argv.username,
    bastionprivateKey: argv.bastionSshKey,

    theCommand:        argv.theCommand || "uptime",
  });


  conn1.on('ready', function() {
    console.log('FIRST :: connection ready');
    // Alternatively, you could use netcat or socat with exec() instead of
    // forwardOut()

    var failures = 0;
    doForwardOut();
    function doForwardOut() {
      conn1.forwardOut('127.0.0.1', argv.bastionSshTunnel, argv.targetPrivateIp, argv.sshPort, function(err, stream) {
        if (err) {
          failures++;
          console.log('FIRST :: forwardOut error: ' + err, {failures});
          // return conn1.end();
          return setTimeout(doForwardOut, 2500);
        }

        console.log('FIRST :: forwardOut ready... connecting...: ');

        conn2.connect({
          sock:         stream,
          username:     argv.username,
          privateKey:   require('fs').readFileSync(argv.workerSshKey),

        }, function(...args) {
          console.log('connected', {args});
        });
      });
    }

  }).connect({
    host:       argv.bastionIp,
    port:       argv.sshPort             || 22,
    username:   argv.username,
    privateKey: require('fs').readFileSync(argv.bastionSshKey)
  });

  conn2.on('ready', function() {
    console.log('SECOND :: connection ready');

    conn2.exec(argv.theCommand, function(err, stream) {
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


module.exports.ra_active_fn_name    = DIAG.activeName;
module.exports._rawUseBastionPtr_   = _rawUseBastionPtr_;

// if (require.main === module) {
//   var   bastionIp         = 'bastion.cdr0.net';
//   // var   targetPrivateIp   = '10.13.54.167';

//   return _rawUseBastionPtr_({bastionIp /*, targetPrivateIp*/, ...sg.ARGV()}, {}, function(...rest) {
//     console.error(`uniq_message`, sg.inspect({rest}));
//   });
// }






module.exports.spawnit = function(argv_, context, callback) {
  // var ARGV = sg.ARGV();

  const argv = {...convention, ...argv_};

  const { spawn } = require('child_process');

  // ssh -A -o "StrictHostKeyChecking no" -o "UserKnownHostsFile=/dev/null" -o "LogLevel=quiet"
  // sshix -L 127.0.0.1:10022:10.13.48.191:22 ubuntu@bastion.cdr0.net -v

  const bastionIp = 'bastion.cdr0.net';

  var sshArgs = [
    '-A',   /* agent forwarding */
    ['-o', "StrictHostKeyChecking no"],
    ['-o', "UserKnownHostsFile=/dev/null"],
    ['-o', "LogLevel=quiet"],
    ['-i', argv.bastionSshKey],
       // ['-L', `127.0.0.1:${argv.bastionSshTunnel}:${argv.targetPrivateIp}:22`],
    [`ubuntu@${bastionIp}`],
    // [`ssh "${argv.workerSshKey}" "${argv.targetPrivateIp}" "${argv.theCommand}"`]
    [argv.theCommand],
  ];
  console.log(`other`, {L:`127.0.0.1:${argv.bastionSshTunnel}:${argv.targetPrivateIp}:22`, targetPrivateIp: argv.targetPrivateIp});

  sshArgs = stitch(sshArgs);

  console.log('ssh', sshArgs);

  addClip([
    `# theCommand: ${argv.theCommand}`,
    `#ssh ${sshArgs.map(arg => `"${arg}"`)}`,
  ]);

  const ssh = spawn('ssh', stitch(sshArgs));

  ssh.stdout.on('data', (data) => {
    // process.stdout.write(`stdout: ${data}`);
    process.stdout.write(data);
  });

  ssh.stderr.on('data', (data) => {
    // process.stderr.write(`stderr: ${data}`);
    process.stderr.write(data);
  });

  // ssh.stdout.on('data', (data) => {
  //   console.log(`stdout: ${data}`);
  // });

  // ssh.stderr.on('data', (data) => {
  //   console.error(`stderr: ${data}`);
  // });

  ssh.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    return callback();
  });
};

if (require.main === module) {
  module.exports.spawnit();
}

