# sg0

All the little functions that make functional Node.JS easier.

## Quick Fixes

Fixes a couple of function signatures, putting the callback as the final parameter,
where it belongs. These functions simply call into the expected function, rearranging
the parameters.

```js
sg.setTimeout(ms, callback);
sg.reduce(collection, initial, callback);
```

## Fix Fixes

I don't know why lodash renamed some of the underscore functions, or removed things,
but here are the functions you have come to love.

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

## Synergize and Power Up

```js
sg.kv(obj, key, value);
sg.ap(arr, value);
sg.kkvv(obj, kkey, vvalue, valueName [= 'value']);
sg.dottedKv(obj, key, value);
sg.push(arr, value);
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

