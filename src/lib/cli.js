require('babel-polyfill');

import http from 'http';
import options from 'commander';
import createLogger from './debug';
import { parseCli, normalize } from './options-helper';
import createListener from './listener';

parseCli(options);
const logger = createLogger(options.debug);
normalize(options, logger);

const { port } = options;
const server = http.createServer(createListener(options, logger));
server.listen(port);

process.on('SIGINT', () => {
  logger.info('SIGINT received');
  process.exit();
});
process.on('exit', () => {
  logger.info('quit...');
  console.error('quit...');
  server.close();
});

logger.info(`Server listening on port ${port}`);
