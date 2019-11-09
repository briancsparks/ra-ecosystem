# sg0

All the little functions that make functional Node.JS easier.

* Adds a number of 'fixes' to well-known and used functional-programming staples.
* Consistent and thorough understanding and tolerance for `undefined` and `null` as
  function inputs.
* Adds `reduceObj(collection, initial, function callback(m,k,v) {...})` to make creation of an object
  with reduce much easier.
  * You do not have to continually manage `m`, just return the additions.

## `undefined` and `null` as Function Inputs

In many situations, it leads to less complex code when functions are tolerant of 'required' inputs
being `undefined` or `null`. It is sometimes better to return the `undefined` or `null` than to
truly require it. Consider `sg.setOn(obj, keys, value)`, which allows null-ish anywhere in the keys.

```javascript
const x   = {a:42};
const b   = sg.deref(x, 'b');               // => b  === undefined
const bb  = sg.deref(x, ['b', b]);          // => bb === undefined

const foo = sg.setOn(x, 'b', 'foo');        // => foo === 'foo';  x  === {a:42,b:'foo'}
const fo2 = sg.setOn(x, ['b', bb], 'foo');  // => fo2 === 'foo';  x  === {a:42,b:'foo'}   /* NO HARM */
```

## `reduceObj()`

Assumes you are building up an object, so you can just return the new keys/values. You do not
need to keep track of the current state of the being-built object.

Consider how AWS uses an Array for the Tags on objects: {..., Tags:[{Name:'a', Value:'b'}]}. Javascript
works much better if it were {..., tags:{a:'b'}}

1. By returning a 2-item Array, you are adding to the object being built.
   * Adding the 'tags' key, and the result of (2).
2. By returning a 2-item Array, you are adding to the `tags` object, with `Tag.Name` as the key,
   and `Tag.Value` as the value.
3. By returning `undefined`, we are keeping all k/vs that aren't `Tags`.
   * Could return `null` which would ignore current k/v, resulting in an object of only {tags:{...}}.
4. Could also include the original `Tags:[{Name:'a', Value:'b'}]` by making (2) a many-item Array, and
   adding the original k/v.
   * Would be better in this case to use ['Tags', v], which is more clear, but [k,v] is the general form.

```javascript
const awsInstance = await aws.ec2.describeInstances({}).Promise();

const instance = sg.reduceObj(awsInstance, {}, (m,v,k) => {
  if (k === 'Tags') {
    return ['tags', sg.reduceObj(v, {}, (m_tags,Tag) => {    /* 1 */
      return [Tag.Name, Tag.Value];   /* 2 */
    })];
  }
  /* 3 */
});

// instance === {
//   InstanceId: 'abc...',
//   ...
//   tags: {
//     a: 'b'
//   }
// }

// To preserve Tags:
const instance = sg.reduceObj(awsInstance, {}, (m,v,k) => {
  if (k === 'Tags') {
    return [['tags', sg.reduceObj(v, {}, (m_tags,Tag) => {
      return [Tag.Name, Tag.Value];
    })], [k,v]]; /* 4 */
  }
});

```

## Quick Fixes

Fixes a couple of function signatures, putting the callback as the final parameter,
where it belongs. These functions simply call into the expected function, rearranging
the parameters.

```js
sg.setTimeout(ms, callback);
sg.reduce(collection, initial, callback);
```

### sg.setTimeout(ms, callback)

```javascript
return setTimeout(callback, ms);
```

### sg.reduce(collection, initial, callback)

Calls `_.reduce(collection, callback, initial)`, not the Javascript-provided Array reduce.

## Fix Fixes

I don't know why lodash renamed some of the underscore functions, or removed things,
but `sg` restored these.

```js
sg.min();
sg.max();
sg.rest();
sg.pluck();
sg.head();
sg.last();
sg.initial();
sg.any();
sg.all();
sg.compose();
sg.contains();
sg.findWhere();
sg.indexBy();
sg.invoke();
sg.mapObject();
sg.pairs();
sg.where();
```

## Ease Usage

Similar to the quick fixes, these functions make it easier to call another common function,
or create a new function to do something common.

```js
sg.inspect(x, colors [= false]);
sg.firstKey(x);
sg.numKeys(x);
sg.isObject(x);       // x isn't an Array, RegExp, etc.
sg.isPod(x);          // x is a type that doesn't have properties (`.` will not work)
sg.isnt(x);           // x is `null` or `undefined`
sg.trueOrFalse(x);    // sg.tf() is alias
```

### sg.inspect(x, colors [= false])

Calls `util.inspect()`, but provides the options to do max-depth, and colorize. Returns
the decorated message, to pass to `console.log()` or similar.

### sg.firstKey(x)      /* _nullish ok_ */

[[`x` can be `nullish`; if so, returns `x`.]]

Returns the first key of the object.

* Use this function to mean "Does the object have any content?"
* Many times, an object is supposed to have only one key, for example as a name.

```javascript
if (!sg.firstKey(obj)) {
  // obj has no content, it is just `{}`
}
```

```javascript
const name  = sg.firstKey(obj);
const value = obj[name];
```

### sg.numKeys(x)      /* _nullish ok_ */

Returns the number of keys.

### sg.isObject(x)

The normal `_.isObject()` returns `true` for lots of things that are (technically
speaking) Objects, but your code does not want to treat them that way. This function
returns `true` if it is a 'real' object.

Returns `true` if x is an object, and isn't one of the Object-like things like Array,
RegExp, Date, etc. Returns `false` otherwise.

Notes:

* Returns `false` for `Error` objects.
* Returns `false` for `nullish` objects. (So this function is NOT `nullish-input` aware.)

### sg.isPod(x)

One of the great weaknesses in Javascript is that while (1) `if (x) { x.y = 42; /*safe*/}` works great to
protect against dereferencing `x`, if `x` might be `null` or `undefined`, (2) if `x` were the Number 1,
`x.y = 42` would be unsafe.

This function can be used to make sure `x` can be dereferenced.

```javascript
if (!sg.isPod(x) && x) {
  x.y = 42;  /* safe */
}
```

Notes:

* Returns `false` for `null` and `undefined`.
  * This makes sense, `null` and `undefined` are not PODs. But is counter to the idea that `isPod()` is
    used to imply 'is dereferencable'.
* "POD" means "Plain Old Data".

### sg.isnt(x)

x is `null` or `undefined`

### sg.trueOrFalse(x) [aka sg.tf()]

Returns `true` or `false`, following Javascript truthy-ness, but works right for edge cases:

* The strings 'true' and 'false' are `true` and `false`, respectively.
* Zero (the Number 0) is `false`.
* All other Numbers are `true`.
* Any string that could be parsed as a Number is treated as such (see above.)
  * The empty string is parsed as 0 (zero).
* Otherwise:
  * Truthy is `true`
  * Falsy is `false`

## Synergize and Power Up

```js
sg.kv(obj, key, value);
sg.ap(arr, value);
sg.kkvv(obj, kkey, vvalue, valueName [= 'value']);
sg.dottedKv(obj, key, value);
sg.push(arr, value);
sg.deref(obj, keys);
sg.setOn(obj, keys, value);
sg.setOnn(obj, keys, value);
```

### sg.kv(obj, key, value)

```js
sg.kv(obj, key, value)
```

Adds `value` to `obj` at `key`. I.e. { ...obj, [key]: value}.

This function was created to make `reduce` much easier to use and more clear, since augmenting
an object with a property is one of the most common uses of `reduce`.

```js
sg.reduce(data, {}, function(acc, value, key) {
  return sg.kv(acc, key.toLowerCase(), value.toLowerCase());
});
```

### sg.ap(arr, value)

Just like `sg.kv`, but for pushing a value to the end of an `Array`.

```js
sg.reduce(data, [], function(acc, value) {
  return sg.ap(acc, value * 2);
});
```

### sg.dottedKv(obj, key, value)

Just like `sg.kv`, when the key has dots (like would be used with MongoDB's
`find()` to find based on a deep key.)

`key` can be an array of strings, in which case the strings are `.joined('.')`.

### sg.push(arr, value)

Pushes `value` into `arr`, and returns the index by which `value` can be accessed
in `arr`.

```js
var   arr     = ['I said'];
const index   = sg.push(arr, 'booya');

arr[index]   += ', baby!';

console.log(arr.join(' '));     // I said booya, baby!
```
