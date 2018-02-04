import path from 'path';
import { STATUS_CODES } from 'http';
import got from 'got';
import { expect } from 'chai';

import Server from '../../src/lib/server';

describe('options', () => {
  let server;
  const mockDir = path.resolve(__dirname, 'mock');
  beforeEach('store cwd', function () {
    this.cwd = process.cwd();
    process.chdir(mockDir);
  });
  afterEach('stop server', function () {
    server.stop();
    process.chdir(this.cwd);
  });

  function ensureHome(res) {
    expect(res.statusCode).to.be.equal(200);
    expect(res.headers['content-type']).to.be.equal('text/html');
    expect(res.body).to.be.equal('/dir/home.htm content\n');
  }

  it('debug', async function () {
    this.sandbox.stub(console, 'log');

    server = new Server({ debug: true });
    server.start();
    expect(console.log.secondCall.args[0].indexOf('Server listening on port 3000') > -1).to.be.ok;

    try {
      await got('http://localhost:3000/debug');
    } catch (err) {
      expect(err.response.statusCode).to.be.equal(404);
      expect(err.response.body).to.be.equal(STATUS_CODES[404]);
      expect(console.log.getCalls().length > 5).to.be.ok;
    }
  });
  it('port', async function () {
    server = new Server({ port: 5000 });
    server.start();

    try {
      await got('http://localhost:3000/port3000', { retries: 0 });
    } catch (err) {
      expect(err.message.startsWith('connect ECONNREFUSED')).to.be.ok;

      try {
        await got('http://localhost:5000/port5000');
      } catch (err2) {
        expect(err2.response.statusCode).to.be.equal(404);
        expect(err2.response.body).to.be.equal(STATUS_CODES[404]);
      }
    }
  });
  it('relative cwd', async function () {
    server = new Server({ cwd: '../../e2e' });
    server.start();

    const res = await got.post('http://localhost:3000/mock/dir/home.htm');
    ensureHome(res);
  });
  it('absolute cwd', async function () {
    server = new Server({ cwd: __dirname });
    server.start();

    const res = await got.post('http://localhost:3000/mock/dir/home.htm');
    ensureHome(res);
  });
  it('folder', async function () {
    server = new Server({ folder: 'dir' });
    server.start();

    const res = await got.post('http://localhost:3000/home.htm');
    ensureHome(res);
  });
  it('index', async function () {
    server = new Server({ index: 'home.htm' });
    server.start();

    const res = await got.post('http://localhost:3000/dir');
    ensureHome(res);
  });
  it('history', async function () {
    server = new Server({ history: 'dir/home.htm' });
    server.start();

    const res = await got.post('http://localhost:3000/abc/def/ghi');
    ensureHome(res);
  });
  it('cors', async function () {
    server = new Server({ cors: true });
    server.start();

    const origin = 'local.host';
    const res = await got.post('http://localhost:3000/dir/home.htm', { headers: { origin } });
    ensureHome(res);
    expect(res.headers['access-control-allow-origin']).to.be.equal(origin);
  });
  it('corsCookie', async function () {
    server = new Server({ cors: true, corsCookie: true });
    server.start();

    const origin = 'local.host';
    const res = await got.post('http://localhost:3000/dir/home.htm', { headers: { origin } });
    ensureHome(res);
    expect(res.headers['access-control-allow-origin']).to.be.equal(origin);
    expect(res.headers['access-control-allow-credentials']).to.be.equal('true');
  });
  it('autoPreflight', async function () {
    server = new Server({ autoPreflight: true });
    server.start();
    const headers = 'header1, header2';
    const method = 'method1';
    const origin = 'local.host';
    const res = await got(
      'http://localhost:3000/dir/home.htm',
      {
        method: 'options',
        headers: {
          origin,
          'Access-Control-Request-Headers': headers,
          'Access-Control-Request-Method': method,
        },
      },
    );
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.equal('');
    expect(res.headers['access-control-allow-origin']).to.be.equal(origin);
    expect(res.headers['access-control-allow-headers']).to.be.equal(headers);
    expect(res.headers['access-control-allow-methods']).to.be.equal(method);
  });
  it('root', async function () {
    server = new Server({ root: 'rootdir' });
    server.start();

    const res = await got.post('http://localhost:3000/rootdir/dir/home.htm');
    ensureHome(res);
  });
});
