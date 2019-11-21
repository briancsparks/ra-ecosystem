# SG Diagnostics

sg.check

```js

const DIAG                    = sg.DIAG(module);
const dg                      = DIAG.dg;

//-----------------------------------------------------------------------------------------------------------------------------
// callbackIfied

DIAG.usage({ aliases: { callbackIfied: { args: {
}}}});

DIAG.usefulCliArgs({
});

// The last one wins. Comment out what you dont want.
DIAG.activeDevelopment(`--debug`);
// DIAG.activeName = 'callbackIfied';

/**
 * Happy, happy, happy.
 */
mod.xport(DIAG.xport({callbackIfied: function(argv_, context, callback) {
  const diag    = DIAG.diagnostic({argv_, context, callback});

  const data = {};
  return callback(null, data);
}}));


// ...

// End of file
module.exports.ra_active_fn_name = DIAG.activeName;

```
