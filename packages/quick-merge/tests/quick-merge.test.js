
/**
 *
 */
const test                    = require('ava');
const quickMerge              = require('../index');

const {
  qm,
  qmResolve,
}                             = quickMerge;


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

test('quick-merge object/scalar is scalar', t => {
  const a = {a:42, c:{d:'foo'}};
  const b = {b:21, c:55};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21, c:55});
});

test('quick-merge object/null is object', t => {
  const a = {a:42, c:{d:'foo'}};
  const b = {b:21, c:null};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21, c:{d:'foo'}});
});

test('quick-merge scalar/scalar2 is scalar2', t => {
  const a = {a:42, c:1};
  const b = {b:21, c:2};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21, c:2});
});

test('quick-merge scalar/null is scalar', t => {
  const a = {a:42, c:1};
  const b = {b:21, c:null};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21, c:1});
});

test('quick-merge allows undefined A', t => {
  const x = {};
  // const a = {a:42, c:{d:'foo'}};
  const b = {b:21, c:{e:'bar'}};
  const merged = qm(x.a, b);
  t.deepEqual(merged, {b:21, c:{e:'bar'}});
});

test('quick-merge allows undefined B', t => {
  const x = {};
  const a = {a:42, c:{d:'foo'}};
  // const b = {b:21, c:{e:'bar'}};
  const merged = qm(a, x.b);
  t.deepEqual(merged, {a:42, c:{d:'foo'}});
});

test('quick-merge is not tricked by function', t => {
  const a = {a:42, c:{d:'foo'}};

  const fb = function() { return {e:'bar'}};
  const b = {b:21, c:fb};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21, c:fb});
});

test('quick-merge is not tricked by function A', t => {
  const a = {a:42, c:{d:'foo'}};
  const b = {b:21, c:function() { return {e:'bar'}}};
  const merged = qm(b, a);
  t.deepEqual(merged, {a:42, b:21, c:{d:'foo'}});
});

test('quick-merge is not tricked by function AB', t => {
  const fa = function() { return {d:'foo'}};
  const a = {a:42, c:fa};
  const b = {b:21, c:function() { return {e:'bar'}}};
  const merged = qm(b, a);
  t.deepEqual(merged, {a:42, b:21, c:fa});
});

test('quick-merge appends to arrays', t => {
  const a = {a:42, c:[1, 2]};
  const b = {b:21, c:[5]};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21, c:[1, 2, 5]});
});

test('quick-merge appends scalar to array', t => {
  const a = {a:42, c:[1, 2]};
  const b = {b:21, c:5};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21, c:[1, 2, 5]});
});

test('quick-merge appends object to array', t => {
  const a = {a:42, c:[]};
  const b = {b:21, c:{foo:5}};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21, c:[{foo:5}]});
});

test('quick-merge does not append null to array', t => {
  const a = {a:42, c:[1, 2]};
  const b = {b:21, c:null};
  const merged = qm(a, b);
  t.deepEqual(merged, {a:42, b:21, c:[1, 2]});
});




test('quick-merge-resolve handles resolve', t => {
  const a = {a:42, c:{d:'foo'}};
  const b = {b:21, c:function() { return {e:'bar'}}};
  const merged = qmResolve(a, b);
  t.deepEqual(merged, {a:42, b:21, c:{d:'foo', e:'bar'}});
});

test('quick-merge-resolve handles resolve A', t => {
  const a = {a:42, c:{d:'foo'}};
  const b = {b:21, c:function() { return {e:'bar'}}};
  const merged = qmResolve(a, b);
  t.deepEqual(merged, {a:42, b:21, c:{d:'foo', e:'bar'}});
});

test('quick-merge-resolve handles resolve AB', t => {
  const a = {a:42, c:function() { return {d:'foo'}}};
  const b = {b:21, c:function() { return {e:'bar'}}};
  const merged = qmResolve(a, b);
  t.deepEqual(merged, {a:42, b:21, c:{d:'foo', e:'bar'}});
});

test('quick-merge-resolve handles deep objects', t => {
  const a = {a:42, c:{d:'foo'}};
  const b = {b:21, c:{e:'bar'}};
  const merged = qmResolve(a, b);
  t.deepEqual(merged, {a:42, b:21, c:{d:'foo', e:'bar'}});
  t.deepEqual(a, {a:42, c:{d:'foo'}});
  t.deepEqual(b, {b:21, c:{e:'bar'}});
});

test('quick-merge-resolve object/scalar is scalar', t => {
  const a = {a:42, c:{d:'foo'}};
  const b = {b:21, c:55};
  const merged = qmResolve(a, b);
  t.deepEqual(merged, {a:42, b:21, c:55});
});

test('quick-merge not top-level array', t => {
  const a = {arr: [1, 2, 3]};
  const b = {arr: [8, 9]};
  const merged = qm(a, b);
  t.deepEqual(merged, {arr: [1, 2, 3, 8, 9]});
});

test('quick-merge top-level array', t => {
  const a = [1, 2, 3];
  const b = [8, 9];
  const merged = qm(a, b);
  t.deepEqual(merged, [1, 2, 3, 8, 9]);
});

