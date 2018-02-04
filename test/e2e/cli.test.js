import { execFileSync, execFile } from 'child_process';
import { expect } from 'chai';
import { get } from 'http';

describe('cli', function () {
  this.timeout(5000);

  it('correct help message', function () {
    const msg = execFileSync('node', ['node_modules/babel-cli/bin/babel-node.js', 'src/bin/flex-mock-server.js', '--help']);
    expect(msg.indexOf('module.exports = {') > -1).to.be.ok;
  });

  it('server runs successfully', function (done) {
    const child = execFile('node', ['node_modules/babel-cli/bin/babel-node.js', 'src/bin/flex-mock-server.js']);
    child.stdout.on('data', (data) => {
      if (data.indexOf('Server listening on port') > -1) {
        get('http://localhost:3000/abcdef', (res) => {
          child.kill('SIGKILL');
          expect(res.statusCode).to.be.equal(404);
        });
      }
    });
    child.stderr.on('data', (error) => {
      done(error);
    });
    child.on('close', () => {
      done();
    });
  });
});
