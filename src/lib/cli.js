if (!global._babelPolyfill) {
  require('babel-polyfill');
}

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import options from 'commander';
import createLogger from './debug';
import { parseCli, normalize } from './options-helper';
import createListener from './listener';

parseCli(options);
const logger = createLogger(options.debug);
normalize(options, logger);

const { port, https: isHttps } = options;
let server;
if (isHttps) {
  const config = {
    key: fs.readFileSync(path.resolve(__dirname, '../cert/key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname, '../cert/cert.pem')),
  };
  server = https.createServer(config, createListener(options, logger));
} else {
  server = http.createServer(createListener(options, logger));
}
server.on('error', (err) => {
  logger.error('Server fails, status: ', server.listening, err.message);
  server.close();
});
server.listen(port, () => {
  logger.info(`Server listening on port ${server.address().port}`);
});

process.on('SIGINT', () => {
  logger.info('SIGINT');
  process.exit();
});
// process.on('SIGTERM', () => {
//   logger.info('SIGTERM');
//   process.exit();
// });
process.on('exit', () => {
  server.close();
  logger.info('quit.');
});
