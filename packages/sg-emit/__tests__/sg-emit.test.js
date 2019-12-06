
const sgEmit                  = require('..');
const test                    = require('ava');

const [emit,close] = sgEmit.redisEmit();

test('emites', t => {
  const a         = {a:'foo', b:'bar', d:{e:'all'}};
  const result    = emit(a);

  t.deepEqual(result, undefined);
});

test('emites scalar', t => {
  const a         = 42;
  const result    = emit(a);

  t.deepEqual(result, undefined);
});

