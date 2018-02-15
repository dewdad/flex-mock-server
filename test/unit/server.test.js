import mockRequire from 'mock-require';
import sinon from 'sinon';
import { expect } from 'chai';

describe('class Server', function () {
  before('restore mockRequire', function () {
    this.listen = sinon.spy();
    this.close = sinon.spy();
    this.on = (evt, handler) => {
      this.onErrorInner = handler;
    };
    this.httpServer = { listen: this.listen, close: this.close, on: this.on };
    this.createServer = sinon.stub().returns(this.httpServer);
    mockRequire('http', { createServer: this.createServer });

    this.createLogger = sinon.stub().returns(this.logger);
    mockRequire('../../src/lib/debug', this.createLogger);

    this.listener = {};
    const createListener = sinon.stub().returns(this.listener);
    mockRequire('../../src/lib/listener', createListener);

    this.normalize = sinon.spy();
    mockRequire('../../src/lib/options-helper', { normalize: this.normalize });


    this.port = 123;
    this.debug = true;
    this.options = { port: this.port, debug: this.debug };
    const Server = require('../../src/lib/server').default;
    this.server = new Server(this.options);
  });
  after('restore mockRequire', function () {
    mockRequire.stopAll();
  });

  it('constructor', function () {
    sinon.assert.calledWithExactly(this.normalize, this.options, this.logger);
    sinon.assert.calledWithExactly(this.createLogger, this.debug);
    expect(this.server.logger).to.be.equal(this.logger);
    expect(this.server.options).to.be.equal(this.options);
  });
  it('start', function () {
    this.server.start();

    sinon.assert.calledWithExactly(this.createServer, this.listener);
    sinon.assert.calledWith(this.listen, this.port);
    expect(this.server.server).to.be.equal(this.httpServer);
    const extErrorHandler = this.sandbox.spy();
    this.server.onError(extErrorHandler);
    this.sandbox.spy(this.server, 'stop');

    const error = new Error('err');
    this.onErrorInner(error);

    sinon.assert.calledWithExactly(extErrorHandler, error);
    sinon.assert.calledOnce(this.server.stop);
  });
  it('stop', function () {
    this.server.server.listening = true;
    this.server.stop();
    sinon.assert.calledOnce(this.close);
  });
});
