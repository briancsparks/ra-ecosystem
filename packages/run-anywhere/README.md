
# Run-anywhere

Write your Node.js functions in the run-anywhere format, and run them anywhere (CLI, AWS Lambda, etc.)

When I started writing for Node.js, it was not apparent that Express would become the de-facto
standard framework, so, like everyone back then, I rolled my own. So, I ended up with a bunch of
functions whose calling convention adhered to the Node "final callback parameter" convention, but
did not follow the Express style. When it became apparent that Express had "won," I had to convert
everything to its style.

Now that serverless hosts are becoming the preferred container for functions, I am looking at the
task of converting to a new style. This time, I am writing a style that can be used under any
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

# The run-anywhere Calling Convention

TL;DR:

```javascript
module.exports.foo = function(argv, context, callback [, ...]) {
  ...

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
parameter "argv" instead of "event", but this is a cosmetic issue, and you can call your first parameter
anything you want.)

### How it Works

Run-anywhere (Ra) wraps your function with a function that understands the calling convention of several
function containers like AWS Lambda, Express, and the command-line. Ra has several of these wrapper
functions, one for each container type, and your function is wrapped with the right one at run-time.
The wrapper function understands how it is being called, and builds an object it calls raEnv, which has
several attributes that were found while parsing its inputs. It then invokes your function, passing
AWS-like parameters as the first three parameters, and appending whatever other attributes you request.

Note that Ra does not provide any functionality to deploy your code. Other tools like serverless and
Claudia already do an excellent job, so you should use them.

### The raEnv Parameter

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


### CLI Usage

Run-anywhere (Ra) has a command-line mode that allows you to invoke any Ra function from the command line.
All parameters are parsed by an ```ARGV``` object


