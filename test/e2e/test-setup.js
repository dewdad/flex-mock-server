import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

before(function () {
  chai.use(sinonChai);

  this.timeout(5000);
});

beforeEach('set sinon sandbox', function () {
  this.sandbox = sinon.sandbox.create();
});
afterEach('restore sinon sandbox', function () {
  this.sandbox.restore();
});
