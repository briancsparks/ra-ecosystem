
# Run-anywhere

Write your Node.js functions in the run-anywhere format, and run them anywhere (CLI, AWS Lambda, etc.)

When I started writing for Node.js, it was not apparent that Express would become the de-facto
standard framework, so, like everyone back then, I rolled my own. I ended up with a bunch of
functions whose calling convention adhered to the Node "final callback parameter" convention, but
did not follow the Express style. When it became apparent that Express had "won," I had to convert
everything to its style.

Now that serverless hosts are becoming the preferred container for functions, I am looking at the
task of converting to a new style, again. This time, I am writing a style that can be used under any
function container, and building a helper library to mount my functions under any of them.

This is the goal of the Run-anywhere (Ra) library:

* Run Anywhere: Write your functions in a way that they can be run under any function container.
* CLI Development Support: Have special support for developing with CLI function containers.
* Mix Local and Deployed Functions: Under development, allow the local development workstation to invoke your functions that
  have been deployed, as well as functions that are still local to your workstation.

# Support for

* CLI - invoke your function from the command-line.
* AWS Lambda
* Express
* Routes
* React / ReactNative

# The run-anywhere Calling Convention

TL;DR:

```javascript
module.exports.foo = function(argv, context, callback) {
  // ...

  return callback(null, {hello: "World"});
};
```

With the above function, you can use the Run-anywhere CLI to invoke it during development. "argv" will contain
the command-line parameters. Inside the function, ```argv.bar``` will be ```true```, and ```argv.baz``` will
be ```'quxx'```:

```sh
ra invoke mod.js foo --bar --baz=quxx
```

Later, after you deploy, argv will contain query and body parameters of the same name.

## Details

The astute reader will recognize this as the AWS Lambda function signature (mostly), which is intentional.
Any functions you have already written for AWS Lambda should just work. (Run-anywhere calls the first
parameter "argv" instead of "event", but this is a cosmetic issue.)

### How it Works

Run-anywhere (Ra) wraps your function with a function that understands the calling convention of several
function containers like AWS Lambda, Express, and the command-line. Ra has several of these wrapper
functions, one for each container type, and your function is wrapped with the right one at run-time.
The wrapper function understands how it is being called, and builds an object it calls `raEnv`, raEnv has
several attributes that were found while Ra was parsing inputs. Ra then invokes your function, passing
AWS lambda-like parameters.

Note that Ra does not provide any functionality to deploy your code. Other tools like serverless and
Claudia already do an excellent job, so you should use them.

### Parameters

You must accept three parameters to your function: `(argv, context, callback)`, but generally speaking,
your code will work best if you only _use_ ```argv```, and ```callback``` -- try your best to make
your code work irrespective of the context under which it runs.

* ```argv```        - The end-result of processing inputs, and first parameter sent to your function.
* ```context```     - The AWS Lambda ```context``` parameter, if this is an AWS Lambda invocation, or a
                      similar looking object otherwise. Note that you should not directly access this
                      parameter (see below.)
* ```callback```    - The typical Node.js callback parameter.


### CLI Usage

Run-anywhere (Ra) has a command-line mode that allows you to invoke any Ra function from the command line.
All parameters are parsed by an ```ARGV``` object from the sgsg project.

# Details

### Overview

The goal is to write your code such that it works no matter what container it is running within. So,
most of your code will be at the top-level of your JS files, and have the run-anywhere function
signature. During development, liberally run your code from the command-line to test and explore.
Then, in another part of the project (or another project), write whatever you need for your
chosen container, Ra has a lot of functionality to help.

### The Function

Write your code with the Ra signature, as described above, and expose it on the `exports` object.

```js
// Mod.js
var _ = require('underscore');

exports.echo = function(argv, context, callback) {
  // ...

  var result = _.extend({hello: "world"}, argv);
  return callback(null, result);
};

```

During development, invoke your function.

```sh
ra invoke sample/hello.js echo --bar --baz=quxx | underscore print
```

```json
{ "hello": "world", "bar": true, "baz": "quxx" }
```

This example uses the excellent `underscore-cli` npm project:

```sh
npm install -g underscore-cli
```

### The context Parameter

You should not directly access this parameter, as it will be different depending on the function
container under which your function is being run. First, try not to access this parameter at all,
since that will make your code less portable. But if you have to, first let Ra wrap it, and then
use the wrapped version:

```js
// This is TBD, but:

var ra = require('run-anywhere');

exports.foo = function(argv, context, callback) {
  var raCtx = ra.context(context);

  var eol = raCtx.timeOfDeath();
};

```


# Depricated

You must use (argv, context, callback).

### The raEnv Parameter

This section used to read as follows. Do not use this style -- just use (argv, context, callback).

Generally speaking, your code will be best if you only use ```argv```, and ```callback```.

* ```argv```        - The end-result of processing inputs, and first parameter send to your function.
* ```callback```    - The typical Node.js callback parameter.
* ```context```     - The AWS Lambda ```context``` parameter, if this is an AWS Lambda invocation, or a
                      similar looking object otherwise.
* ``` type```       - The type of invocation, like ```'AwsLambda'```, ```'Express'```, ```'Cli'```.
* ```ARGV```        - An instance of the ARGV class. The ARGV class parses command-line parameters.
                      ```undefined``` if this is not an invocation from the CLI.
* ```query```       - The URL query parameter, if this is an HTTP request, ```undefined``` otherwise.
* ```body```        - The request body (as JSON), if this is an HTTP request, ```undefined``` otherwise.
* ```awsEvent```    - The ```event``` parameter, if this is an AWS Lambda invocation.
* ```awsContext```  - The ```context``` parameter, if this is an AWS Lambda invocation, ```undefined```
                      otherwise.


