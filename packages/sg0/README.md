# sg0

All the little functions that make functional Node.JS easier.

## Quick Fixes

Fixes a couple of function signatures, putting the callback as the final parameter,
where it belongs. These functions simply call into lodash, rearranging the parameters.

```js
sg.setTimeout(ms, callback);
sg.reduce(collection, initial, callback);
```

## Fix Fixes

I don't know why lodash renamed some of the underscore functions, or removed things.

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
sg.isObject(x);
sg.isPod(x);
sg.isnt(x);
sg.trueOrFalse(x);    // sg.tf() is alias
```

## Synergize and Power UP

```js
sg.kv(obj, key, value);
sg.kkvv(obj, key, value, valueName [= 'value']);
sg.dottedKv(obj, key, value);
sg.ap(arr, value);
sg.push(arr, value);
```
