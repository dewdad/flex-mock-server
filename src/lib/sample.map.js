/* eslint-disable no-unused-vars */

// import doen't work.
// import url from 'url';
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
