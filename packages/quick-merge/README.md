# quick-merge

Quick for humans.

quick-merge makes it easy to compose objects and arrays. At its heart is a deep-merge
algorithm, and _strategies_ to do the merging in various useful ways.

```js
const a = {
  sub : {
    foo: 'bar'
  },
  sky : 'blue',
  ar  : [1, 2]
};

const x = qm(a, {
  sub : {
    my  : 'favorite color'
  },
  ar  : 9
});

console.log(x);

{
  sub : {
    foo : 'bar',
    my  : 'favorite color'
  },
  sky : 'blue',
  ar  : [1, 2, 9]
}

```

## qm.stitch(arrish)

Turn a deeply-nested Array into a flat Array of strings in a way that allows `nullish`
items in the various Arrays to fizzle everything else in that sub-array. Is good to
pre-process command-line args, for example.

For example, `options` may or may not have `outputfilename`. If so, the `-o` option is
included, otherwise it is not.

```javascript
async function fetchIt(options ={}) {
  const params = qm.stitch([sh.which('curl').toString(),
    '-sSL',
    [-o, options.outputfilename],
    url
  ]);

  const [command, ...args] = params;

  const res = await execa.stdout(command, args);
}
```

Use a 2nd-level array to get the `nullish` affect, but to `join('')` the Array
into a single item in the final output.

* `bar` could invalidate `--foo`, but if not, that item will be `[..., "--foo=BARVALUE", ...]`
  in the final Array -- 1 entry.
* `quxx` could invalidate `--baz`, but if not, that item will be
  `[..., "--baz=", QUXXVALUE, "nine", 42, ...]` in the final Array -- 4 different entries.
* `workdir` could invalidate `--filename`, but if not, that item will be
  `[..., "--filename", "/home/frank/WORKDIRVALUE/subdir", ...]` in the final Array -- 2 entries:
  one for the top-level `--filename`, and one for the joined together path.

```javascript
qm.stitch([
  'command',
  [['--foo=', bar]],
  ['--baz=', quxx, 'nine', 42],
  ['--filename' [os.homedir(), '/', workdir, '/subdir']]
]);
```

Notes:

* Will convert `arrish` to an Array, splitting on whitespace if it is a string.
