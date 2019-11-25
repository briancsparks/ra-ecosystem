# sg-argv

Command-line argument parsing.

## Parse CLI Arguments for Easy Use in Javascript

Usage

```sh
npm install sg-argv
```

Then

```sh
const sg      = require('sg-argv');

// ...

const ARGV    = sg.ARGV();

if (ARGV.fooBar) {
  // ...
}

```

`sg-argv` will analyze `process.argv`, and build JSON, and be reasonably intelligent
about it.

Run the `see.js` script in the root of the sg-argv repo, and see what converts to what.

```sh
$ node see.js cmd \
    --multi-seg-opt=55 \
    --flag \
    --opt=val \
    --arr= one two three \
    --json={"a":42} \
    --json2={'foo':'bar'} \
    --bad- \
    --no-op2 \
    --re=/^[a-z]+/ \
    --date=2019-11-25T04:07:23.314Z \
    --package=@package.json \
    --license=@LICENSE

=>

              arr       Array     ["one","two","three"]
              bad     boolean                     false
              op2     boolean                     false
                _       Array                   ["cmd"]
    multi-seg-opt      number                        55
             flag     boolean                      true
              opt      string                     "val"
             json      object                  {"a":42}
            json2      object             {"foo":"bar"}
               re      RegExp                 /^[a-z]+/
            debug     boolean                      true
    multi_seg_opt      number                        55
      multiSegOpt      number                        55
         _command      string                     "cmd"

             date        Date     Sun Nov 24 2019 20:07:23 GMT-0800 (Pacific Standard Time)

          package      object {"name":"sg-argv","version":"1.0.73","description":"Parameter parsing.","main":"...
          license      string "MIT License\nCopyright (c) 2016 Brian C Sparks\nPermission is hereby granted, f...

```

* Provides snake-case and camel-case versions of the keys, because `this-is-not` a
  dottable key on an object.
* Parses the values in a smart, but not too smart, way.
* Provides a few extension functions if you need to do more.
* Provides versions that produce only POD results.

It will convert the following:

* Items that are all digits are converted to Numbers.
* Items that have all digits, except one dot, are also converted to Numbers.
* `true`, `false`, and `null`, are converted to true, false, and null.
* Dates in the format: `2018-12-31T10:08:56.016Z` are converted to Dates.
* Items that start and end with `/` are converted to RegExps.
* JSON is read and parsed as JSON.
* JSON that has single-quotes in place of double quotes is read, has the single-quotes
  turned into double-quotes and is parsed as JSON.
  * The conversion is a straight one-to-one conversion, nothing intelligent is done.

And:

* `--items-like-this= a b c` will be read as Arrays.
  * `{itemsLikeThis: ['a', 'b', 'c'], _: []}`
* `--items-like-this=a b c` is a string and parameters.
  * `{itemsLikeThis: 'a', _: ['b', 'c']}`
* `--file=@path/to/file` is read in from a file (becomes a string).
* `--file=@path/to/file.json` is read in from a file (parsed as JSON).
* `--negative-opt-` is one way to say false: `{negativeOpt: false}`
* `--no-cheese` is another way to say false: `{cheese: false}`
