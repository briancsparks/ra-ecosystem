
/**
 *
 */
const _                       = require('lodash');
const express                 = require('express');
const host                    = require('./express-host');

const app                     = express();

host.hookIntoHost(app);

module.exports = app;



//
//{
//  event: {
//    resource: '/{proxy+}',
//    path: '/foo/bar',
//    httpMethod: 'GET',
//    headers: {
//      Accept: '*/*',
//      'CloudFront-Forwarded-Proto': 'https',
//      'CloudFront-Is-Desktop-Viewer': 'true',
//      'CloudFront-Is-Mobile-Viewer': 'false',
//      'CloudFront-Is-SmartTV-Viewer': 'false',
//      'CloudFront-Is-Tablet-Viewer': 'false',
//      'CloudFront-Viewer-Country': 'US',
//      Host: 'h4doeo9vv6.execute-api.us-east-1.amazonaws.com',
//      'User-Agent': 'curl/7.47.0',
//      Via: '1.1 225837527b3d85f48a3c60b7f9dcad16.cloudfront.net (CloudFront)',
//      'X-Amz-Cf-Id': 'q1XlJqvQPnVPKtt3ToEQGUzzKT3J8BXfQz5QrEFuxG9sNA31umBc5g==',
//      'X-Amzn-Trace-Id': 'Root=1-5b690066-653d1ee0729a1480869f3200',
//      'X-Forwarded-For': '76.88.97.224, 70.132.22.91',
//      'X-Forwarded-Port': '443',
//      'X-Forwarded-Proto': 'https'
//    },
//    queryStringParameters: { i: 'b' },
//    pathParameters: { proxy: 'foo/bar' },
//    stageVariables: { lambdaVersion: 'dev' },
//    requestContext: {
//      resourceId: 'sahzew',
//      resourcePath: '/{proxy+}',
//      httpMethod: 'GET',
//      extendedRequestId: 'LO0AEHsuoAMFaPw=',
//      requestTime: '07/Aug/2018:02:13:58 +0000',
//      path: '/dev/foo/bar',
//      accountId: '084075158741',
//      protocol: 'HTTP/1.1',
//      stage: 'dev',
//      requestTimeEpoch: 1533608038883,
//      requestId: '8b53cc95-99e7-11e8-b000-7b8345566e59',
//      identity: [Object],
//      apiId: 'h4doeo9vv6'
//    },
//    body: null,
//    isBase64Encoded: false
//  },
//  context: {
//    callbackWaitsForEmptyEventLoop: [Getter/Setter],
//    logGroupName: '/aws/lambda/netlab-serverless',
//    logStreamName: '2018/08/07/[22]78d3882a328844f1930307d38199c425',
//    functionName: 'netlab-serverless',
//    memoryLimitInMB: '128',
//    functionVersion: '22',
//    invokeid: '8b546877-99e7-11e8-bb1b-1d1d949748f8',
//    awsRequestId: '8b546877-99e7-11e8-bb1b-1d1d949748f8',
//    invokedFunctionArn: 'arn:aws:lambda:us-east-1:084075158741:function:netlab-serverless:dev'
//  },
//  env: {
//    PATH: '/var/lang/bin:/usr/local/bin:/usr/bin/:/bin',
//    LANG: 'en_US.UTF-8',
//    TZ: ':UTC',
//    LD_LIBRARY_PATH: '/var/lang/lib:/lib64:/usr/lib64:/var/runtime:/var/runtime/lib:/var/task:/var/task/lib',
//    LAMBDA_TASK_ROOT: '/var/task',
//    LAMBDA_RUNTIME_DIR: '/var/runtime',
//    AWS_REGION: 'us-east-1',
//    AWS_DEFAULT_REGION: 'us-east-1',
//    AWS_LAMBDA_LOG_GROUP_NAME: '/aws/lambda/netlab-serverless',
//    AWS_LAMBDA_LOG_STREAM_NAME: '2018/08/07/[22]78d3882a328844f1930307d38199c425',
//    AWS_LAMBDA_FUNCTION_NAME: 'netlab-serverless',
//    AWS_LAMBDA_FUNCTION_MEMORY_SIZE: '128',
//    AWS_LAMBDA_FUNCTION_VERSION: '22',
//    _AWS_XRAY_DAEMON_ADDRESS: '169.254.79.2',
//    _AWS_XRAY_DAEMON_PORT: '2000',
//    AWS_XRAY_DAEMON_ADDRESS: '169.254.79.2:2000',
//    AWS_XRAY_CONTEXT_MISSING: 'LOG_ERROR',
//    _X_AMZN_TRACE_ID: 'Root=1-5b690066-653d1ee0729a1480869f3200;Parent=242864d66d94d34c;Sampled=0',
//    AWS_EXECUTION_ENV: 'AWS_Lambda_nodejs8.10',
//    _HANDLER: 'index.handler',
//    NODE_PATH: '/var/runtime:/var/task:/var/runtime/node_modules'
//  },
//  config: {
//    db: '10.12.21.228',
//    redis: '10.12.21.5'
//  }
//}

