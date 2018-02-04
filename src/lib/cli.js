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

function quit() {
  console.log('quit');
  server.close();
  process.exit();
}
process.on('SIGINT', () => {
  logger.info('SIGINT received');
  quit();
});
process.on('SIGUSER1', () => {
  quit();
});
process.on('SIGUSER2', () => {
  quit();
});
process.on('SIGHUP', () => {
  quit();
});
process.on('SIGTERM', () => {
  quit();
});
process.on('beforeExit', () => {
  quit();
});
process.on('uncaughtException', () => {
  quit();
});
process.on('exit', () => {
  quit();
});

logger.info(`Server listening on port ${port}`);
