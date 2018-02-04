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
http.createServer(createListener(options, logger)).listen(port);

process.on('SIGINT', () => {
  logger.info('quit.');
  process.exit();
});

logger.info(`Server listening on port ${port}`);
