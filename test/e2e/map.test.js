import path from 'path';
import { STATUS_CODES } from 'http';
import got from 'got';
import { expect } from 'chai';

import Server from '../../src/lib/server';
import map from '../../src/lib/sample.map';

describe('mapping', function () {
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
    server = new Server({ map });
  });
  afterEach('stop server', function () {
    server.stop();
  });

  it('Number: standard http code', async function () {
    server.start();
    try {
      await got('http://localhost:3000/code/401/file.htm');
    } catch (err) {
      expect(err.response.statusCode).to.be.equal(401);
      expect(err.response.body).to.be.equal(STATUS_CODES[401]);
    }
  });
  it('Array, http code along with corresponding data', async function () {
    server.start();

    const res = await got('http://localhost:3000/code/301/file.htm', { followRedirect: false });

    expect(res.statusCode).to.be.equal(301);
    expect(res.headers.location).to.be.equal('http://abc.def.com');
    expect(res.body).to.be.equal(STATUS_CODES[301]);
  });
  it('{ data: 1 }', async function () {
    server.start();

    const res = await got.post('http://localhost:3000/data/number');
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.equal('1');
  });
  it('{ data: null }', async function () {
    server.start();

    const res = await got.post('http://localhost:3000/data/null');
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.equal('');
  });
  it('{ data: json }', async function () {
    server.start();

    const res = await got.post('http://localhost:3000/data/json', { json: true });
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.eql({ customData: '123' });
  });
  it('Custom handler, returns plain data', async function () {
    server.start();

    const res = await got.post('http://localhost:3000/data/func/plain?id=1', { json: true });
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.eql({ success: false });
  });
  it('Custom handler, returns promise', async function () {
    server.start();

    const res = await got.post('http://localhost:3000/data/func/promise', { json: true });
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.eql({ data: 'abc' });
  });
  it('function: custom handler shorthand', async function () {
    server.start();

    const res = await got.post('http://localhost:3000/func/file.htm', { json: true });
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.eql({ success: true });
  });
  it('{ post: }', async function () {
    server.start();

    const res = await got.post('http://localhost:3000/post/file.htm', { json: true });
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.eql({ customData: '456' });

    try {
      await got('http://localhost:3000/post/file.htm', { json: true });
    } catch (err) {
      expect(err.response.statusCode).to.be.equal(404);
    }
  });
  it('preprocess', async function () {
    server.start();

    const res = await got.post('http://localhost:3000/before/some-file.htm', { json: true });
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.eql({ customData: '123' });
  });
  it('do not pass through', async function () {
    server.start();

    const res = await got.post('http://localhost:3000/compound/no-through', { json: true });
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.eql({ value: 0, success: false });
  });
  it('pass through two times', async function () {
    server.start();

    const res = await got.post('http://localhost:3000/compound/through/file.htm', { json: true });
    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.eql({ value: 2, success: true });
  });
  it('direct file path mapping', async function () {
    server.start();

    const res = await got('http://localhost:3000/path/article/456/comment/123', { json: true });

    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.eql({ data: 'article_mock_data' });
  });
  it('custom file path mapping', async function () {
    server.start();

    const res = await got('http://localhost:3000/path/custom/article/456/comment/123', { json: true });

    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.eql({ data: 'article_mock_data' });
  });
  it('string: file path mapping shorthand', async function () {
    server.start();

    const res = await got('http://localhost:3000/path/short/article/456/comment/123', { json: true });

    expect(res.statusCode).to.be.equal(200);
    expect(res.body).to.be.eql({ data: 'article_mock_data' });
  });
});
