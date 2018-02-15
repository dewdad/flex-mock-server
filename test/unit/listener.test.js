import path from 'path';
import sinon from 'sinon';
import { expect } from 'chai';
import { ReadStream } from 'fs';

import createListener, { __RewireAPI__ } from '../../src/lib/listener';

describe('class Listener', function () {
  afterEach('__ResetDependency__', () => {
    __RewireAPI__.__ResetDependency__();
  });

  function MapProcessor() {}
  function FileReader() {}
  __RewireAPI__.__set__({
    MapProcessor, FileReader,
  });

  const Listener = __RewireAPI__.__get__('Listener');

  it('constructor', function () {
    const options = {};
    const listener = new Listener(options, this.logger);
    expect(listener.options).to.be.equal(options);
    expect(listener.logger).to.be.equal(this.logger);
  });
  describe('setCorsHeaders', function () {
    const options = {};
    const req = {
      headers: { origin: 'abcd.com' },
    };
    const res = {};
    const context = { req, res };

    beforeEach(function () {
      res.setHeader = this.sandbox.spy();
      this.listener = new Listener(options);
    });

    it('req.headers.origin is read and set', function () {
      this.listener.setCorsHeaders(context);
      sinon.assert.calledWithExactly(res.setHeader.firstCall, 'Access-Control-Allow-Origin', req.headers.origin);
    });
    it('set allow-credentials', function () {
      options.corsCookie = true;
      this.listener.setCorsHeaders(context);
      sinon.assert.calledWithExactly(res.setHeader.secondCall, 'Access-Control-Allow-Credentials', 'true');
    });
  });

  describe('handlePreflight', function () {
    const req = { headers: {} };
    const end = sinon.spy();
    const setHeader = sinon.spy();
    const res = { setHeader, end };
    const context = { req, res };

    afterEach(function () {
      setHeader.reset();
    });

    it('end response', function () {
      Listener.handlePreflight(context);
      sinon.assert.calledOnce(end);
    });
    it('without request-headers and request-methods', function () {
      Listener.handlePreflight(context);
      sinon.assert.calledWithExactly(res.setHeader.firstCall, 'Access-Control-Allow-Headers', '*');
      sinon.assert.calledWithExactly(res.setHeader.secondCall, 'Access-Control-Allow-Methods', '*');
    });
    it('reflect request-headers and request-methods', function () {
      req.headers['access-control-request-headers'] = 'X-PINGOTHER, Content-Type';
      req.headers['access-control-request-method'] = 'post, get';
      Listener.handlePreflight(context);
      sinon.assert.calledWithExactly(res.setHeader.firstCall, 'Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
      sinon.assert.calledWithExactly(res.setHeader.secondCall, 'Access-Control-Allow-Methods', req.headers['access-control-request-method']);
    });
  });

  describe('send', function () {
    const req = {};
    const res = { getHeader: () => 'text' };
    const context = { req, res };

    beforeEach(function () {
      res.end = this.sandbox.spy();
      this.listener = new Listener(null, this.logger);
    });

    it('passed in string', function () {
      res.afterHandlers = [];
      const data = 'data';
      this.listener.send(data, context);
      sinon.assert.calledWithExactly(res.end, data);
    });
    it('passed in object', function () {
      res.afterHandlers = [];
      const data = { a: 1 };
      this.listener.send(data, context);
      sinon.assert.calledWithExactly(res.end, '{"a":1}');
    });
    it('passed in bool', function () {
      res.afterHandlers = [];
      const data = true;
      this.listener.send(data, context);
      sinon.assert.calledWithExactly(res.end, 'true');
    });
    it('passed in ReadStream', function () {
      res.afterHandlers = [];
      const evts = {};
      function on(evt, handler) {
        evts[evt] = handler;
        return this;
      }
      const stdHandler = this.sandbox.spy();
      __RewireAPI__.__set__({
        stdHandler,
      });
      const data = new ReadStream(path.resolve(__dirname, 'listener.test.js'));
      this.sandbox.stub(data, 'pipe').returns({ on });

      this.listener.send(data, context);
      sinon.assert.calledWithExactly(data.pipe, res);

      evts.error({ message: 'err' });
      sinon.assert.calledWithExactly(stdHandler, req, res, 500, null, this.logger);
      sinon.assert.calledOnce(res.end);

      evts.close();
      sinon.assert.calledTwice(res.end);
    });

    it('single afterHandler', function () {
      const data = 'data';
      const append = 'append';
      const handler = this.sandbox.stub().returns(data + append);
      res.afterHandlers = [handler];
      this.listener.send(data, context);
      sinon.assert.calledWithExactly(handler, req, res, data, this.logger);
      sinon.assert.calledWithExactly(res.end, data + append);
    });

    it('forget to return data in previous handler', function () {
      const data = 'data';
      const handler1 = this.sandbox.spy();
      const handler2 = this.sandbox.stub().returnsArg(2);
      res.afterHandlers = [handler1, handler2];
      this.listener.send(data, context);
      sinon.assert.calledWithExactly(handler2, req, res, undefined, this.logger);
      sinon.assert.calledWithExactly(res.end, undefined);
    });

    it('return data in previous handler correctly', function () {
      const data = 'data';
      const handler1 = this.sandbox.stub().returnsArg(2);
      const handler2 = this.sandbox.stub().returnsArg(2);
      res.afterHandlers = [handler1, handler2];
      this.listener.send(data, context);
      sinon.assert.calledWithExactly(handler2, req, res, data, this.logger);
      sinon.assert.calledWithExactly(res.end, data);
    });
  });

  describe('listen', function () {
    let req;
    let res;
    let parseUrl;
    let handleMap;
    let handleFile;
    let send;
    const options = {};
    beforeEach(function () {
      req = { headers: {} };
      res = { end: this.sandbox.spy() };
      parseUrl = this.sandbox.spy();
      MapProcessor.prototype.handleMap = this.sandbox.stub().returns({});
      ({ handleMap } = MapProcessor.prototype);
      FileReader.prototype.handleFile = this.sandbox.stub();
      ({ handleFile } = FileReader.prototype);
      this.listener = new Listener(options, this.logger);
      this.listener.send = this.sandbox.stub();
      ({ send } = this.listener);
      __RewireAPI__.__set__({ parseUrl });
    });
    it('no cors, no headers.origin', function () {
      this.listener.setCorsHeaders = this.sandbox.spy();
      const { setCorsHeaders } = this.listener;
      this.listener.listen(req, res);
      sinon.assert.notCalled(setCorsHeaders);
    });
    it('cors with headers.origin', function () {
      options.cors = true;
      req.headers.origin = 'abc';
      this.listener.setCorsHeaders = this.sandbox.spy();
      const { setCorsHeaders } = this.listener;
      this.listener.listen(req, res);
      sinon.assert.calledOnce(setCorsHeaders);
      delete options.cors;
    });
    it('OPTIONS method, autoPreflight: true', function () {
      req.method = 'OPTIONS';
      Listener.handlePreflight = this.sandbox.spy();
      const { handlePreflight } = Listener;
      options.autoPreflight = true;
      this.listener.listen(req, res);
      sinon.assert.calledOnce(handlePreflight);
      sinon.assert.notCalled(parseUrl);
    });
    it('OPTIONS method, autoPreflight: false', function () {
      req.method = 'OPTIONS';
      Listener.handlePreflight = this.sandbox.spy();
      const { handlePreflight } = Listener;
      options.autoPreflight = false;
      this.listener.listen(req, res);
      sinon.assert.notCalled(handlePreflight);
      sinon.assert.calledOnce(parseUrl);
    });
    it('handleMap returns no data', function (done) {
      handleFile.callsFake(() => done());
      this.listener.listen(req, res);
    });
    it('handleMap returns data', function (done) {
      handleMap.returns({ data: null });
      handleFile.callsFake(function () {
        sinon.assert.fail();
        done();
      });
      send.callsFake((data) => {
        expect(data).to.be.equal(null);
        done();
      });
      this.listener.listen(req, res);
    });
    it('handleMap returns primitive', function (done) {
      handleMap.returns({ data: 123 });
      handleFile.callsFake(function () {
        sinon.assert.fail();
        done();
      });
      send.callsFake((data) => {
        expect(data).to.be.equal(123);
        done();
      });
      this.listener.listen(req, res);
    });
    it('handleMap returns Promise, resolving no data', function (done) {
      const prom = new Promise((resolve) => {
        resolve({});
      });
      handleFile.callsFake(function () {
        done();
      });
      handleMap.returns(prom);
      this.listener.listen(req, res);
    });
    it('handleMap returns Promise, resolving data', function (done) {
      const data = 'data';
      const prom = new Promise((resolve) => {
        resolve({ data });
      });
      handleFile.callsFake(function () {
        sinon.assert.fail();
        done();
      });
      send.callsFake((rs) => {
        expect(rs).to.be.equal(data);
        done();
      });
      handleMap.returns(prom);
      this.listener.listen(req, res);
    });
    it('handleMap returns Promise, which throws error', function (done) {
      const error = new Error('some error');
      const prom = new Promise(function () {
        throw error;
      });
      handleMap.returns(prom);
      send.callsFake((rs) => {
        expect(rs).to.be.equal(error.message);
        done();
      });
      this.listener.listen(req, res);
    });
    it('handleMap returns Promise, which rejects', function (done) {
      const data = 'daa';
      const prom = new Promise((resolve, reject) => {
        reject(data);
      });
      handleMap.returns(prom);
      send.callsFake((rs) => {
        expect(rs).to.be.equal(data);
        expect(res.statusCode).to.be.equal(500);
        done();
      });
      this.listener.listen(req, res);
    });
    it('handleFile returns data', function (done) {
      const data = 'data';
      handleFile.callsFake(() => data);
      send.callsFake((rs) => {
        expect(rs).to.be.equal(data);
        done();
      });
      this.listener.listen(req, res);
    });
    it('handleFile returns Promise', function (done) {
      const data = 'data';
      const prom = new Promise((resolve) => {
        resolve(data);
      });
      handleFile.returns(prom);
      send.callsFake((rs) => {
        expect(rs).to.be.equal(data);
        done();
      });
      this.listener.listen(req, res);
    });
    it('handleFile throws error', function (done) {
      const error = new Error('some error');
      handleFile.throws(error);
      send.callsFake((rs) => {
        expect(res.statusCode).to.be.equal(500);
        expect(rs).to.be.equal(error.message);
        done();
      });
      this.listener.listen(req, res);
    });
    it('handleFile returns Promise, which throws error', function (done) {
      const error = new Error('some error');
      const prom = new Promise(function () {
        throw error;
      });
      handleFile.returns(prom);
      send.callsFake((rs) => {
        expect(res.statusCode).to.be.equal(500);
        expect(rs).to.be.equal(error.message);
        done();
      });
      this.listener.listen(req, res);
    });
    it('handleFile returns Promise, which rejects', function (done) {
      const data = 'daa';
      const prom = new Promise((resolve, reject) => {
        reject(data);
      });
      handleFile.returns(prom);
      send.callsFake((rs) => {
        expect(rs).to.be.equal(data);
        done();
      });
      this.listener.listen(req, res);
    });
    it('internal error', function (done) {
      const error = new Error('some error');
      handleFile.throws(error);
      send.callsFake((rs) => {
        expect(res.statusCode).to.be.equal(500);
        expect(rs).to.be.equal(error.message);
        done();
      });
      this.listener.listen(req, res);
    });
  });
});
describe('createListener', function () {
  const options = {};
  const listen = {};
  const inst = { listen };
  it('created correctly', function () {
    const Listener = this.sandbox.stub().returns(inst);
    const getGlobalLogger = this.sandbox.stub().returns(this.logger);
    __RewireAPI__.__set__({ Listener, getGlobalLogger });
    listen.bind = this.sandbox.stub().returns(1);
    const { bind } = listen;
    expect(createListener(options, this.logger)).to.be.equal(1);
    sinon.assert.calledWithNew(Listener);
    sinon.assert.calledWithExactly(Listener, options, this.logger);
    sinon.assert.calledOnce(bind);
    sinon.assert.calledWithExactly(bind, inst);
    __RewireAPI__.__ResetDependency__();
  });
});
