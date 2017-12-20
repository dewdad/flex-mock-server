#!/usr/bin/env node

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const mime = require('mime');

const program = require('commander');

const dataKey = Symbol('FDS-DATA');

// function collect(val, memo) {
//  memo.push(val);
//  return memo;
// }
program
  .option('-d, --debug', 'debug debug info')
  .option('-p, --port [port]', 'server port, default as 3000')
  .option('-c, --cwd [dir]', 'current working directory, default to process.cwd()')
  .option('-C, --cors ', 'allow cors (option header returns *)')
  .option('-f, --folder [dir]', 'files serving directory')
  .option('-m, --map [file]', 'custom response map file path; see below example')
  .option('-i, --index [file]', 'default html page file name for **existing** folder')
  .option('-5, --html5 [file]', 'whether to support html5 history api, as webpackDevServer "historyApiFallback", which is a path resorting to when directory **non-exists**; if "true" set to "index", or specify specifically, relative to where server starts;')
  .option('-r, --root [dir]', 'virtual root directory, as webpack "publicPath", starts with "/", which will be removed when match file;')
  .parse(process.argv);
// if <>|[], its bool;
program.on('--help', () => {
  console.debug(`
  response map file: 
    a map of path patterns to data. data can be any types:
    {number}: it's treated as http code, then handled internally; turn to string if number is returned;
    {string}: path rewrites;
    {function}: custom 'pre' handler (equal to {pre:function}), when response data (not undefined) is returned, indicating handled successfully, processing stops.
    {{post:function}}: custom 'post' handler, modify response
    {{Symbol('FDS-DATA'):*}}: direct return-data;
  example:
  module.exports={
    'dir1/dir2/.*':401,
    'dir1/dir2/':'dir1/abc/dir2',
    'dir1/dir2/file.abc':{Symbol('FDS-DATA'):JSON.stringify({custom:'data'})},
    'dir1/dir2/':function(req, res){
      if(res.params.id==1){
        res.json({success:false});
        return true;
      }
    },
  }
  `);
});

const debug = require('debug')('flexMockServer');

debug('options:', program);

const port = program.port || 3000;

const cwd = program.cwd || process.cwd();

const folder = program.folder ? path.resolve(cwd, program.folder) : cwd;

const map = program.map ? require(path.resolve(cwd, program.map)) : null;

let rootLen = 0;
if (program.root) {
  rootLen = program.root.length;
  if (program.root.endsWith('/')) { // user may not input trailing slash;
    rootLen--;
    program.root = program.root.substr(0, rootLen);
  }
}

const Index = program.index || 'index.html';

let HistoryIndex;
if (program.html5) {
  HistoryIndex = program.html5 === true ? Index : program.html5;
  HistoryIndex = `/${HistoryIndex}`;
  HistoryIndex = path.join(folder, HistoryIndex);
  debug('none-exist directory resorts to: ', HistoryIndex);
  if (!fs.existsSync(HistoryIndex)) {
    console.error('this resorted html5 history file does not exist', HistoryIndex);
    process.exit();
  }
}

process.on('SIGINT', () => {
  console.debug('quit.');
  process.exit();
});

http.createServer((req, res) => {
  console.debug('\x1b[32m%s\x1b[0m', `${req.method} ${req.url}`);
  //
  if (program.cors && req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
    res.setHeader('Access-Control-Allow-Methods', req.headers['access-control-request-method'] || '*');
  }
  if (req.method == 'OPTIONS') {
    res.end();
    return;
  }
  // parse URL
  const parsedUrl = url.parse(req.url);
  let pathname;
  // extract URL path
  if (rootLen && parsedUrl.pathname.startsWith(program.root)) {
    pathname = parsedUrl.pathname.substr(rootLen);
  } else {
    pathname = parsedUrl.pathname;
  }
  debug('pathname', pathname);


  const posts = [];
  function end(data) {
    if (posts.length) {
      posts.forEach((el) => {
        el(req, res);
      });
    }
    res.end(data);
  }
  if (map) {
    let handled = false,
      target;
    for (const patn in map) {
      const patnReg = new RegExp(patn);
      if (patnReg.test(pathname)) {
        console.debug('matched pattern:', patn);
        target = map[patn];
        if (typeof (target) === 'number') { // standard handlers
          stdHandlers[target](req, res);
        } else if (typeof (target) === 'function') { // custom handler
          if (!(target(req, res))) {
            continue;// not handled;
          }
        } else if (typeof (target) === 'string') { // path rewrites;
          console.debug('replace', patnReg, target);
          pathname = pathname.replace(patnReg, target);
          break;
        } else if (typeof (target) === 'object') {
          if (target.post) {
            posts.push(target.post);
          }
          if (target.pre) {
            if (!(target.pre(req, res))) {
              continue;// not handled;
            }
          } else if (dataKey in target) { // return this data directly;
            if (posts.length) {
              posts.forEach((el) => {
                el(req, res);
              });
            }
            end(JSON.stringify(target[dataKey]));
          } else {
            continue;
          }
        }
        handled = true;
        break;
      }
    }
    if (handled) {
      console.debug('custom response returned', target);
      return;
    }
  }


  pathname = path.join(folder, pathname);
  console.debug('pathname', pathname);
  fs.exists(pathname, (exist) => {
    if (exist) {
      // if a directory, then look for index file (directory exists, so not html5 resort scenario)
      if (fs.statSync(pathname).isDirectory()) {
        if (!pathname.endsWith('/')) {
          pathname += '/';
        }
        pathname += Index;
      }
    } else {
      // api rewrite:
      if (HistoryIndex && pathname.indexOf('.') === -1) { // resort only when directory;
        debug('resorting...');
        pathname = HistoryIndex;
      } else {
        // if the file is not found, return 404
        console.debug('\x1b[33m%s\x1b[0m', 'Not found:', pathname);
        res.statusCode = 404;
        end(`File ${pathname} not found!`);
        return;
      }
    }
    console.debug('--serve with file:', pathname);
    // read file from file system
    fs.readFile(pathname, (err, data) => {
      if (err) {
        res.statusCode = 500;
        end(`Error getting the file: ${err}.`);
      } else {
        // based on the URL path, extract the file extention. e.g. .js, .doc, ...
        const ext = path.parse(pathname).ext;
        // if the file is found, set Content-type and send data
        res.setHeader('Content-type', mime.lookup(ext));
        end(data);
      }
    });
  });
}).listen(parseInt(port));
console.debug(`Server listening on port ${port}`);
