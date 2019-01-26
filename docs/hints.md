# Hints

## Global Commands

These are commands that do not work on a single package, they work on the lerna repo
as a whole.

## Lerna Link

```sh
lerna link
```

No optoins - just run in the top-level repo `/ra-ecosystem`.

Links together all the sub-projects. This command will look at all the managed `package.json`
files and determine all the inter-dependencies, and link them so that each is using a
sibling package, if it is also within the monorepo. Also tries to hoist up `devDependencies`.

* [See the lerna docs for `lerna link`.](https://github.com/lerna/lerna/tree/master/commands/link#readme)

## Lerna Changed / Lerna Diff

```sh
lerna changed
lerna diff
```

`Lerna changed` shows which files have changed from an `npm` perpsective - that is, which managed
packages will be published on the next `lerna publish`.

`Lerna diff` uses `git diff` to show the diffs that will go into the next `lerna publish`.

* [See the docs for `lerna changed`.](https://github.com/lerna/lerna/tree/master/commands/changed#readme)
* [See the docs for `lerna diff`.](https://github.com/lerna/lerna/tree/master/commands/diff#readme)

## Lerna publish

```sh
lerna publish
```

Plenty of prompts that you can use, but you can also just invoke `lerna publish` and it
will prompt.

* [See the lerna docs for `lerna publish`.](https://github.com/lerna/lerna/tree/master/commands/publish#readme)

# Other Helpful commands

* [Lerna import](https://github.com/lerna/lerna/blob/master/commands/import#readme)
* [Lerna create](https://github.com/lerna/lerna/tree/master/commands/create#readme)

## Lerna Clean

```sh
lerna clean
```

Remove `node_packages` from all packages.

## Lerna List

```sh
lerna ll

# aka lerna list --all
```

List what lerna is managing.

* [Several options are available at the lerna docs for `lerna list`.](https://github.com/lerna/lerna/tree/master/commands/list#readme)

## Lerna Exec

```sh
lerna exec -- rm -rf ./node_modules
```

Run arbitrary system/shell commands in each package (including private packages).

* [There are *lots* of options and usages to see for `lerna exec`.](https://github.com/lerna/lerna/tree/master/commands/exec#readme)

## Lerna Run

```sh
lerna run test
```

Run an `npm` script in each package that has it (including private packages).

* [There are *lots* of options and usages to see for `lerna exec`.](https://github.com/lerna/lerna/tree/master/commands/run#readme)
