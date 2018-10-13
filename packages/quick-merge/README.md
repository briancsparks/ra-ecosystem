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
