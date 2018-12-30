
const _                       = require('lodash');
const test                    = require('ava');
const ra                      = require('./ra');

test('loadScripts loads modules', t => {
  const raScripts = ra.loadScripts(__dirname);

  t.truthy(raScripts.mods);
  t.truthy(raScripts.mods.one);
  t.is(typeof raScripts.mods.one.oneFn, 'function');
});

test('loadScripts does not load models except as models', t => {
  const raScripts = ra.loadScripts(__dirname);

  t.falsy(raScripts.mods.foo);
});

test('loadScripts loads models', t => {
  const raScripts = ra.loadScripts(__dirname);

  t.truthy(raScripts.models);
  t.truthy(raScripts.models.foo);
  t.is(typeof raScripts.models.foo.upsertFoo, 'function');
});

test('loadScripts knows crud', t => {
  const raScripts = ra.loadScripts(__dirname);

  t.is(typeof raScripts.models.upsertFoo, 'function');
});

test('loadScripts knows not to load helpers.js', t => {
  const raScripts = ra.loadScripts(__dirname);

  t.falsy(raScripts.helper);
  t.falsy(raScripts.models.helpers);
});

test('The right exports', t=> {
  t.true('v2' in ra);

  t.true('lambda_handler' in ra.v2);
  t.true('registerHandler' in ra.v2);
  t.true('expressServerlessRoutes' in ra.v2);
  t.true('claudiaServerlessApi' in ra.v2);
  t.true('utils' in ra.v2);
  t.true('sg' in ra.v2);
  t.true('modSquad' in ra.v2);
  t.true('raExpressMw' in ra.v2);
  t.true('dbUtils' in ra.v2);
  t.true('redisUtils' in ra.v2);
  t.true('express' in ra.v2);       /* ??? */
  t.true('getExpressApp' in ra.v2);

  // TODO: Add the rest
  t.true('isDebug' in ra.v2.utils);
  t.true('getQuiet' in ra.v2.utils);
  t.true('getDQuiet' in ra.v2.utils);

  // TODO: Add the rest
  t.true('extract' in ra.v2.sg);
  t.true('kv' in ra.v2.sg);
  t.true('extend' in ra.v2.sg);
  t.true('reduce' in ra.v2.sg);
  t.true('numKeys' in ra.v2.sg);

  // TODO: Add the rest for dbUtils, redisUtils, claudiaUtils

});

