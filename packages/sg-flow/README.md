# sg-flow

Provides several functions for handling the top-level control flow in continuation-
style functions.

## Workhorses

```js
sg.__each(collection, callback, onDone);
sg.__run([fns], onDone);
sg.__run2(initialResult, [fns], onDone, onAbort);

sg.__eachll(collection, maxConcurrent, callback, onDone);
sg.__runll(maxConcurrent, [fns], onDone);

sg.until(options, callback, onDone);
```
