
# Notes

## Todo

* Use the `wrapper.js` style, so that `rax.loads()` has `options` and `abort` be optional.
  * and optional the wrapped functions 2nd param.

## Importing and Exporting

The central theme in run-anywhere (RA) is that you write your functions with a specific
signature, and RA can invoke it in a variety of places.

There is extra power that comes when ra-ified functions call other ra-ified functions, but you
have to hook them together.

1. Wrap your own function where it is defined (export it into the RA system.)
   * Make a `mod` object for your JS module (one `mod` for each `.js` file.)
   * use `mod.xport(...)` for continuation-stye functions, and `mod.async()` for
     async/await functions.

      Run-anywhere will create both continuation-style functions, and async/await-style
      functions for you, so your callers can use your function either way.

    ```js
    mod.xport({calledFunction: function(argv, context, callback) {
      // blah, blah, blah

      return callback(null, {lue:42});
    }})
    ```

2. Wrap any ra-function that you will call from any of your own ra-ified functions
   (import it from the RA system.)
   1. Create a `rax` object (Run Anywhere eXecutor.)
   2. Wrap your code to get an `abort` function.
   3. `loads` the function your will call
   4. Call it.

      Below, the wrapped function is `pushStatus`. Notice the 3rd option to `rax.loads()` are options --
      in this case, do-not-abort on error. [[It should not abort the flow if pushing status fails.]] Also
      notice the 2nd option to the actual `pushStatus()` call. This is also for options, and is required.
      The options in these two cases are the same options with the same meanings, you either want to set
      one for all invocations, or just for the current invocation.

      The 4th option to `rax.loads()` is the abort function.

      ```js
      const mod           = ra.modSquad(module, 'foobarMod');
      const quickNet      = require('quick-net');

      mod.xport({callingFunction: function(argv, context, callback) {

        // Make a rax object
        const { rax }   = (context.runAnywhere || {}).foobarMod__callingFunction;

        // Get an `abort` function
        return rax.iwrap(function(abort) {

          const { pushStatus }    = rax.loads(quickNet,    'pushStatus',    rax.opts({abort:false}), abort);
          const { fetchAndCache } = rax.loads(quickNet,    'fetchAndCache', rax.opts({abort:false}), abort);

          // blah, blah, blah
          return pushStatus({name:clientId, data:{sessionId, clientId, msg:`clientStart ${sessionId}`}}, {}, function(err, data) {
            return callback(null, {lue:42});
          });
        });
      }})
      ```

3. Wrap any non-ra-function that you will call from any of your own ra-ified functions (as long as it
   conforms to the typical NodeJs conventions -- continuation function last, (err, data, ...rest) continuation
   signature.)
   1. Create a `rax` object (Run Anywhere eXecutor.)
   2. Wrap your code to get an `abort` function.
   3. `loads` the function your will call
   4. Call it.

      Note that the `options` and `abort()` function are optional in `rax.wrapFns()`. The `abort()` function
      from `rax.iwrap()` is used if not supplied, which is preferred. Also, the 2nd parameter to the wrapped
      function (the invocation-time `options`) is optional.

      Below, we are bringing in `GET` and `SET` from Redis. Because Redis calls the `callback` differently than
      the norm (`err` is conventional, but `data` can be `undefined`, which is correct, but most libraries would
      put `[]` into `data` to mean 'nothing'.) So, use `emptyOk` to inform the wrapper that `callback(null, undefined)`
      is not an error. [[Below the `data` parameter is called `receipt`.]]

      Because `SET` takes more than 1 argument, you must put them into an Array: `[key, json]`.

      ```js
      const mod           = ra.modSquad(module, 'foobarMod');
      const redis         = require('whatever');

      mod.xport({callingFunction: function(argv, context, callback) {

        // Make a rax object
        const { rax }   = (context.runAnywhere || {}).foobarMod__callingFunction;

        // Get an `abort` function
        return rax.iwrap(function(abort) {

          const { GET }           = rax.wrapFns(redis, 'GET', rax.opts({emptyOk:true, abort:false}));
          const { SET }           = rax.wrapFns(redis, 'SET', rax.opts({emptyOk:true}));

          // blah, blah, blah
          return SET([key, json], function(err, receipt) {
            return callback(null, {lue:42});
          });
        });
      }})
      ```

4. Call from the command-line.

## All the Duplicated

### invoke

bin.js

* `invoke2` (as `commands.invoke2`)
  * New, improved version of the original `invoke`
  * Uses a special `require`-like function to guess where to require the JS file from.
  * Robustness: `loud-rejection`, `exit-on-epipe`
  * Understands: --silent, --debug, --verbose, --human, --machine
* `invoke` (as `commands.invoke`)
  * The original `invoke`
  * Uses a special `require`-like function to guess where to require the JS file from.

### invoke caller

ra.js

These are called from the functions in `bin.js`.

* `invoke2`
  * New version that sets up `context`
* `invoke`

### wrapper

