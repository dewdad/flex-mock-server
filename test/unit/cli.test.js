import mockRequire from 'mock-require';
import sinon from 'sinon';
import { expect } from 'chai';

describe('cli.js', function () {
  after('restore mockRequire', function () {
    mockRequire.stopAll();
  });

  it('correctly creates server', function () {
    const listen = this.sandbox.spy();
    const createServer = this.sandbox.stub().returns({ listen, close: () => {} });
    mockRequire('http', { createServer });

    const port = 123;
    const debug = true;
    const options = { port, debug };
    mockRequire('commander', options);

    const createLogger = this.sandbox.stub().returns(this.logger);
    mockRequire('../../src/lib/debug', createLogger);

    const parseCli = this.sandbox.spy();
    const normalize = this.sandbox.spy();
    mockRequire('../../src/lib/options-helper', { parseCli, normalize });

    const listener = {};
    const createListener = this.sandbox.stub().returns(listener);
    mockRequire('../../src/lib/listener', createListener);

    const on = this.sandbox.spy(process, 'on');

    require('../../src/lib/cli');

    sinon.assert.calledWithExactly(parseCli, options);
    sinon.assert.calledWithExactly(normalize, options, this.logger);
    sinon.assert.calledWithExactly(createLogger, debug);
    sinon.assert.calledWithExactly(createListener, options, this.logger);
    sinon.assert.calledWithExactly(createServer, listener);
    sinon.assert.calledWithExactly(listen, port);

    const onArgs = on.firstCall.args;
    expect(onArgs[0]).to.be.equal('SIGINT');
    expect(typeof onArgs[1]).to.be.equal('function');
  });
});
