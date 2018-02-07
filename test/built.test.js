/* eslint-disable */
const childProcess = require('child_process');
const execFile = childProcess.execFile;
const spawn = childProcess.spawn;
const expect = require('chai').expect;
const get = require('http').get;

const Server = require('../lib/server').default;
const map = require('../lib/sample.map');

describe('cli', function () {
  this.timeout(5000);

  it('server runs successfully', function (done) {
    let createChild = spawn;
    const opts = {};
    if (process.platform === 'win') {
      createChild = execFile;
    } else {
      opts.detached = true;
    }
    const child = createChild('node', ['bin/flex-mock-server.js'], opts);
    child.stdout.on('data', (data) => {
      if (data.indexOf('Server listening on port') > -1) {
        get('http://localhost:3000/abcdef', (res) => {
          if (process.platform === 'win') {
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
          console.log(err);
          done();
        });
      }
    });
  });
});

describe('api', function () {
  it('{ data: 1 }', function (done) {
    const server = new Server({ map ,debug:true });
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
});
