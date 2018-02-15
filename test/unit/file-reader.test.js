import path from 'path';
import sinon from 'sinon';
import { expect } from 'chai';

const bPromise = require('bluebird');

import FileReader, { __RewireAPI__ } from '../../src/lib/file-reader';

describe('class FileReader', function () {
  afterEach('__ResetDependency__', () => {
    __RewireAPI__.__ResetDependency__();
  });

  it('constructor', function () {
    const listener = { logger: this.logger, options: {} };
    const reader = new FileReader(listener);
    expect(reader.listener).to.be.equal(listener);
    expect(reader.logger).to.be.equal(this.logger);
  });

  describe('doRead', function () {
    const req = {};
    const res = {};
    const context = { req, res };
    beforeEach('create reader', function () {
      this.reader = new FileReader({ logger: this.logger, options: {} });
    });

    it('succeed to read', function (done) {
      const filePath = 'abc/def.htm';
      const ctn = 'file content';
      res.setHeader = this.sandbox.spy();
      const readFile = this.sandbox.stub().callsFake((file, encoding, cb) => cb(null, ctn));
      const readFileP = bPromise.promisify(readFile);
      __RewireAPI__.__set__('readFile', readFileP);
      this.reader.doRead(filePath, context).then((content) => {
        sinon.assert.calledWith(readFile, filePath, 'utf8');
        expect(content).to.be.equal(ctn);
        sinon.assert.calledWith(res.setHeader, 'Content-type', 'text/html');
        done();
      }).catch((err) => {
        done(err);
      });
    });
    it('fail to read', function (done) {
      const ioError = new Error('Unknown fs error.');
      const readFile = this.sandbox.stub().callsFake((filePath, encoding, cb) => cb(ioError));
      const readFileP = bPromise.promisify(readFile);
      const stdHandler = this.sandbox.spy();
      __RewireAPI__.__set__({
        readFile: readFileP,
        stdHandler,
      });
      this.reader.doRead('', context).then((content) => {
        sinon.assert.calledWith(readFile, '', 'utf8');
        expect(content).to.be.equal(`Error getting the file: ${ioError.message}.`);
        sinon.assert.calledWithExactly(stdHandler, req, res, 500, null, this.logger);
        done();
      }).catch((err) => {
        done(err);
      });
    });
  });

  describe('handleFile', function () {
    const fileCtn = 'file content';
    const index = 'home.html';
    const doRead = sinon.stub().returns(fileCtn);
    const req = {};
    const res = {};
    const context = { req, res };
    beforeEach('create reader', function () {
      this.reader = new FileReader({
        context,
        options: { index },
        logger: this.logger,
      });
      this.reader.doRead = doRead;
      this.sandbox.stub(path, 'join').returnsArg(1);
    });
    afterEach(function () {
      doRead.resetHistory();
    });

    it('query is removed', function () {
      const stat = this.sandbox.spy();
      const statP = bPromise.promisify(stat);
      const access = this.sandbox.stub().callsFake((filePath, mode, cb) => cb());
      const accessP = bPromise.promisify(access);
      __RewireAPI__.__set__({
        stat: statP,
        access: accessP,
      });

      req.url = 'abc/def?afdsafs=323&dafd=1';
      this.reader.handleFile(context);

      sinon.assert.calledWith(stat, 'abc/def');
    });
    it('folder is prepended', function () {
      const stat = this.sandbox.stub()
        .callsFake((filePath, cb) => cb(null, { isDirectory: () => {} }));
      const statP = bPromise.promisify(stat);
      const access = this.sandbox.stub().callsFake((filePath, mode, cb) => cb());
      const accessP = bPromise.promisify(access);
      __RewireAPI__.__set__({
        stat: statP,
        access: accessP,
      });

      req.url = 'abc/def';
      const folder = 'folderMock';
      this.reader.listener.options.folder = folder;
      this.reader.handleFile(context);

      sinon.assert.calledWithExactly(path.join, folder, req.url);
    });
    it('existing directory', function (done) {
      req.url = 'abc/def';
      const stat = this.sandbox.stub()
        .callsFake((filePath, cb) => cb(null, { isDirectory: () => true }));
      const statP = bPromise.promisify(stat);
      const access = this.sandbox.stub().callsFake((filePath, mode, cb) => cb());
      const accessP = bPromise.promisify(access);
      __RewireAPI__.__set__({
        stat: statP,
        access: accessP,
      });
      this.reader.handleFile(context).then((ctn) => {
        sinon.assert.calledWith(stat, req.url);
        sinon.assert.calledWith(access, path.join(req.url, index));
        sinon.assert.calledOnce(doRead);
        expect(ctn).to.be.equal(fileCtn);
        done();
      }).catch((err) => {
        done(err);
      });
    });
    it('non-existing directory, no historyFilePath set', function (done) {
      req.url = 'abc/def';
      const stat = this.sandbox.stub().callsFake((filePath, cb) => cb(new Error('ioError non-exist')));
      const statP = bPromise.promisify(stat);
      const stdHandler = this.sandbox.spy();
      __RewireAPI__.__set__({
        stat: statP,
        stdHandler,
      });
      this.reader.handleFile(context).then((ctn) => {
        sinon.assert.notCalled(doRead);
        sinon.assert.calledWith(stdHandler, req, res, 404);
        expect(ctn).to.be.equal(undefined);
        done();
      }).catch((err) => {
        done(err);
      });
    });
    it('non-existing directory, with historyFilePath set to true', function (done) {
      req.url = 'abc/def';
      const stat = this.sandbox.stub().callsFake((filePath, cb) => cb(new Error('ioError non-exist')));
      const statP = bPromise.promisify(stat);
      const stdHandler = this.sandbox.spy();
      this.reader.historyFilePath = 'history.html';
      __RewireAPI__.__set__({
        stat: statP,
        stdHandler,
      });
      this.reader.handleFile(context).then((ctn) => {
        sinon.assert.calledWithExactly(doRead, this.reader.historyFilePath, context);
        sinon.assert.notCalled(stdHandler);
        expect(ctn).to.be.equal(fileCtn);
        done();
      }).catch((err) => {
        done(err);
      });
    });
    it('non-existing directory, with historyFilePath set to path', function (done) {
      req.url = 'abc/def';
      const stat = this.sandbox.stub().callsFake((filePath, cb) => cb(new Error('ioError non-exist')));
      const statP = bPromise.promisify(stat);
      const stdHandler = this.sandbox.spy();
      this.reader.historyFilePath = 'history.html';
      __RewireAPI__.__set__({
        stat: statP,
        stdHandler,
      });
      this.reader.handleFile(context).then((ctn) => {
        sinon.assert.calledWithExactly(doRead, this.reader.historyFilePath, context);
        sinon.assert.notCalled(stdHandler);
        expect(ctn).to.be.equal(fileCtn);
        done();
      }).catch((err) => {
        done(err);
      });
    });
    it('existing file', function (done) {
      req.url = 'abc/def.htm';
      const stat = this.sandbox.stub()
        .callsFake((filePath, cb) => cb(null, { isDirectory: () => false }));
      const statP = bPromise.promisify(stat);
      __RewireAPI__.__set__({
        stat: statP,
      });
      this.reader.handleFile(context).then((ctn) => {
        sinon.assert.calledOnce(doRead);
        expect(ctn).to.be.equal(fileCtn);
        done();
      }).catch((err) => {
        done(err);
      });
    });
    it('non-existing file', function (done) {
      req.url = 'abc/def.htm';
      const stat = this.sandbox.stub().callsFake((filePath, cb) => cb(new Error('ioError non-exist')));
      const statP = bPromise.promisify(stat);
      const stdHandler = this.sandbox.spy();
      this.reader.historyFilePath = 'history.html';
      __RewireAPI__.__set__({
        stat: statP,
        stdHandler,
      });
      this.reader.handleFile(context).then((ctn) => {
        sinon.assert.notCalled(doRead);
        sinon.assert.calledWith(stdHandler, req, res, 404);
        expect(ctn).to.be.equal(undefined);
        done();
      }).catch((err) => {
        done(err);
      });
    });
  });
});
