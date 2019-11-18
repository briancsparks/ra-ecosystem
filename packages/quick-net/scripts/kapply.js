
const sg                      = require('sg-clihelp');
const execz                   = sg.util.promisify(sg.execz);
const root                    = sg.path.join(__dirname, '..');
const ARGV                    = sg.ARGV();

async function main() {
  var   cwd         = root;
  var   overlayDir  = 'lib/k8s/config/overlays/development/';

  // kubectl apply -k lib/k8s/config/overlays/development/ --record
  await execz('kubectl', 'apply', ['-k', overlayDir], '--record', {cwd});

  return [null, {ok:true}];
}

// Do not be too eager if we are just being required
if (require.main === module) {
  sg.runTopAsync(main, 'kubectl apply -k');
}

