import fs from 'fs';
import path from 'path';
import sinon from 'sinon';
import { expect } from 'chai';
import { Command } from 'commander';

import { parseCli, normalize, __RewireAPI__ } from '../../src/lib/options-helper';

const defaultOptions = {
  port: 3000,
  cwd: process.cwd(),
  // folder: 'mock',
  index: 'index.html',
  autoPreflight: true,
};

describe('getDefaultOptions', function () {
  const getDefaultOptions = __RewireAPI__.__get__('getDefaultOptions');
  let returned;
  it('correct data', function () {
    returned = getDefaultOptions();
    expect(returned).to.be.eql(defaultOptions);
  });
  it('return cached data', function () {
    expect(getDefaultOptions()).to.be.equal(returned);
  });
});

describe('normalize', function () {
  const newHistory = 'newhiafa';
  let parseHistoryFilePath;
  beforeEach('restore module "server"', function () {
    parseHistoryFilePath = this.sandbox.stub().returns(newHistory);
    __RewireAPI__.__set__({
      parseHistoryFilePath,
      getGlobalLogger: this.sandbox.stub().returns(this.logger),
    });
  });
  beforeEach(function () {
    this.sandbox.stub(fs, 'accessSync');
  });

  it('folder with cwd', function () {
    const cwd = '../';
    const folder = 'folder';
    this.sandbox.stub(path, 'resolve');
    normalize({ cwd, folder });
    sinon.assert.calledWithExactly(path.resolve, cwd, folder);
  });
  it('folder non-exist', function () {
    let folder = 'src/lib';
    const cfg = { folder };
    folder = path.resolve(folder);
    fs.accessSync.withArgs(folder).throws();

    try {
      normalize(cfg);
    } catch (err) {
      sinon.assert.calledWithExactly(fs.accessSync, folder);
      expect(err.message).to.be.equal(`The mock data folder does not exist - ${folder}`);
      return;
    }
    sinon.assert.fail();
  });
  it('default logger', function () {
    const logger = { debug: this.sandbox.spy() };
    __RewireAPI__.__set__('getGlobalLogger', this.sandbox.stub().returns(logger));
    normalize({ cwd: '/', folder: '/' });
    sinon.assert.calledOnce(logger.debug);
  });
  it('pass in logger', function () {
    const logger = { debug: this.sandbox.spy() };
    normalize({ cwd: '/', folder: '/' }, logger);
    sinon.assert.calledOnce(logger.debug);
  });
  it('default port 3000 is applied', function () {
    const options = {};
    normalize(options);
    expect(options.port).to.be.equal(3000);
  });

  it('existing port is not overridden', function () {
    const options = { port: 1 };
    normalize(options);
    expect(options.port).to.be.equal(1);
  });

  it('map path without cwd', function () {
    const map = 'src/lib/sample.map.js';
    const cfg = { map };

    normalize(cfg);

    expect(Array.isArray(cfg.map)).to.be.ok;
    expect(cfg.map[0][0].source).to.be.equal('\\/code\\/401\\/file\\.htm');
  });
  it('map path with cwd', function () {
    const map = 'lib/sample.map.js';
    const cfg = { map, cwd: 'src' };

    normalize(cfg);

    expect(Array.isArray(cfg.map)).to.be.ok;
    expect(cfg.map[0][0].source).to.be.equal('\\/code\\/401\\/file\\.htm');
  });
  it('map object', function () {
    const map = { abc: '' };
    const cfg = { map };

    normalize(cfg);

    expect(cfg.map[0] instanceof Array).to.be.ok;
    expect(cfg.map[0][0] instanceof RegExp).to.be.ok;
    expect(cfg.map[0][0].source).to.be.equal('abc');
  });
  it('map path non-exist', function () {
    const map = 'sample.map.js';
    const cfg = { map };

    try {
      normalize(cfg);
    } catch (err) {
      expect(err.message.startsWith('Cannot find module')).to.be.ok;
      return;
    }
    sinon.assert.fail();
  });
  it('root: prepend slash', function () {
    const root = 'abc';
    const cfg = { cwd: '', folder: '', root };

    normalize(cfg);
    expect(cfg.root).to.be.equal(`/${root}`);
  });
  it('root: remove trailing slash', function () {
    const root = 'abc/';
    const cfg = { cwd: '', folder: '', root };

    normalize(cfg);
    expect(cfg.root).to.be.equal('/abc');
  });
  it('history is parsed', function () {
    const history = 'afsaff';
    const cfg = { history };

    normalize(cfg);

    sinon.assert.calledWithExactly(parseHistoryFilePath, cfg, this.logger);
    expect(cfg.history).to.be.equal(newHistory);
  });
  it('history non-exist', function () {
    const history = 'afsaff';
    const cfg = { history };
    fs.accessSync.withArgs(newHistory).throws();

    try {
      normalize(cfg);
    } catch (err) {
      sinon.assert.calledWithExactly(fs.accessSync, newHistory);
      expect(err.message).to.be.equal(`This resorted html5 history file does not exist - ${newHistory}`);
      return;
    }
    sinon.assert.fail();
  });
  it('autoPreflight implies cors', function () {
    const cfg = { autoPreflight: true };

    normalize(cfg);

    expect(cfg.cors).to.be.equal(true);
  });
});

describe('parseCli', function () {
  const { argv } = process;

  before('spy normalize', function () {
    __RewireAPI__.__set__('normalize', sinon.spy());
  });
  after(function () {
    process.argv = argv;
    __RewireAPI__.__ResetDependency__();
  });

  function compare(source, expected) {
    Object.entries(expected).find(([k, v]) => expect(source[k]).to.be.equal(v));
  }

  const port = 5000;
  const cwd = 'abc/def/g';
  const folder = 'folderA';
  const map = 'map.js';
  const index = 'abc/index.htm';
  const history = 'abc/history.htm';
  const root = '/abcdef/';

  const options = {
    debug: true,
    port,
    cwd,
    folder,
    map,
    index,
    history,
    cors: true,
    corsCookie: true,
    autoPreflight: true,
    root,
  };

  it('long', function () {
    process.argv = `node server --debug --port ${port} --cwd ${cwd} --folder ${folder} --map ${map} --index ${index} --history ${history} --cors --cors-cookie --auto-preflight false --root ${root}`.split(' ');
    compare(parseCli(new Command()), options);
  });

  it('short', function () {
    process.argv = `node server -d -p ${port} -c ${cwd} -f ${folder} -m ${map} -i ${index} -h ${history} -C -k -o false -r ${root}`.split(' ');
    compare(parseCli(new Command()), options);
  });
});
