import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

before(function () {
  chai.use(sinonChai);
  this.logger = { debug: () => {}, info: () => {}, error: () => {} };
});

beforeEach('set sinon this.sandbox', function () {
  this.sandbox = sinon.sandbox.create();
});
afterEach('restore sinon this.sandbox', function () {
  this.sandbox.restore();
});
