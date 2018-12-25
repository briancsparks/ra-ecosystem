
# Invoked from API Gateway




```js
{
  event: {
    resource: '/{proxy+}',
    path: '/api/todos',
    httpMethod: 'POST',
    headers: {
      Accept: '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'CloudFront-Forwarded-Proto': 'https',
      'CloudFront-Is-Desktop-Viewer': 'true',
      'CloudFront-Is-Mobile-Viewer': 'false',
      'CloudFront-Is-SmartTV-Viewer': 'false',
      'CloudFront-Is-Tablet-Viewer': 'false',
      'CloudFront-Viewer-Country': 'US',
      'content-type': 'text/plain;charset=UTF-8',
      Host: 'exeajzix24.execute-api.us-east-1.amazonaws.com',
      origin: 'https://exeajzix24.execute-api.us-east-1.amazonaws.com',
      Referer: 'https://exeajzix24.execute-api.us-east-1.amazonaws.com/Prod/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
      Via: '2.0 170a6969b81e7fb3b7cd4266b0118992.cloudfront.net (CloudFront)',
      'X-Amz-Cf-Id': 'nxiJJSs9vm9B_-yKsUFvURsr8dVc86Avj9ciq7ex-U-Aol2FU9ifFQ==',
      'X-Amzn-Trace-Id': 'Root=1-5c21560e-4cf313ca204613005f2ca162',
      'X-Forwarded-For': '76.88.97.224, 70.132.62.84',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https'
    },
    multiValueHeaders: {
      Accept: [ '*/*' ],
      'Accept-Encoding': [ 'gzip, deflate, br' ],
      'Accept-Language': [ 'en-US,en;q=0.9' ],
      'CloudFront-Forwarded-Proto': [ 'https' ],
      'CloudFront-Is-Desktop-Viewer': [ 'true' ],
      'CloudFront-Is-Mobile-Viewer': [ 'false' ],
      'CloudFront-Is-SmartTV-Viewer': [ 'false' ],
      'CloudFront-Is-Tablet-Viewer': [ 'false' ],
      'CloudFront-Viewer-Country': [ 'US' ],

      'content-type': [
        'text/plain;charset=UTF-8'
      ],
      Host: [
        'exeajzix24.execute-api.us-east-1.amazonaws.com'
      ],
      origin: [
        'https://exeajzix24.execute-api.us-east-1.amazonaws.com'
      ],
      Referer: [
        'https://exeajzix24.execute-api.us-east-1.amazonaws.com/Prod/'
      ],
      'User-Agent': [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'
      ],
      Via: [
        '2.0 170a6969b81e7fb3b7cd4266b0118992.cloudfront.net (CloudFront)'
      ],
      'X-Amz-Cf-Id': [
        'nxiJJSs9vm9B_-yKsUFvURsr8dVc86Avj9ciq7ex-U-Aol2FU9ifFQ=='
      ],
      'X-Amzn-Trace-Id': [
        'Root=1-5c21560e-4cf313ca204613005f2ca162'
      ],
      'X-Forwarded-For': [
        '76.88.97.224, 70.132.62.84'
      ],
      'X-Forwarded-Port': [
        '443'
      ],
      'X-Forwarded-Proto': [
        'https'
      ]
    },
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: {
      proxy: 'api/todos'
    },
    stageVariables: null,
    requestContext: {
      resourceId: '624hec',
      resourcePath: '/{proxy+}',
      httpMethod: 'POST',
      extendedRequestId: 'SbpiQHy8IAMFtHA=',
      requestTime: '24/Dec/2018:21:56:30 +0000',
      path: '/Prod/api/todos',
      accountId: '084075158741',
      protocol: 'HTTP/1.1',
      stage: 'Prod',
      domainPrefix: 'exeajzix24',
      requestTimeEpoch: 1545688590422,
      requestId: 'c528b944-07c6-11e9-b963-4bbcbce64628',
      identity: {
        cognitoIdentityPoolId: null,
        accountId: null,
        cognitoIdentityId: null,
        caller: null,
        sourceIp: '76.88.97.224',
        accessKey: null,
        cognitoAuthenticationType: null,
        cognitoAuthenticationProvider: null,
        userArn: null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36',
        user: null
      },
      domainName: 'exeajzix24.execute-api.us-east-1.amazonaws.com',
      apiId: 'exeajzix24'
    },
    body: 'W3sid-------------2V9XQ==',
    isBase64Encoded: true
    body__decoded__: [
      {
        "title":"run app",
        "id":"6e404d7a-f6c3-460e-932a-e346efd54358",
        "completed":false
      }, {
        "id":"5bc7fd5b-f30f-42eb-8c45-496c66a60f04",
        "title":"log inputs",
        "completed":true
      }, {
        "id":"96e1d86d-f3ea-4bd5-afa7-a956e282426e",
        "title":"Make Something up",
        "completed":false
      }
    ]
  },
  context: {
    callbackWaitsForEmptyEventLoop: [Getter/Setter],
    done: [Function: done],
    succeed: [Function: succeed],
    fail: [Function: fail],
    logGroupName: '/aws/lambda/aws-serverless-repository-temp1-serve-siteFunction-1TRLI2ZM0BQJ9',
    logStreamName: '2018/12/24/[$LATEST]5ad4ce2d16fd4888b33f19a9b052117a',
    functionName: 'aws-serverless-repository-temp1-serve-siteFunction-1TRLI2ZM0BQJ9',
    memoryLimitInMB: '128',
    functionVersion: '$LATEST',
    getRemainingTimeInMillis: [Function: getRemainingTimeInMillis],
    invokeid: 'c5295555-07c6-11e9-98d1-695e1ee5dbe7',
    awsRequestId: 'c5295555-07c6-11e9-98d1-695e1ee5dbe7',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:084075158741:function:aws-serverless-repository-temp1-serve-siteFunction-1TRLI2ZM0BQJ9'
  }
}
```

Logged event and context

```js
{
  title: '/var/lang/bin/node',
  version: 'v8.10.0',
  moduleLoadList: [
    'Binding contextify',
    'Binding natives',
    'Binding config',
    'NativeModule events',
    'Binding async_wrap',
    'Binding icu',
    'NativeModule util',
    'NativeModule internal/errors',
    'NativeModule internal/encoding',
    'NativeModule internal/util',
    'Binding util',
    'Binding constants',
    'NativeModule internal/util/types',
    'Binding buffer',
    'NativeModule buffer',
    'NativeModule internal/buffer',
    'Binding uv',
    'NativeModule internal/process',
    'NativeModule internal/process/warning',
    'NativeModule internal/process/next_tick',
    'NativeModule internal/async_hooks',
    'NativeModule internal/process/promises',
    'NativeModule internal/process/stdio',
    'Binding performance',
    'NativeModule perf_hooks',
    'NativeModule internal/linkedlist',
    'NativeModule internal/trace_events_async_hooks',
    'Binding trace_events',
    'NativeModule async_hooks',
    'NativeModule internal/inspector_async_hook',
    'Binding inspector',
    'NativeModule timers',
    'Binding timer_wrap',
    'NativeModule assert',
    'NativeModule module',
    'NativeModule internal/module',
    'NativeModule internal/url',
    'NativeModule internal/querystring',
    'NativeModule querystring',
    'Binding url',
    'NativeModule vm',
    'NativeModule fs',
    'NativeModule path',
    'Binding fs',
    'NativeModule stream',
    'NativeModule internal/streams/legacy',
    'NativeModule _stream_readable',
    'NativeModule internal/streams/BufferList',
    'NativeModule internal/streams/destroy',
    'NativeModule _stream_writable',
    'NativeModule _stream_duplex',
    'NativeModule _stream_transform',
    'NativeModule _stream_passthrough',
    'Binding fs_event_wrap',
    'NativeModule internal/fs',
    'NativeModule internal/loader/Loader',
    'NativeModule internal/loader/ModuleWrap',
    'Internal Binding module_wrap',
    'NativeModule internal/loader/ModuleMap',
    'NativeModule internal/loader/ModuleJob',
    'NativeModule internal/safe_globals',
    'NativeModule internal/loader/ModuleRequest',
    'NativeModule url',
    'NativeModule internal/loader/search',
    'NativeModule console',
    'Binding tty_wrap',
    'NativeModule net',
    'NativeModule internal/net',
    'Binding cares_wrap',
    'Binding tcp_wrap',
    'Binding pipe_wrap',
    'Binding stream_wrap',
    'NativeModule dns',
    'NativeModule repl',
    'NativeModule readline',
    'NativeModule string_decoder',
    'NativeModule internal/readline',
    'NativeModule domain',
    'NativeModule crypto',
    'Binding crypto',
    'NativeModule internal/streams/lazy_transform',
    'NativeModule os',
    'NativeModule internal/os',
    'Binding os'
  ],
  versions: {
    http_parser: '2.7.0',
    node: '8.10.0',
    v8: '6.2.414.50',
    uv: '1.19.1',
    zlib: '1.2.11',
    ares: '1.10.1-DEV',
    modules: '57',
    nghttp2: '1.25.0',
    openssl: '1.0.2n',
    icu: '60.1',
    unicode: '10.0',
    cldr: '32.0',
    tz: '2017c' },
    arch: 'x64',
    platform: 'linux',
    release: {
      name: 'node',
      lts: 'Carbon',
      sourceUrl: 'https://nodejs.org/download/release/v8.10.0/node-v8.10.0.tar.gz',
      headersUrl: 'https://nodejs.org/download/release/v8.10.0/node-v8.10.0-headers.tar.gz'
    },
    argv: [ '/var/lang/bin/node', '/var/runtime/node_modules/awslambda/index.js' ],
    execArgv: [ '--expose-gc', '--max-semi-space-size=6', '--max-old-space-size=11' ]
    env: {
      TABLE: 'aws-serverless-repository-temp1-serverless-todo-todoTable-O2GASXQ0R09K',
      PATH: '/var/lang/bin:/usr/local/bin:/usr/bin/:/bin:/opt/bin',
      LD_LIBRARY_PATH: '/var/lang/lib:/lib64:/usr/lib64:/var/runtime:/var/runtime/lib:/var/task:/var/task/lib:/opt/lib',
      LANG: 'en_US.UTF-8',
      TZ: ':UTC',
      LAMBDA_TASK_ROOT: '/var/task',
      LAMBDA_RUNTIME_DIR: '/var/runtime',
      AWS_REGION: 'us-east-1',
      AWS_DEFAULT_REGION: 'us-east-1',
      AWS_LAMBDA_LOG_GROUP_NAME: '/aws/lambda/aws-serverless-repository-temp1-serve-siteFunction-1TRLI2ZM0BQJ9',
      AWS_LAMBDA_LOG_STREAM_NAME: '2018/12/25/[$LATEST]dcf2744c647b4af1b92ce74d2cc86c12',
      AWS_LAMBDA_FUNCTION_NAME: 'aws-serverless-repository-temp1-serve-siteFunction-1TRLI2ZM0BQJ9',
      AWS_LAMBDA_FUNCTION_MEMORY_SIZE: '128',
      AWS_LAMBDA_FUNCTION_VERSION: '$LATEST',
      _AWS_XRAY_DAEMON_ADDRESS: '169.254.79.2',
      _AWS_XRAY_DAEMON_PORT: '2000',
      AWS_XRAY_DAEMON_ADDRESS: '169.254.79.2:2000',
      AWS_XRAY_CONTEXT_MISSING: 'LOG_ERROR',
      _X_AMZN_TRACE_ID: 'Parent=1ed1b81c3efdc099',
      AWS_EXECUTION_ENV: 'AWS_Lambda_nodejs8.10',
      _HANDLER: 'src/index.handler',
      NODE_PATH: '/opt/nodejs/node8/node_modules:/opt/nodejs/node_modules:/var/runtime/node_modules:/var/runtime:/var/task:/var/runtime/node_modules',
      AWS_ACCESS_KEY_ID: 'ASIARHE2FDTKSMNUOT6P',
      AWS_SECRET_ACCESS_KEY: 'KyzpxG9C+bIiIqbLPjNRiklxlZLtkdJEwfI0+S8h',
      AWS_SESSION_TOKEN: 'FQoGZXIvYXdzEMn//////////wEaDLhb1IFrWojvPNobriKZAiwVyti7fongcbadwcjH+i21q7NhsixM5Ggmh4KfL38XonS2F+uT+gcHXRdY8GRn349QxrPd8u6aSYurT65UanUybLsprYVukpkl2lHfJxT5u57Ua7/7PnH5O8ojFxBykJlQIo/eymg78GyeflYnyn9INMphfStnr5r3TKpqQ7hhtLXEfBE2lcj1PPCK7Hs2RXgUuTrJnsJSvLFuq1l3N6RmPXyE81btGtnCiHQWFZnO8RHssnJ6zi3KW2smK3duD0IP7ZKrIIsjFQ+yretFtzc2QhKBsaPOiZaSM+0bGurtDiWRfig6BbUC6OTNYYoH6c02zNsMPbJ9c9w/zy184vHO8peCudpFBCKMj3Ll4cU3EoeuZDeABxUcKJzGh+EF' },
      pid: 1,
features:
{debug: false,
uv: true,
ipv6: true,
tls_npn: true,
tls_alpn: true,
tls_sni: true,
tls_ocsp: true,
tls: true },
ppid: 0,
execPath: '/var/lang/bin/node',
debugPort: 9229,
config:
{ target_defaults:
{ cflags: [],
default_configuration: 'Release',
defines: [],
include_dirs: [],
libraries: [] },
variables:
{ asan: 0,
coverage: false,
debug_devtools: 'node',
debug_http2: false,
debug_nghttp2: false,
force_dynamic_crt: 0,
gas_version: '2.30',
host_arch: 'x64',
icu_data_file: 'icudt60l.dat',
icu_data_in: '../../deps/icu-small/source/data/in/icudt60l.dat',
icu_endianness: 'l',
icu_gyp_path: 'tools/icu/icu-generic.gyp',
icu_locales: 'en,root',
icu_path: 'deps/icu-small',
icu_small: true,
icu_ver_major: '60',
llvm_version: 0,
node_byteorder: 'little',
node_enable_d8: false,
node_enable_v8_vtunejit: false,
node_install_npm: true,
node_module_version: 57,
node_no_browser_globals: false,
node_prefix: '/local/p4clients/pkgbuild-dQIHV/workspace/src/LambdaLangNodeJs-8-10/build/private/install',
node_release_urlbase: '',
node_shared: false,
node_shared_cares: false,
node_shared_http_parser: false,
node_shared_libuv: false,
node_shared_nghttp2: false,
node_shared_openssl: false,
node_shared_zlib: false,
node_tag: '',
node_use_bundled_v8: true,
node_use_dtrace: false,
node_use_etw: false,
node_use_lttng: false,
node_use_openssl: true,
node_use_perfctr: false,
node_use_v8_platform: true,
node_without_node_options: false,
openssl_fips: '',
openssl_no_asm: 0,
shlib_suffix: 'so.57',
target_arch: 'x64',
uv_parent_path: '/deps/uv/',
uv_use_dtrace: false,
v8_enable_gdbjit: 0,
v8_enable_i18n_support: 1,
v8_enable_inspector: 1,
v8_no_strict_aliasing: 1,
v8_optimized_debug: 0,
v8_promise_internal_field_count: 1,
v8_random_seed: 0,
v8_trace_maps: 0,
v8_use_snapshot: true,
want_separate_host_toolset: 0 } },
argv0: '/var/lang/bin/node'
}
```

