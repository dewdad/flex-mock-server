import path from 'path';
import { STATUS_CODES } from 'http';
import got from 'got';
import { expect } from 'chai';

import Server from '../../src/lib/server';

describe('file system', function () {
  const mockDir = path.resolve(__dirname, 'mock');
  beforeEach('store cwd', function () {
    this.cwd = process.cwd();
    process.chdir(mockDir);
  });
  afterEach('restore cwd', function () {
    process.chdir(this.cwd);
  });

  let server;
  beforeEach('create server', function () {
    server = new Server({debug:1});
  });
  afterEach('stop server', function () {
    server.stop();
  });

  function ensure(res) {
    expect(res.statusCode).to.be.equal(200);
    expect(res.headers['content-type']).to.be.equal('text/html');
  }
  function ensureHome(res) {
    ensure(res);
    expect(res.body).to.be.equal('/dir/home.htm content\n');
  }
  function ensureWith(res, ctn) {
    ensure(res);
    expect(res.body).to.be.equal(ctn);
  }


  it('existing directory, default index', async function () {
    server.start();

    const res = await got('http://localhost:3000');
    ensureWith(res, '/index.html content\n');
  });

  it('non-existing directory, no historyFilePath set', async function () {
    server.start();

    try {
      await got('http://localhost:3000/code');
    } catch (err) {
      expect(err.response.statusCode).to.be.equal(404);
      expect(err.response.body).to.be.equal(STATUS_CODES[404]);
    }
  });
  it('non-existing directory, with historyFilePath set to true', async function () {
    server = new Server({ history: true });
    server.start();

    const res = await got('http://localhost:3000/dir/abc/');
    ensureWith(res, '/index.html content\n');
  });
  it('non-existing directory, with historyFilePath set to path', async function () {
    server = new Server({ history: '/dir/home.htm' });
    server.start();

    const res = await got('http://localhost:3000/efd/abc/');
    ensureHome(res);
  });
  it('existing text file', async function () {
    server.start();

    const res = await got('http://localhost:3000/dir/home.htm');
    ensureHome(res);
  });
  it('existing binary file', async function () {
    server.start();

    const res = await got('http://localhost:3000/flight.svg');
    res.on('close', () => {
      expect(res.statusCode).to.be.equal(200);
      expect(res.headers['content-type']).to.be.equal('image/svg+xml');
      expect(res.body.length).to.be.equal(1380);
    });
  });
  it('non-existing file', async function () {
    server.start();

    try {
      await got('http://localhost:3000/code/afe.htm');
    } catch (err) {
      expect(err.response.statusCode).to.be.equal(404);
      expect(err.response.body).to.be.equal(STATUS_CODES[404]);
    }
  });
});
