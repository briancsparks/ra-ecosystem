
const sg                      = require('..');
const test                    = require('ava');

test('sg.choose basic', t => {
  const obj = {
    one: 1,
    two: {
      just: 2
    }
  };

  const result  = sg.choose('one', obj);

  t.deepEqual(result, 1);
});

test('sg.choose augmented', t => {
  const obj = {
    prod: {
      result: 42
    },
    debug: {
      msg: 'leak info'
    }
  };

  const result  = sg.choose('debug', ['prod', obj]);

  t.deepEqual(result, {result: 42, msg: 'leak info'});
});

test('sg.choose augmented plain chosen', t => {
  const obj = {
    prod: {
      result: 42
    },
    debug: {
      msg: 'leak info'
    }
  };

  const result  = sg.choose('prod', ['prod', obj]);

  t.deepEqual(result, {result: 42});
});

