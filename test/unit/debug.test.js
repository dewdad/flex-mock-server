import chalk from 'chalk';
import sinon from 'sinon';
import { expect } from 'chai';

import createLogger, { getGlobalLogger, __RewireAPI__ } from '../../src/lib/debug';

const formatArgs = __RewireAPI__.__get__('formatArgs');
const Logger = __RewireAPI__.__get__('Logger');
const noop = __RewireAPI__.__get__('noop');
const globalId = __RewireAPI__.__get__('globalId');

describe('formatArgs', function () {
  it('return string with spaces separated', function () {
    expect(formatArgs('aaa', 'bbb', 123, 456)).to.be.equal('aaa bbb 123 456');
  });
  it('stringify object', function () {
    expect(formatArgs('aaa', 'bbb', 123, { a: 1 })).to.be.equal('aaa bbb 123 {"a":1}');
  });
});
describe('Logger', function () {
  beforeEach('spy console.log', function () {
    this.sandbox.spy(console, 'log');
  });

  const logger = new Logger();

  it('constructor', function () {
    expect(logger.constructor.Instances).to.be.equal(1);
    expect(logger.id).to.be.equal('[FMS]');
    expect(global[globalId]).to.be.equal(logger);
  });
  it('getGlobalLogger', function () {
    expect(getGlobalLogger()).to.be.equal(logger);
  });
  it('debug()', function () {
    logger.debug(1, 2);
    sinon.assert.calledWithExactly(console.log, '[FMS]', 1, 2);
  });
  it('info()', function () {
    const str = 'dummy info message';
    Object.defineProperty(chalk, 'blue', { configurable: true, value: this.sandbox.stub().returns(str) });
    logger.info(1, 2);
    sinon.assert.calledWithExactly(chalk.blue, '[FMS]', '1 2');
    expect(console.log.firstCall.args[0].indexOf(str) > -1).to.be.ok;
    delete chalk.blue;
  });
  it('error()', function () {
    const str = 'dummy error message';
    Object.defineProperty(chalk, 'red', { configurable: true, value: this.sandbox.stub().returns(str) });
    logger.error(1, 2);
    sinon.assert.calledWithExactly(chalk.red, '[FMS]', '1 2');
    expect(console.log.firstCall.args[0].indexOf(str) > -1).to.be.ok;
    delete chalk.red;
  });
  it('increment id', function () {
    const logger2 = new Logger();

    expect(logger2.constructor.Instances).to.be.equal(2);
    expect(logger2.id).to.be.equal('[FMS_2]');
    expect(getGlobalLogger()).to.be.not.equal(this);
  });
});
describe('createLogger', function () {
  it('true', function () {
    const logger = createLogger(true);
    expect(logger instanceof Logger).to.be.ok;
  });
  it('false', function () {
    const logger = createLogger(false);
    expect(logger.debug).to.be.equal(noop);
  });
});
