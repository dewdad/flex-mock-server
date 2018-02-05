import { execFileSync, execFile } from 'child_process';
import { expect } from 'chai';
import { get } from 'http';

describe('cli', function () {
  this.timeout(8000);
  it('correct help message', function () {
    const msg = execFileSync('node', ['node_modules/babel-cli/bin/babel-node.js', 'src/bin/flex-mock-server.js', '--help']);
    expect(msg.indexOf('module.exports = {') > -1).to.be.ok;
  });

  it('server runs successfully', function (done) {
    const child = execFile('node', ['node_modules/babel-cli/bin/babel-node.js', 'src/bin/flex-mock-server.js', '--port', '3000']);
    child.stdout.on('data', (data) => {
      if (data.indexOf('Server listening on port') > -1) {
        get('http://localhost:3000/abcdef', (res) => {
          expect(res.statusCode).to.be.equal(404);
          child.kill();
        });
      }
    });
    child.on('error', (error) => {
      done(error);
    });
    child.on('exit', () => {
      done();
    });
  });
});
