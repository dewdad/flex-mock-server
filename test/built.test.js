/* eslint-disable */
const childProcess = require('child_process');
const execFile = childProcess.execFile;
const spawn = childProcess.spawn;
const expect = require('chai').expect;
const get = require('http').get;
const got = require('got');

const fs = require('fs');
const stat = fs.stat;
let statBridge;
fs.stat = function statWrapper(){
  if (statBridge) {
    statBridge.apply(null, arguments);
  } else {
    stat.apply(fs, arguments);
  }
}

const Server = require('../lib/server').default;
const map = require('../lib/sample.map');

describe('cli', function () {
  this.timeout(5000);

  it('server runs successfully', function (done) {
    let createChild = spawn;
    const opts = {};
    if (process.platform === 'win32') {
      createChild = execFile;
    } else {
      opts.detached = true;
    }
    const child = createChild('node', ['bin/flex-mock-server.js'], opts);
    child.stdout.on('data', (data) => {
      if (data.indexOf('Server listening on port') > -1) {
        get('http://localhost:3000/abcdef', (res) => {
          if (process.platform === 'win32') {
            child.kill();
          } else {
            process.kill(-child.pid);
          }
          expect(res.statusCode).to.be.equal(404);
        });
      }
    });
    child.on('error', (error) => {
      done(error);
    });
    child.on('exit', (code) => {
      if (code) {
        done(new Error('Server error'));
      } else {
        const req = get('http://localhost:3000/abcdef');
        req.on('error', function (err) {
          console.log(err.message);
          done();
        });
      }
    });
  });
});

describe('api', function () {
  this.timeout(5000);
  it('{ data: 1 }', function (done) {
    const server = new Server({ map });
    server.start();

    get('http://localhost:3000/data/number', (res) => {
      expect(res.statusCode).to.be.equal(200);

      res.setEncoding('utf8');
      res.on('data', function(data){
        expect(data).to.be.equal('1');
        server.stop();
        done();
      })
    });
  });

  it('multiple requests concurrently', async function () {
    statBridge = function(filepath, cb){
      if (filepath === 'test/e2e/mock/article_123_comment_456.json application/json') {
        setTimeout(function(){
          stat.call(fs, filepath, cb);
        }, 500);
      } else {
        stat.call(fs, filepath, cb);
      }
    };
    const server = new Server({ debug:true, cwd: 'test/e2e/mock' });
    server.start();

    const req1 = got('http://localhost:3000/index.html')
      .then((res) => {
        expect(res.statusCode).to.be.equal(200);
        expect(res.body).to.be.equal('/index.html content\n');
      });
    const req2 = got('http://localhost:3000/flight.svg')
      .then((res) => {
        expect(res.statusCode).to.be.equal(200);
        expect(res.headers['content-type']).to.be.equal('image/svg');
        expect(res.body.length).to.be.equal(1380);
      });
    const req3 = got('http://localhost:3000/article_123_comment_456.json')
      .then((res) => {
        expect(res.statusCode).to.be.equal(200);
        expect(res.body).to.be.equal('{"data": "article_mock_data"}\n');
      });
    const req4 = got('http://localhost:3000/dir/index.css')
      .then((res) => {
        expect(res.statusCode).to.be.equal(200);
        expect(res.body).to.be.equal('body{}\n');
      });

    await Promise.all([req1, req2, req3, req4]);
    server.stop();
  });
});
