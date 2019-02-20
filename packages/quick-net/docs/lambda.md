# Managing Lambdas

See [the Lambda Buildout](lambda-buildout.md) instructions for instructions on the
initial setup of the lambda functions.

## Overview and Special Nuances

It is good to know the following about how AWS Lambda / API Gateway and ClaudiaJs work.
AWS tries to get close to the industry standards, but there are some nuances to
the implementation details that have to be dealth with. `quick-net` deals with them,
so you don't have to, but you need to know them.

* In the industry, `stage` means something special.
  * At AWS, it is a best practice to have separate AWS accounts for prod and non-prod.
    therefore, manipulating your `prod` stage requires you to switch your credentials
    to that account. This is quick, but not easy.
  * In Lambda, there is a special stage called `latest` (the under-the-hood name is
    `$LATEST`.) This is the ONLY stage that can be updated in place, and is used only
    for current, in development changes. Then, when you publish a 'real' stage like
    `dev`, Lambda creates an immutable Lambda function, which has an increasing integer
    ID. The `quick-lambda` script is made to update this mutable `latest` stage.

## Updating

There are three situations you will be in when you want to push updates to Lambda.

1. Normal, everyday pushes to new functionality in order to test the changes.
   * Updating `latest`.
2. Everyday pushes to new functionality that change _special_ things, and
   hence require more sophistication to the push, and cannot be done with
   the simple, and fast `quick-lambda`.
3. Full, comprehensive pushes that update 'real' stages.

### Everyday Fast Updates

When you only change your own core code (not the parts that deal with routing, for
example) you can push a very small zip file of your code, that points to a separate layer for all
of the dependencies. The dependencies layer is usually huge (10 MB), while the core code for
your module is usually in the KB size range, and you can edit the function in the
AWS Lambda console.

```sh
quick-lambda --stage=dev --debug
quick-lambda --stage=dev --force-layer --debug              # (1)
quick-lambda --stage=dev --skip-layer --skip-push --debug   # Helps debug quick-lamda, itself
```

(1) - Sometimes `quick-lambda` cannot determine that the dependencies layer needs to be updated.
You can force its building and deployment with `--force-layer`.

### Everyday Updates without `quick-lambda`

When you cannot use `quick-lambda` because changes have been made outside your
module's zip file deployment, you must use ClaudiaJs directly. For example, if you add
a new path entry to the Claudia 'API Builder' set of functions, you must use ClaudiaJs
directly, so that you get new routes in AWS API Gateway.

#### Updates

To update the `dev` stage (actually updates the `dev` function's `latest` 'stage.)

```sh
claudia update --config ./_config/dev/private/claudia.json
claudia update --config ./_config/dev/private/claudia.json --set-env-from-json ./_config/dev/env.json
```

### Full Updates

TBD
