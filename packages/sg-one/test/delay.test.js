
const sg                      = require('..');
const { one }                 = sg;
const test                    = require('ava');

const {
  args, _apply, delay, magic
}                             = one;

const num0  = x => (typeof x === 'number') ? x : 0;
const add   = (x0, x1) => x0 + x1;
const add2  = (x0, x1) => num0(x0) + num0(x1);

test('args basic', t => {

  const add5    = one.args(add, 5);

  const result  = one._apply(add5, 10);

  t.deepEqual(result, 15);
});

test('args delay basic', t => {

  var   a_  = 5;
  const a   = function() {
    return a_;
  };

  const add5    = one.args(add, 10);

  a_ += 1;
  const result  = one._apply(add5, delay(a));

  t.deepEqual(result, 16);
});

test('args delay basic2', t => {

  var   a_  = 5;
  const a   = function() {
    return a_;
  };

  const add5    = one.args(add, delay(a));

  a_ += 1;
  const result  = one._apply(add5, 10);

  t.deepEqual(result, 16);
});

test('magic resolveAll', t => {

  var   a_  = 5;
  const a   = function() {
    return a_;
  };

  const add5    = one.args(add, magic(a));

  const result  = one._apply(add5, 10);

  t.deepEqual(result, 15);
});

test('magic resolveAll2', t => {

  var   a_  = 5;
  const a   = function() {
    return a_;
  };

  const add5    = one.args(add2, a);

  const result  = one._apply(add5, 10);

  t.deepEqual(result, 10);
});


