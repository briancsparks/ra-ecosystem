
/**
 *
 */
const test                    = require('ava');
const quickMerge              = require('..');

const qm                      = quickMerge.quickMergeImmutable;
const mergeArrayBtoaByIndex   = qm.mergeArrayBtoaByIndex;
const removeObjectKey         = qm.removeObjectKey;

// [object-object][scalar-scalar] ------------------------------------------------------
test('imm [object-object][scalar-scalar] depth-one object', t => {
  const a = {foo: 42};
  const b = {bar: 41};

  t.deepEqual(qm(a,b), {foo: 42, bar: 41});
});

test('imm [object-object][scalar-scalar] depth-one object same value', t => {
  const a = {foo: 42};
  const b = {foo: 42};

  t.deepEqual(qm(a,b), {foo: 42});
});

// [object-object] ------------------------------------------------------
test('imm [object-object] tripple eq', t => {
  const a = {foo: 42};
  const b = {foo: 42};

  t.deepEqual(qm(a,b), {foo: 42});

  const iseq = (qm(a,b) === a);
  t.is(iseq, true);

  const isneq = (qm(a,b) !== a);
  t.is(isneq, false);
});

test('imm [object-object] not tripple eq', t => {
  const a = {foo: 42};
  const b = {foo: 42};

  t.deepEqual(qm(a,b), {foo: 42});

  const iseq = (qm(a,b) === b);
  t.is(iseq, false);

  const isneq = (qm(a,b) !== b);
  t.is(isneq, true);
});

// [object-object][scalar-scalar] ------------------------------------------------------
test('imm [object-object][scalar-scalar] multi-merge', t => {
  const a = {foo: 42, a:'a', c:'a'};
  const b = {foo: 42, b:'b', c:'b'};

  t.deepEqual(qm(a,b), {foo: 42, a:'a', b:'b', c:'b'});
});

test('imm [object-object][scalar-scalar] multi-merge depth 2', t => {
  const a = {foo: {bar:42, a:'a', c:'a'}};
  const b = {foo: {bar:42, b:'b', c:'b'}};

  t.deepEqual(qm(a,b), {foo: {bar:42, a:'a', b:'b', c:'b'}});
});

test('imm [object-object][scalar-scalar] multi-merge depth 3', t => {
  const a = {foo: {bar:42, a:'a', c:'a'}};
  const b = {foo: {bar: {baz:42, b:'b', c:'b'}}};

  t.deepEqual(qm(a,b), {foo: {bar:{baz:42, b:'b', c:'b'}, a:'a', c:'a'}});
});

test('imm [array-array]', t => {
  const a = {foo: [1,2]};
  const b = {foo: [3,4]};

  t.deepEqual(qm(a,b), {foo: [1,2,3,4]});
});

test('imm [array-array] depth 2', t => {
  const a = {foo: {bar:[1,2]}};
  const b = {foo: {bar:[3,4]}};

  t.deepEqual(qm(a,b), {foo: {bar:[1,2,3,4]}});
});

test('imm [array-array] depth 3', t => {
  const a = {foo: {bar: [1,2]}};
  const b = {foo: {bar: mergeArrayBtoaByIndex([3,4])}};

  t.deepEqual(qm(a,b), {foo: {bar:[3,4]}});
});

test('imm [array-array] depth 3b', t => {
  const a = {foo: {bar: [1,2]}};
  const b = {foo: {bar: mergeArrayBtoaByIndex([3])}};

  t.deepEqual(qm(a,b), {foo: {bar:[3,2]}});
});

test('imm [array-array] null', t => {
  const a = {foo: {bar: [1,2]}};
  const b = {foo: {bar: mergeArrayBtoaByIndex([null,4])}};

  t.deepEqual(qm(a,b), {foo: {bar:[1,4]}});
});

test('imm remove key', t => {
  const a = {foo: {baz:42, bar: [1,2]}};
  const b = {foo: {bar: removeObjectKey()}};

  t.deepEqual(qm(a,b), {foo: {baz:42}});
});

test('imm remove last key', t => {
  const a = {foo: {bar: [1,2]}};
  const b = {foo: {bar: removeObjectKey()}};

  t.deepEqual(qm(a,b), {foo: {}});
});

test('imm remove key2', t => {
  const a = {foo: {baz:42, bar: [1,2]}};
  const b = {foo: {buz: removeObjectKey()}};

  t.deepEqual(qm(a,b), {foo: {baz:42, bar: [1,2]}});
});


// test('imm [object-object] tripple eq depth 3', t => {
//   const a = {foo: {bar:42}};
//   const b = {foo: {bar:42}};

//   t.deepEqual(qm(a,b), {foo: {bar:42}});

//   const iseq = (qm(a,b) === a);
//   t.is(iseq, true);

//   const isneq = (qm(a,b) !== a);
//   t.is(isneq, false);
// });


