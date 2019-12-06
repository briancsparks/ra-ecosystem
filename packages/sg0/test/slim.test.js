
const sg                      = require('../slim');
const test                    = require('ava');

test('slim.isnt detects null', t => {
  const result  = sg.isnt(null);
  t.is(result, true);
});

test('slim.isnt detects undefined', t => {
  const x = ((y) => y)();
  const result  = sg.isnt(x);
  t.is(result, true);
});

test('slim.isnt detects NaN', t => {
  const result  = sg.isnt(Math.sqrt(-1));
  t.is(result, true);
});

test('slim.isnt is not confused by 0 (zero)', t => {
  const result  = sg.isnt(0);
  t.is(result, false);
});

test('slim.isnt is not confused by false', t => {
  const result  = sg.isnt(false);
  t.is(result, false);
});

test('slim.isnt is not confused by "" (empty string)', t => {
  const result  = sg.isnt('');
  t.is(result, false);
});

test('slim.isnt sees [] as false', t => {
  const result  = sg.isnt([]);
  t.is(result, false);
});

test('slim.isnt sees {} as false', t => {
  const result  = sg.isnt({});
  t.is(result, false);
});

// ============================================================================================================================

test('slim.isObject detects {}', t => {
  const result  = sg.isObject({});
  t.is(result, true);
});

test('slim.isObject detects []', t => {
  const result  = sg.isObject([]);
  t.is(result, false);
});

test('slim.isObject detects function(){}', t => {
  const result  = sg.isObject(function(){});
  t.is(result, false);
});

test('slim.isObject detects "blah"', t => {
  const result  = sg.isObject("blah");
  t.is(result, false);
});

test('slim.isObject detects 42', t => {
  const result  = sg.isObject(42);
  t.is(result, false);
});

test('slim.isObject detects Date', t => {
  const result  = sg.isObject(new Date());
  t.is(result, false);
});

test('slim.isObject detects /[a-z]/', t => {
  const result  = sg.isObject(/[a-z]/);
  t.is(result, false);
});

test('slim.isObject detects Error', t => {
  const result  = sg.isObject(new Error());
  t.is(result, false);
});

// ============================================================================================================================

test('slim.kv does its thing', t => {
  var   obj     = {a:1};
  var   orig    = obj;
  const result  = sg.kv(obj, 'b', 42);
  t.deepEqual(result, {a:1, b:42});
});

test('slim.kv does not change original object', t => {
  var   obj     = {a:1};
  var   orig    = obj;
  const result  = sg.kv(obj, 'b', 42);
  t.assert(obj === orig);
});

test('slim.kv handles 2 args', t => {
  const result  = sg.kv('b', 42);
  t.deepEqual(result, {b:42});
});

test('slim.kv handles null-ish key', t => {
  var   obj     = {a:1};
  var   orig    = obj;
  const result  = sg.kv(obj, null, 42);
  t.deepEqual(result, {a:1});
});

test('slim.kv handles null obj', t => {
  const result  = sg.kv(null, 'b', 42);
  t.deepEqual(result, {b:42});
});

// ============================================================================================================================





