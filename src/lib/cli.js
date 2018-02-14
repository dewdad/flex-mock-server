/// require('babel-polyfill');

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
server.listen(port, () => {
  logger.info(`Server listening on port ${server.address().port}`);
});
server.on('error', (err) => {
  logger.error('Server fails, status: ', server.listening, err.message);
  server.close();
});

process.on('SIGINT', () => {
  logger.info('SIGINT');
  process.exit();
});
process.on('SIGTERM', () => {
  logger.info('SIGTERM');
  process.exit();
});
process.on('exit', () => {
  server.close();
  logger.info('quit.');
});
