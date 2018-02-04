import path from 'path';
import sinon from 'sinon';
import { expect } from 'chai';

import { parseHistoryFilePath, parseUrl, __RewireAPI__ } from '../../src/lib/path-parser';

describe('path-parser', function () {
  beforeEach('restore module "server"', function () {
    __RewireAPI__.__set__('getGlobalLogger', this.sandbox.stub().returns(this.logger));
  });
  afterEach('restore module "server"', function () {
    __RewireAPI__.__ResetDependency__();
  });

  describe('parseHistoryFilePath', function () {
    const options = {
      folder: '/publish',
      index: 'index.htm',
    };

    it('history: undefined, return undefined', function () {
      expect(parseHistoryFilePath(options)).equal(undefined);
    });
    it('history: true, return index', function () {
      options.history = true;
      expect(parseHistoryFilePath(options)).equal(path.normalize(`${options.folder}/${options.index}`));
    });
    it('history: true, default logger', function () {
      const logger = { debug: this.sandbox.spy() };
      __RewireAPI__.__set__('getGlobalLogger', this.sandbox.stub().returns(logger));
      options.history = true;
      parseHistoryFilePath(options);
      sinon.assert.calledOnce(logger.debug);
    });
    it('history: true, pass in logger', function () {
      const logger = { debug: this.sandbox.spy() };
      parseHistoryFilePath(options, logger);
      sinon.assert.calledOnce(logger.debug);
    });
    it('history: "file.htm", return "folder/file.htm"', function () {
      const file = 'file.htm';
      options.history = file;
      expect(parseHistoryFilePath(options)).equal(path.normalize(`${options.folder}/${file}`));
    });
    it('history: "/file.htm", return "folder/file.htm"', function () {
      const file = '/file.htm';
      options.history = file;
      expect(parseHistoryFilePath(options)).equal(path.normalize(`${options.folder}${file}`));
    });
  });

  describe('parseUrl', function () {
    it('default logger', function () {
      const logger = { debug: this.sandbox.spy() };
      __RewireAPI__.__set__('getGlobalLogger', this.sandbox.stub().returns(logger));
      parseUrl('/');
      sinon.assert.calledOnce(logger.debug);
    });
    it('pass in logger', function () {
      const logger = { debug: this.sandbox.spy() };
      parseUrl('/', null, logger);
      sinon.assert.calledOnce(logger.debug);
    });
    it('url: "http://abc.com/abc/efg/file.htm", set pathname to "/abc/efg/file.htm"', function () {
      expect(parseUrl('http://abc.com/abc/efg/file.htm')).equal('/abc/efg/file.htm');
    });
    it('remove trailing slash', function () {
      expect(parseUrl('http://abc.com/abc/efg/')).equal('/abc/efg');
    });
    it('remove matched root dir', function () {
      expect(parseUrl('http://abc.com/abc/efg/hij/file.htm', '/abc/efg')).equal('/hij/file.htm');
    });
    it('untouch non-matched root dir', function () {
      expect(parseUrl('http://abc.com/abc/efg/hij/file.htm', '/abcd/efg')).equal('/abc/efg/hij/file.htm');
    });
  });
});
