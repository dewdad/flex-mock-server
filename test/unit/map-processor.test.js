import sinon from 'sinon';
import { expect } from 'chai';

import MapProcessor, { __RewireAPI__ } from '../../src/lib/map-processor';

describe('runBeforeHandlers', function () {
  let req;
  let res;
  let context;
  let wrapper;

  beforeEach('create processor', function () {
    req = { method: 'POST' };
    res = {};
    wrapper = {};
    context = { req, res };
    this.processor = new MapProcessor({ logger: this.logger });
    this.processor.processMapResponse = this.sandbox.stub();
  });

  it('Number: call processMapResponse', function () {
    const patt = /null/;
    expect(this.processor.runBeforeHandlers(patt, 401, wrapper, context)).to.be.equal(false);
    sinon.assert.calledWithExactly(this.processor.processMapResponse, patt, 401, wrapper, context);
  });

  it('Array, call processMapResponse', function () {
    const setting = [301, { url: 'http://abc.def.com' }];
    const patt = /null/;
    expect(this.processor.runBeforeHandlers(patt, setting, wrapper, context)).to.be.equal(false);
    sinon.assert.calledWithExactly(
      this.processor.processMapResponse,
      patt,
      setting,
      wrapper,
      context,
    );
  });
  it('call before, return passThrough', function () {
    const setting = { before: this.sandbox.spy(), passThrough: true };
    expect(this.processor.runBeforeHandlers(/null/, setting, wrapper, context)).to.be.equal(true);
    sinon.assert.calledOnce(setting.before);
  });
});

describe('processMapResponse', function () {
  let req;
  let res;
  let context;
  let wrapper;

  beforeEach('create processor', function () {
    req = { method: 'POST' };
    res = {};
    wrapper = {};
    context = { req, res };
    this.processor = new MapProcessor({ logger: this.logger });
  });

  const settingRewrite = '/article_$2_comment_$1.json';
  function replace(setting) {
    const requestPath = '/path/article/456/comment/123';
    const key = '/path/article/(\\d+)/comment/(\\d+)';
    const patt = new RegExp(key);
    req.url = requestPath;

    expect(patt.test(requestPath)).to.be.ok;

    this.processor.processMapResponse(patt, setting, wrapper, context);
    expect(wrapper.data).to.be.equal(undefined);
    expect(req.url).to.be.equal('/article_123_comment_456.json');
  }

  it('Number: standard http code', function () {
    const spy = this.sandbox.stub();
    __RewireAPI__.__set__({
      stdHandler: spy,
    });
    this.processor.processMapResponse(/null/, 401, wrapper, context);
    sinon.assert.calledWithExactly(spy, req, res, 401, null, this.logger);
  });

  it('Array, http code along with corresponding data', function () {
    const spy = this.sandbox.stub();
    __RewireAPI__.__set__({
      stdHandler: spy,
    });
    const setting = [301, { url: 'http://abc.def.com' }];
    this.processor.processMapResponse(/null/, setting, wrapper, context);
    sinon.assert.calledWithExactly(spy, req, res, setting[0], setting[1], this.logger);
  });

  describe('{data: *}', function () {
    const setting = {};
    it('{ data: null }', function () {
      setting.data = null;
      this.processor.processMapResponse(/null/, setting, wrapper, context);
      expect(wrapper.data).to.be.equal(setting.data);
    });
    it('{ data: "" }', function () {
      setting.data = '';
      this.processor.processMapResponse(/null/, setting, wrapper, context);
      expect(wrapper.data).to.be.equal(setting.data);
    });
    it('{ data: "hello world" }', function () {
      setting.data = 'hello world';
      this.processor.processMapResponse(/null/, setting, wrapper, context);
      expect(wrapper.data).to.be.equal(setting.data);
    });
    it('{ data: 1 }', function () {
      setting.data = 1;
      this.processor.processMapResponse(/null/, setting, wrapper, context);
      expect(wrapper.data).to.be.equal(setting.data);
    });
    it('{ data: { customData: "123" } }', function () {
      setting.data = { customData: '123' };
      this.processor.processMapResponse(/null/, setting, wrapper, context);
      expect(wrapper.data).to.be.equal(setting.data);
    });
    it('{ data: func }', function () {
      const ret = 'data';
      const fun = this.sandbox.stub().returns(ret);
      const data = 'predata';
      wrapper.data = data;
      this.processor.processMapResponse(/null/, { data: fun }, wrapper, context);
      expect(wrapper.data).to.be.equal(ret);
      sinon.assert.calledWithExactly(fun, req, res, data, this.logger);
    });
  });

  it('string: file path map', function () {
    replace.call(this, settingRewrite);
  });

  it('{ path: "" }', function () {
    replace.call(this, { path: settingRewrite });
  });

  it('{ path: func }', function () {
    const requestPath = '/path/func/article/456/comment/123';
    req.url = requestPath;
    const key = '/path/func/article/(\\d+)/comment/(\\d+)';
    const patt = new RegExp(key);
    const newUrl = '/abc/def';

    const setting = {
      path: this.sandbox.stub().returns(newUrl),
    };

    expect(patt.test(requestPath)).to.be.ok;

    this.processor.processMapResponse(patt, setting, wrapper, context);
    sinon.assert.calledWithExactly(setting.path, req, res, this.logger);
    expect(wrapper.data).to.be.equal(undefined);
    expect(req.url).to.be.equal(newUrl);
  });

  it('{ post: 123 }', function () {
    req.method = 'POST';
    this.processor.processMapResponse(/null/, { post: 123 }, wrapper, context);
    expect(wrapper.data).to.be.equal(123);
  });

  it('function: Custom handler', function () {
    const ret = 'data';
    const fun = this.sandbox.stub().returns(ret);
    this.processor.processMapResponse(/null/, fun, wrapper, context);
    expect(wrapper.data).to.be.equal(ret);
    sinon.assert.calledOnce(fun);
  });

  it('post-handler', function () {
    res.afterHandlers = { push: this.sandbox.spy() };
    const setting = { after: 'abc' };
    this.processor.processMapResponse(/null/, setting, wrapper, context);
    sinon.assert.calledOnce(res.afterHandlers.push);
    sinon.assert.calledWith(res.afterHandlers.push, setting.after);
  });
  it('pass through', function () {
    const setting = { data: 123, passThrough: true };
    expect(this.processor.processMapResponse(/null/, setting, wrapper, context)).to.be.equal(true);
    expect(wrapper.data).to.be.equal(123);
  });
});

describe('handleMap', function () {
  const options = {};
  let req;
  let context;
  beforeEach('create map processor', function () {
    req = {};
    context = { req };
    this.processor = new MapProcessor({ options, logger: this.logger });
    this.processor.processMapResponse = this.sandbox.stub();
    this.processor.runBeforeHandlers = this.sandbox.stub();
  });

  describe('no map', function () {
    it('returns undefined', function () {
      expect(this.processor.handleMap(context)).to.be.eql({});
    });
  });

  describe('map set', function () {
    it('none matched', function () {
      const { processMapResponse, runBeforeHandlers } = this.processor;
      options.map = [[new RegExp('/dir1/dir2/401/file\\.htm'), null]];
      req.url = '/dddddd/bbbbbbbb/somefile.html';
      this.processor.handleMap(context);
      sinon.assert.notCalled(processMapResponse);
      sinon.assert.notCalled(runBeforeHandlers);
    });
    it('matched and runBeforeHandlers not pass through', function () {
      const { runBeforeHandlers } = this.processor;
      options.map = [
        [new RegExp('/dir1/dir2/custom/data'), null],
        [new RegExp('/dir1/dir2/custom/.*'), null],
      ];
      req.url = '/dir1/dir2/custom/data';
      this.processor.handleMap(context);
      sinon.assert.calledOnce(runBeforeHandlers);
    });
    it('matched and runBeforeHandlers pass through', function () {
      const { runBeforeHandlers } = this.processor;
      runBeforeHandlers.returns(true);
      options.map = [
        [new RegExp('/dir1/dir2/custom/data'), null],
        [new RegExp('/dir1/dir2/custom/.*'), null],
      ];
      req.url = '/dir1/dir2/custom/data';
      this.processor.handleMap(context);
      sinon.assert.calledTwice(runBeforeHandlers);
    });
    it('matched and processMapResponse not pass through', function () {
      const { processMapResponse } = this.processor;
      options.map = [
        [new RegExp('/dir1/dir2/custom/data'), null],
        [new RegExp('/dir1/dir2/custom/.*'), null],
      ];
      req.url = '/dir1/dir2/custom/data';
      this.processor.handleMap(context);
      sinon.assert.calledOnce(processMapResponse);
    });
    it('matched and processMapResponse pass through', function () {
      const { processMapResponse } = this.processor;
      processMapResponse.returns(true);
      options.map = [
        [new RegExp('/dir1/dir2/custom/data'), null],
        [new RegExp('/dir1/dir2/custom/.*'), null],
      ];
      req.url = '/dir1/dir2/custom/data';
      this.processor.handleMap(context);
      sinon.assert.calledTwice(processMapResponse);
    });
  });
});
