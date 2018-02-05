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
console.log(port);
server.listen(port);

process.on('SIGINT', () => {
  process.exit();
});
process.on('exit', () => {
  server.close();
  logger.info('quit.');
});

logger.info(`Server listening on port ${port}`);
