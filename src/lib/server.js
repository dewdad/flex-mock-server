if (!global._babelPolyfill) {
  require('babel-polyfill');
}

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import createLogger from './debug';
import createListener from './listener';
import { normalize } from './options-helper';

export default class Server {
  constructor(options) {
    options = options || {};
    this.logger = createLogger(options.debug);
    this.options = Object.assign({}, options);
    normalize(this.options, this.logger);
    this.listener = createListener(this.options, this.logger);
  }
  onError(hdlr) {
    this.errorHandler = hdlr;
  }
  start() {
    if (this.options.https) {
      const config = {
        key: fs.readFileSync(path.resolve(__dirname, '../cert/key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, '../cert/cert.pem')),
      };
      this.server = https.createServer(config, this.listener);
    } else {
      this.server = http.createServer(this.listener);
    }
    this.server.on('error', (err) => {
      if (this.errorHandler) {
        this.errorHandler(err);
      }
      this.logger.error('Server fails', err.message);
      this.stop();
    });
    this.server.listen(this.options.port, () => {
      this.logger.info(`Server listening on port ${this.server.address().port}`);
    });
  }
  stop() {
    if (this.server.listening) {
      this.server.close();
      this.logger.info('Server stopped');
    }
  }
}
