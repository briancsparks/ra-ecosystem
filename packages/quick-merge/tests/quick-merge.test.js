
/**
 *
 */
const sg                      = require('sgsg');
const _                       = sg._;

const test                    = require('ava');
const quickMerge              = require('../index');

const {
  qm
}                             = quickMerge;


// Unconditional:
// t.pass('[message]');
// t.fail('[message]');
//
// Assertions:
// t.truthy(data, '[message]');
// t.falsy(data, '[message]');
// t.true(data, '[message]');
// t.false(data, '[message]');
// t.is(data, expected, '[message]');
// t.not(data, expected, '[message]');
// t.deepEqual(data, expected, '[message]');
// t.notDeepEqual(data, expected, '[message]');
// t.throws(function|promise, [error, '[message]']);
// t.notThrows(function|promise, '[message]');
// t.regex(data, regex, '[message]');
// t.notRegex(data, regex, '[message]');
// t.ifError(error, '[message]');         /* assert that error is falsy */
//
// t.skip.is(foo(), 5);

var xtest = function(){}
xtest.cb = function(){};


// Normal node-cc async
xtest.cb('quick-merge handles trivial object', t => {
  t.plan(1);

  //t.log('starting');
  return qm({a:1}, function(err, data) {
    t.log('in callback');
    t.pass();
    t.end();
  });
});

// Normal, sync
test('quick-merge handles trivial object', t => {
  const a = {a:42};
  const b = {b:21};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21});
});

test('quick-merge does not change inputs', t => {
  const a = {a:42};
  const b = {b:21};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21});
  t.deepEqual(a, {a:42});
  t.deepEqual(b, {b:21});
});

test('quick-merge handles deep objects', t => {
  const a = {a:42, c:{d:'foo'}};
  const b = {b:21, c:{e:'bar'}};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21, c:{d:'foo', e:'bar'}});
  t.deepEqual(a, {a:42, c:{d:'foo'}});
  t.deepEqual(b, {b:21, c:{e:'bar'}});
});

test('quick-merge handles resolve', t => {
  const a = {a:42, c:{d:'foo'}};
  const b = {b:21, c:function() { return {e:'bar'}}};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21, c:{d:'foo', e:'bar'}});
});

test('quick-merge handles resolve A', t => {
  const a = {a:42, c:{d:'foo'}};
  const b = {b:21, c:function() { return {e:'bar'}}};
  const merged = qm(b, a);
  t.deepEqual(merged, {a:42, b:21, c:{d:'foo', e:'bar'}});
});

test('quick-merge handles resolve AB', t => {
  const a = {a:42, c:function() { return {d:'foo'}}};
  const b = {b:21, c:function() { return {e:'bar'}}};
  const merged = qm(b, a);
  t.deepEqual(merged, {a:42, b:21, c:{d:'foo', e:'bar'}});
});

