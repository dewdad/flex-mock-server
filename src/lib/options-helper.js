import fs from 'fs';
import path from 'path';

import { getGlobalLogger } from './debug';
import { parseHistoryFilePath } from './path-parser';

let defaultOptions;

function getDefaultOptions() {
  if (!defaultOptions) {
    defaultOptions = {
      port: 3000,
      cwd: process.cwd(),
      // folder: './',
      index: 'index.html',
      autoPreflight: true,
    };
  }
  return defaultOptions;
}

/*
 * normalize
*/
export function normalize(options, logger = getGlobalLogger()) {
  Object.entries(getDefaultOptions()).forEach(([k, v]) => {
    if (!(k in options)) {
      options[k] = v;
    }
  });

  const {
    cwd, folder, map, root, history, autoPreflight,
  } = options;

  // if (cwd) {
  //   logger.debug(`current working directory is changing to ${cwd}`);
  //   process.chdir(cwd);
  // }

  options.folder = folder ? path.resolve(cwd, folder) : cwd;
  try {
    fs.accessSync(options.folder);
  } catch (err) {
    throw new Error(`The mock data folder does not exist - ${options.folder}`);
  }
  logger.debug('mock data is read from', options.folder);

  if (map && typeof map === 'string') {
    logger.debug('map file is read from', map);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    options.map = require(path.resolve(cwd, map));
  }
  if (options.map) {
    logger.debug('map content is \n', map);
    options.map = Object.entries(options.map).map(([patn, config]) => [new RegExp(patn), config]);
  }

  if (root) {
    if (root[0] !== '/') { // prepend leading slash
      options.root = `/${root}`;
    }
    if (root.endsWith('/')) { // remove trailing slash
      options.root = options.root.substr(0, options.root.length - 1);
    }
  }

  if (history) {
    options.history = parseHistoryFilePath(options, logger);
    try {
      fs.accessSync(options.history);
    } catch (err) {
      throw new Error(`This resorted html5 history file does not exist - ${options.history}`);
    }
  }

  if (autoPreflight) { // cors is implied.
    options.cors = true;
  }
}

export function parseCli(options) {
  options
    .option('-d, --debug', 'debug info')
    .option('-p, --port [port]', 'server port, default is 3000', parseInt)
    .option('-c, --cwd [dir]', 'current working directory, default to process.cwd()')
    .option('-f, --folder [dir]', 'mock files residing directory')
    .option('-m, --map [fileName]', 'custom response map file path; see below example')
    .option('-i, --index [fileName]', 'default html page file name for bare **existing** folder')
    .option('-h, --history [fileName]', 'whether to support html5 history api, alike "historyApiFallback" of webpackDevServer, which is a path resorting to when directory **non-exists**; if `true` then set to "index", or specify specifically, relative to where server starts;')
    .option('-C, --cors ', 'allow cors')
    .option('-k, --cors-cookie', 'allow cors credential')
    .option('-o, --auto-preflight', 'handle "OPTIONS" method automatically, bypassing checking map configs. default is true.', true)
    .option('-r, --root [dir]', 'virtual root directory where this app is mounted in the domain, alike webpack "publicPath", which will be removed when match file;')
    .on('--help', () => {
      const file = fs.readFileSync(path.resolve(__dirname, 'sample.map.js'));
      console.log(`
  Response map file:
    A list of path patterns (RegExp) mapping to responses. "root" directory should be omited.

    Responses can be following types:

    - {Number}: Treated as http code, being handled automatically; returns intermediately.

    - {Array}: An array, http code along with corresponding data: [301, 'http://abc.com']

    - {object}: a json of complex type, fields are:

      - before {function(req, res, logger)}: Execute before processing, to modify request or whatever.

      - after {function(req, res, responseData, logger)}: Called after response data is got and before sent.

      - data {*}: (match for any type of METHOD.)
        - non-function: Inline respone data for any method; This data is sent instead of from file.
        - function(req, res, passedThroughData, logger): Custom handler. returns 1) the response data; 2) a promise that resolves the response data (polyfill was already applied). **don't call respone.end()/write() yourself**

      - path {string | function}: file path.
        - {string} - mapped file path string, internally it is called with String.replace(), so special replacement patterns are supported, such as \`$&\`, \`$'\`, \`$1\`.
        - {function(req, res, logger)} - custom replacer.

      - passThrough {bool}:  whether to check left items for more matches and pass this data on. default is false.

      - get/post/... {*}: method respective version of 'data'.
    }

    - {string}: shorthand for string version of \`path\`: \`{path:''}\`
    - {function}: shorthand for function version of \`data\`: { data: func }

    This map is walked through twice. The first time matched "before" handlers are executed. The second time to retrieve response data. However if the first time encounters a standard code handler, e.g. type of config is  Number/Array, traversing stops, returns immediately.

  [Map file example]

${file}
    `);
    })
    .parse(process.argv);
  return options;
}
