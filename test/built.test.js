/* eslint-disable */
const execFile = require('child_process').execFile;
const expect = require('chai').expect;
const get = require('http').get;

const Server = require('../lib/server').default;
const map = require('../lib/sample.map');

describe('cli', function () {
  this.timeout(5000);

  it('server runs successfully', function (done) {
    const child = execFile('node', ['bin/flex-mock-server.js']);
    child.stdout.on('data', (data) => {
      if (data.indexOf('Server listening on port') > -1) {
        get('http://localhost:3000/abcdef', (res) => {
          child.kill();
          expect(res.statusCode).to.be.equal(404);
          done();
        });
      }
    });
    child.stderr.on('data', (error) => {
      done(error);
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
        done();
      })
    });
  });
});
