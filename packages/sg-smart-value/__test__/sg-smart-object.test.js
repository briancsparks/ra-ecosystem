
const sg                      = require('..');
const test                    = require('ava');



test(`smartObject is smart`, t => {
  const value = {
    "x-content-length": '55'
  };

  const x = sg.smartObject(value);

  t.deepEqual(x, {x_content_length: 55});
});



