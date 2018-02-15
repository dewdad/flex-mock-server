import { parse as parseUrl } from 'url';
import fs from 'fs';
import path from 'path';
import mime from 'mime';
import bPromise from 'bluebird';

const readFile = bPromise.promisify(fs.readFile);
const stat = bPromise.promisify(fs.stat);
const access = bPromise.promisify(fs.access);

import stdHandler from './standard-code-handler';

export default class FileReader {
  constructor(listener) {
    this.listener = listener;
    this.logger = listener.logger;
    this.historyFilePath = listener.options.history;
  }

  doRead(filePath, context) {
    const { req, res } = context;
    this.logger.debug('serve with file:', filePath);
    // read file from file system
    return readFile(filePath, 'utf8').then(
      (content) => {
        // based on the URL path, extract the file extention. e.g. .js, .doc, ...
        const { ext } = path.parse(filePath);
        // if the file is found, set Content-type and send data
        const type = mime.lookup(ext);
        this.logger.debug('set Content-type', filePath, type);
        res.setHeader('Content-type', type);
        if (type.startsWith('text')) {
          this.logger.debug(filePath, 'content is\n', content.length > 50 ? content.substr(0, 50) : content);
        } else {
          this.logger.debug(filePath, 'type is', type);
        }
        return content;
      },
      (err) => {
        stdHandler(req, res, 500, null, this.logger);
        this.logger.error(`Failed to get file "${filePath}, for: " ${err.message}.`);
        return `Error getting the file: ${err.message}.`;
      },
    );
  }

  handleFile(context) {
    const { req, res } = context;
    const { url } = req;
    let filePath = parseUrl(url).pathname;
    const { folder, index } = this.listener.options;
    filePath = path.join(folder, filePath);
    this.logger.debug('read file from ', filePath);
    return stat(filePath).then(
      (stats) => {
        // exists.
        // if a directory, then look for `index` file
        // (directory exists, so not html5 resort scenario)
        if (stats.isDirectory()) {
          filePath = path.join(filePath, index);
          return access(filePath, fs.constants.R_OK)
            .then(
              () => this.doRead(filePath, context),
              (err) => {
                this.logger.error(`Not found: ${filePath}, for ${err.message}`);
                return stdHandler(req, res, 404, null, this.logger);
              },
            );
        }
        return this.doRead(filePath, context);
      },
      (err) => {
        if (this.historyFilePath && filePath.indexOf('.') === -1) {
          // html5 resort scenario: non-exist directory;
          this.logger.debug(`${filePath} resorts to ${this.historyFilePath}`);
          filePath = this.historyFilePath;
          return this.doRead(filePath, context);
        }
        // file non-exists.
        this.logger.error(`Not found: ${filePath}, for ${err.message}`);
        return stdHandler(req, res, 404, null, this.logger);
      },
    );
  }
}
