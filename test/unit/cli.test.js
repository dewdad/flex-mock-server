import mockRequire from 'mock-require';
import sinon from 'sinon';
import { expect } from 'chai';

describe('cli.js', function () {
  beforeEach('correctly creates http server', function () {
    const listen = this.sandbox.spy();
    this.listen = listen;
    const createServer = this.sandbox.stub().returns({ listen, close: () => {}, on: () => {} });
    this.createServer = createServer;
    mockRequire('http', { createServer });
    mockRequire('https', { createServer });

    const port = 123;
    this.port = port;
    const debug = true;
    this.debug = debug;
    const options = { port, debug };
    this.options = options;
    mockRequire('commander', options);

    const createLogger = this.sandbox.stub().returns(this.logger);
    this.createLogger = createLogger;
    mockRequire('../../src/lib/debug', createLogger);

    const parseCli = this.sandbox.spy();
    this.parseCli = parseCli;
    const normalize = this.sandbox.spy();
    this.normalize = normalize;
    mockRequire('../../src/lib/options-helper', { parseCli, normalize });

    const listener = {};
    this.listener = listener;
    const createListener = this.sandbox.stub().returns(listener);
    this.createListener = createListener;
    mockRequire('../../src/lib/listener', createListener);

    const on = this.sandbox.spy(process, 'on');
    this.on = on;
  });
  afterEach('restore mockRequire', function () {
    mockRequire.stopAll();
  });

  it('correctly creates http server', function () {
    require('../../src/lib/cli');

    sinon.assert.calledWithExactly(this.parseCli, this.options);
    sinon.assert.calledWithExactly(this.normalize, this.options, this.logger);
    sinon.assert.calledWithExactly(this.createLogger, this.debug);
    sinon.assert.calledWithExactly(this.createListener, this.options, this.logger);
    sinon.assert.calledWithExactly(this.createServer, this.listener);
    sinon.assert.calledWith(this.listen, this.port);

    const onArgs = this.on.firstCall.args;
    expect(onArgs[0]).to.be.equal('SIGINT');
    expect(typeof onArgs[1]).to.be.equal('function');
  });
  it('correctly creates https server', function () {
    delete require.cache[require.resolve('../../src/lib/cli')];
    this.options.https = true;
    require('../../src/lib/cli');

    sinon.assert.calledOnce(this.createServer);
    expect(this.createServer.getCall(0).args[0].key).to.be.ok;
    expect(this.createServer.getCall(0).args[1]).equal(this.listener);
  });
});
