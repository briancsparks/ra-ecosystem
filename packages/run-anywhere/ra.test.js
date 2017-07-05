
const sg                      = require('sgsg');
const _                       = sg._;
const test                    = require('ava');
const ra                      = require('run-anywhere');

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

