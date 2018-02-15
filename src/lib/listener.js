import { ReadStream } from 'fs';
import { getGlobalLogger } from './debug';
import { parseUrl } from './path-parser';
import MapProcessor from './map-processor';
import FileReader from './file-reader';
import stdHandler from './standard-code-handler';

/**
 * @typedef {Object} Context
 * property {Object} req - request
 * property {Object} res - response
*/

class Listener {
  constructor(options, logger) {
    this.options = options;
    this.logger = logger;

    this.mapProcessor = new MapProcessor(this);
    this.fileReader = new FileReader(this);
  }
  /*
   * set cors headers
   */
  setCorsHeaders(context) {
    const { req, res } = context;
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    if (this.options.corsCookie) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  static handlePreflight(context) {
    const { req, res } = context;
    res.setHeader(
      'Access-Control-Allow-Headers',
      // headers are converted to lower case by http.
      req.headers['access-control-request-headers'] || '*',
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      req.headers['access-control-request-method'] || '*',
    );
    res.end();
  }

  send(data, context) {
    const { req, res } = context;
    this.logger.debug('sent data for', req.url, res.getHeader('Content-type'));
    let body = data;
    if (res.afterHandlers.length) {
      res.afterHandlers.forEach((handler) => {
        body = handler(req, res, body, this.logger);
      });
    }

    if (body instanceof ReadStream) { // binary data
      body.pipe(res)
        .on('error', (err) => {
          this.logger.debug(err.message);
          stdHandler(req, res, 500, null, this.logger);
          res.end();
        })
        .on('close', () => {
          res.end();
        });
    } else { // text file
      if (body != null) {
        const type = typeof body;
        if (type !== 'string') {
          if (type === 'object') {
            body = JSON.stringify(body);
          } else {
            body = body.toString();
          }
        }
      }
      res.end(body);
      this.logger.debug('content:', body && body.length > 50 ? `${body.substr(0, 50)}'...'` : body);
    }
  }

  listen(req, res) {
    this.logger.info(req.method, req.url);

    const context = { req, res };

    // container for handlers after response data is got and before sent;
    res.afterHandlers = [];

    if (this.options.cors && req.headers.origin) {
      this.setCorsHeaders(context);
    }

    /*
     * OPTIONS request, handle automatically.
     */
    if (req.method === 'OPTIONS' && this.options.autoPreflight) {
      Listener.handlePreflight(context);
      return;
    }

    req.url = parseUrl(req.url, this.options.root, this.logger);

    new Promise((resolve) => {
      resolve(this.mapProcessor.handleMap(context));
    }).then((wrapper) => {
      if (!('data' in wrapper)) {
        this.logger.debug('no custom handlers handled');
        return this.fileReader.handleFile(context);
      }
      this.logger.debug('get data from custom handlers', wrapper.data);
      return wrapper.data;
    }).then(data => this.send(data, context))
      .catch((err) => {
        let msg;
        if (err instanceof Error) {
          msg = err.message;
          err = err.stack;
        } else {
          msg = err;
        }
        this.logger.error('500:', err);

        res.statusCode = 500;
        this.send(msg, context);
      });
  }
}

export default function createListener(options, logger = getGlobalLogger()) {
  const listener = new Listener(options, logger);
  return listener.listen.bind(listener);
}
