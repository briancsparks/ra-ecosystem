# Cli Help

Utilities to help write command-line apps.

## Usage

```sh
npm install sg-clihelp
```

Then:

```javascript
const sg          = require('sg-clihelp');      // Just for explanation, use require('sh-clihelp').all(), as below.
const {os,path}   = sg;
const {sh}        = sg;                         // https://github.com/shelljs/shelljs
const {test}      = sg.sh;
const {execa}     = sg;                         // https://github.com/sindresorhus/execa
const ARGV        = sg.ARGV();
const ENV         = sg.ENV();

// Do not be too eager if we are just being required
if (require.main === module) {
  sg.runTopAsync(main);
}

async function main() {
  const foo   = ARGV.foo;
  const bar   = ENV.at('BAR');

  const confDir = path.join(os.homedir(), 'quxxdir'));

  if (!test('-d', confDir)) {
    return sg.dieAsync(`Need ${confDir}`);
  }

  const configFile = path.join(confDir, 'config.json'));
  if (!test('-f', configFile)) {
    return sg.dieAsync(`Need ${configFile}`);
  }

  const battConfig = sg.from(confDir, 'config.json', 'foo.bar.batt');

  // ...

  const cmdStdout = await execa.stdout(sh.which('command').toString(), ['arg1', 'arg2']);
  console.log(sg.splitLn(cmdStdout));

  // ...
}
```

### Copy-and-Paste Header

Here is what I always start with. Uncomment as needed.

```javascript
const {sg,fs,path,os,util,sh,die,dieAsync,grepLines,include,from,startupDone,runTopAsync,exec,execa,execz,exec_ez,find,grep,ls,mkdir,SgDir,test,tempdir,inspect} = require('sg-clihelp').all();

//const tmp         = require('tmp');             // https://github.com/raszi/node-tmp
//const crypto      = require('crypto');

//require('loud-rejection/register');             // https://github.com/sindresorhus/loud-rejection
//require('hard-rejection/register');             // https://github.com/sindresorhus/hard-rejection
//require('exit-on-epipe');                       // https://github.com/SheetJS/node-exit-on-epipe

const ARGV        = sg.ARGV();
const ENV         = sg.ENV();

// Do not be too eager if we are just being required
if (require.main === module) {
  sg.runTopAsync(main);
}

async function main() {
  // ...

}
```

## Included

Included with sg-clihelp:

* sg.die(msg, code =113) - shows msg, then process.exit(code)
* sg.dieAsync(msg, code =113) - shows msg, then process.exit(code) - Use with `runTopAsync`.
* sg.grepLines(regex, filename) - sends lines that match `regex` from `filename` to `stdout`
* sg.include(dirname, filename) - Safe include.
* sg.from(dirname, filename, key) - Get value from JSON file.
* sg.runTopAsync(main, name='main') - If `main` is a top-level async function, use this to run it.
* sg.startupDone(ARGV, modfilename, failed, msg) - messaging for `--help` and `failed`

From sg0:

* sg.safeJSONParse(json)
* sg.safeJSONStringify(obj)
* sg.splitLn(str)
* sg.deref(obj, keys)
* sg.setOn(obj, keys, value)
* sg.setOna(obj, keys, value)

Other modules bundled:

* sg0
* sg-argv
  * `sg.ARGV()`
* sg-env
  * `sg.ENV()`
* sg-exec
  * `execa`
  * `exec` from `shelljs`
  * `exec_ez` from `sg-exec`
* sg.fs - Node.js `fs` module.
* sg.path - Node.js `path` module.
* sg.os - Node.js `os` module.
* sg.util - Node.js `util` module.
* sg.sh - `shell.js` module.
