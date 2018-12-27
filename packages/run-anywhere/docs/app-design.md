
# Design

Top-level

* Entry point(s) / hooks / integration
  * Express
  * AWS Lambda entry-point (lambda.js)

## `lambda.js`

Contains the entry point for AWS Lambda, in `handler`.

* The app would have registered handlers for any AWS integrations.
* lambda.handler calls
