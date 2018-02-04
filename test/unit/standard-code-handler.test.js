import { STATUS_CODES } from 'http';
import sinon from 'sinon';
import { expect } from 'chai';

import stdHandler from '../../src/lib/standard-code-handler';

describe('standard-code-handlers.js', function () {
  const logger = { debug: () => {} };
  it('defaultHandler', function () {
    const res = {};
    expect(stdHandler(null, res, 408, null, logger)).to.be.equal(STATUS_CODES[408]);
    expect(res.statusCode).to.be.equal(408);
    expect(res.statusMessage).to.be.equal(STATUS_CODES[408]);
  });
  describe('customHandlers', function () {
    it('301', function () {
      const res = { setHeader: sinon.spy() };
      const url = 'afsf.dsalfjasf.dd';
      expect(stdHandler(null, res, 301, { url }, logger)).to.be.equal(STATUS_CODES[301]);
      expect(res.statusCode).to.be.equal(301);
      expect(res.statusMessage).to.be.equal(STATUS_CODES[301]);
      sinon.assert.calledWith(res.setHeader, 'location', url);
    });
    it('302', function () {
      const res = { setHeader: sinon.spy() };
      const url = 'afsf.dsalfjasf.dd';
      stdHandler(null, res, 302, { url }, logger);
      expect(res.statusCode).to.be.equal(302);
      expect(res.statusMessage).to.be.equal('Found');
      sinon.assert.calledWith(res.setHeader, 'location', url);
    });
  });
});
