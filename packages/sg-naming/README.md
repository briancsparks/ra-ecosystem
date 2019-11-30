# sg-naming

The naming convention for SG.

## Simple

```
[upstream...] / Package: [sub-packages...] / project: [sub-projects...] / version / variation / [item-names...] (= item-value)

 - or -

[upstream...] / Project: [sub-projects...] / package: [sub-packages...] / version / variation / [item-names...] (= item-value)
```

* Upstream is not our concern, but it exists.
* Since the package is the one using the namespacing, the `package` and `sub-packages` are known.
* A place for sub-packages
  * But in reality, this will usually get folded into the parent.
* The specific project
* A place for sub-projects
  * But in reality, this will usually get folded into the parent.
* The item's version number
  * Semantic numbering, but each digit has a default ([0.0.1]), but can be written many ways, like v1_2
* The item's variation (aka 'stage' or 'build')
  * Most if not all items share the path, but they don't have to (default to `demo`)
* After our segment, there are possibly infinite more path segments, but we are not in control of
  them.

## Well Known Formats

* Redis uses colons.
* Windows uses back-slashes
* The rest of the world uses forward slashes.
* Etc.
