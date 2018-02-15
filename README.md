# flex-mock-server

[![NPM Version](http://img.shields.io/npm/v/flex-mock-server.svg?style=flat)](https://www.npmjs.org/package/flex-mock-server)
[![Build Status](https://travis-ci.org/roneyrao/flex-mock-server.svg?branch=master)](https://travis-ci.org/roneyrao/flex-mock-server)
[![codecov](https://codecov.io/gh/roneyrao/flex-mock-server/branch/master/graph/badge.svg)](https://codecov.io/gh/roneyrao/flex-mock-server)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/roneyrao/flex-mock-server/master/LICENSE)

A static server, with easy extendability to become mock server, via flexible configuring of response from file, inline data, function and more.

## features
  * both CLI and API
  * multiple instances with different working directories
  * url to file path mapping
  * simple configuring for any http status code
  * full ability to manipulate request and response

## cli

### install
  `npm i -g flex-mock-server`

### invoke
  * `fms`
  * `flex-mock-server`

### options
  * -d, --debug:               Verbose information for debugging.
  * -p, --port [port]:         Server port, default is 3000.
  * -c, --cwd [dir]:           Current working directory, default to process.cwd(); `mock` folder and `map` file path are based on this.
  * -f, --folder [dir]:        Mock files residing directory.
  * -m, --map [fileName]:      Custom response map file path; see example below.
  * -i, --index [fileName]:    Default html page file name for **existing** bare folder.
  * -h, --history [fileName]:  Whether to support html5 history api, alike "historyApiFallback" of webpackDevServer. if string, it is a path relative to `cwd`, to which the requested file resorts when directory **non-exists**; if `true`, then the resorting file path is set to `index`.
  * -C, --cors:                Allow cors
  * -k, --cors-cookie:         Allow cors credential. When set, `cors` is implied to be true.
  * -o, --auto-preflight:      Handle "OPTIONS" method automatically, bypassing checking map configs.  default is true.
  * -r, --root [dir]:          Virtual root directory where this app is mounted in the domain, alike webpack "publicPath", which will be removed when match file.
  * -h, --help:               Output usage information.

## api

### install
  `npm i -D flex-mock-server`

### usage
  ```
  import Server from 'flex-mock-server';
  // const Server = require('flex-mock-server').default;
  const params = {};
  const server = new Server(params);
  server.onError((error) => console.error(error));
  server.start();
  ...
  server.stop();
  ```
  Multiple instances could be created with different `cwd`.

### parameters
  * debug {bool}
  * port {Number}
  * cwd {string}
  * folder {string}
  * map {string|Object}
  * index {string}
  * history {string}
  * cors {bool}
  * corsCookie {bool}
  * autoPreflight {bool}
  * root {string}

  Refer to cli options.

### standard code-handler
  Utility function for `before` and `data` handlers to response with default status code behavior.

#### usage
  ```
  import { StandardCodeHander } from 'flex-mock-server';
  // const StandardCodeHander = require('flex-mock-server').StandardCodeHander;
  module.exports = {
    'dir/file.html': function customHandler(req, res, passedThroughData, logger){
      return StandardCodeHander(req, res, 302, {location: 'http://a.com'}, logger);
    }
  }
  ```

## map file

### format
  ```
  {
    pattern: response
    ...
  }
  ```

### `pattern`
  A string to construct RexExp for url testing and replacing with file path.

  > Backslash should be escaped if you hope it take effects in constructed RegExp: `file\\.html`

### `response`
  Allowed types are:

  * {Number}: Treated as http code, being handled automatically; returns intermediately.
  * {Array}: An array, http code along with corresponding data: [301, 'http://abc.com']
  * {object}: a json of complex type, fields are:
    - before {function(req, res, logger)}:
      Execute before processing, to modify request or whatever.
    - after {function(req, res, responseData, logger)}:
      Called after response data is got and before sent.  
      **if binary data, `fs.ReadStream` is passed instead of file content.**
    - data {\*}: (match for **any** type of METHOD)
       - non-function
         Inline respone data for any method; This data is sent instead of from file.
       - function(req, res, passedThroughData, logger)
         Custom handler.  returns
         1. the response data;
         2. a promise that resolves the response data (polyfill was already applied).

        **don't call respone.end()/write() yourself.**

    - path {string | function}: file path.
      - {string} - mapped file path string, internally it is called with String.replace(), so special replacement patterns are supported, such as `$&`, `$'`, `$1`.
      - {function(req, res, logger)} - custom replacer.
    - passThrough {bool}:  whether to check left items for more matches and pass this data on. default is false.
    - get/post/... {\*}: method respective version of 'data'.
  }

  * {string}: shorthand for string version of `path`: `{path:''}`
  * {function}: shorthand for function version of `data`: { data: func }

  > This map is walked through twice. The first time matched "before" handlers are executed. The second time to retrieve response data. However if the first time encounters a standard code handler, e.g. type of config is  Number/Array, traversing stops, returns immediately.

### logger
  Passed in parameter `logger` in custom handlers is used to output information for debugging when `debug` flag is turned on. Three methods are supplied.
  * error(...args): red color
  * info(...args): blue color
  * log(...args): white color

### notes
* `babel-polyfill` v6.26.0 is applied, New es6/7 features could be used in this map file.
* A sample map file exists with path of `lib/sample.map.js`, contents are:

### sample
```
const url = require('url');

module.exports = {
  // standard code
  '/code/401/file\\.htm': 401,
  // standard code with arguments
  '/code/301/.*': [301, { url: 'http://abc.def.com' }],
  // custom data for any methods.
  '/data/null': { data: null },
  '/data/empty-string\\.htm': { data: '' },
  '/data/string': { data: 'hello world' },
  '/data/number': { data: 1 },
  '/data/json': { data: { customData: '123' } },
  // custom handler returning plain data.
  '/data/func/plain': {
    data(req, res, logger) {
      const parsedUrl = url.parse(req.url, true);
      const params = parsedUrl.query;
      if (params.id == 1) { // eslint-disable-line eqeqeq
        return { success: false };
      }
      return { success: true };
    },
  },
  // custom handler returning plain promise.
  '/data/func/promise': function handle(req, res, logger) {
    return new Promise((resolve, reject) => {
      resolve({ data: 'abc' });
    });
  },
  // shorthand for { data: func }
  '/func/file\\.htm': function handle(req, res, logger) {
    return { success: true };
  },
  // explicit method handler prioritized over 'data'.
  '/post/file\\.htm': {
    post: { customData: '456' },
  },

  // pre-processing handler to redirect to another path defined before.
  '/before/.*': {
    before(req, res, logger) {
      req.url = '/data/json';
    },
  },

  // don't pass through to 'compound/.*' by default.
  '/compound/no-through': {
    data(req, res, data, logger) {
      return { value: 0, success: false };
    },
  },
  // pass through to next two items by setting 'passThrough' to true.
  '/compound/through/file\\.htm': {
    data(req, res, data, logger) {
      return { value: 1 };
    },
    passThrough: true,
  },
  '/compound/through/.*': {
    data(req, res, data, logger) {
      data.value++;
      return data;
    },
    passThrough: true,
  },
  // "after" handler to modify response data
  '/compound/.*': {
    after(req, res, data, logger) {
      if (typeof data === 'string') { // read from file
        data = JSON.parse(data);
      }
      data.success = true;
      return data;
    },
  },

  // direct file path map
  '/path/article/(\\d+)/comment/(\\d+)': {
    path: 'article_$2_comment_$1.json',
  },
  // custom file path map
  '/path/custom/article/(\\d+)/comment/(\\d+)': {
    path(req, res, logger) {
      return req.url.replace(
        new RegExp('path/custom/article/(\\d+)/comment/(\\d+)'),
        'article_$2_comment_$1.json',
      );
    },
  },
  // shorthand for { path }
  '/path/short/article/(\\d+)/comment/(\\d+)': 'article_$2_comment_$1.json',
};
```

## License

[MIT](LICENSE).

