# Cli Help

Utilities to help write command-line apps.

## Included

Included with sg-clihelp:

* sg.die(msg, code =113) - shows msg, then process.exit(code)
* sg.dieAsync(msg, code =113) - shows msg, then process.exit(code) - Use with `runTopAsync`.
* sg.grepLines(regex, filename) - sends lines that match `regex` from `filename` to `stdout`
* sg.include(dirname, filename) - Safe include.
* sg.from(dirname, filename, key) - Get value from JSON file.
* sg.runTopAsync(main, name='main') - If `main` is a top-level async function, use this to run it.
* sg.startupDone(ARGV, modfilename, failed, msg) - messaging for `--help` and `failed`

Other modules bundled:

* sg0
* sg-argv
  * `sg.ARGV()`
* sg-env
  * `sg.ENV()`
* sg-exec
* sg.fs - Node.js `fs` module.
* sg.path - Node.js `path` module.
* sg.os - Node.js `os` module.
* sg.util - Node.js `util` module.
* sg.sh - `shell.js` module.
