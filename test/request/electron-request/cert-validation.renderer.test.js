const assert = require('chai').assert;
const { ElectronRequest } = require('../../../renderer.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */

describe('Responses test', () => {
  const id = 'r-1';
  const requests = /** @type ArcBaseRequest[] */ ([{
    url: 'http://localhost/image',
    method: 'GET',
  }]);
  const opts = [{
    validateCertificates: false,
  }, {
    validateCertificates: true,
  }];

  [
    ['expired', 'https://expired.badssl.com'],
    ['wrong host', 'https://wrong.host.badssl.com/'],
    ['self signed', 'https://self-signed.badssl.com/'],
    ['untrusted root', 'https://untrusted-root.badssl.com/'],
    // ['revoked', 'https://revoked.badssl.com/'],
    // ['pinned', 'https://pinning-test.badssl.com/']
  ].forEach((item, index) => {
    const [name, url] = item;
    it(`reads certificate: ${name}`, (done) => {
      const request = new ElectronRequest({
        url,
        method: 'GET',
      }, `r-${index}`, opts[0]);
      request.once('load', () => done());
      request.once('error', (err) => done(err));
      request.send().catch((e) => done(e));
    });

    it(`Rejects ${name} cert with validation enabled`, (done) => {
      const request = new ElectronRequest({
        url,
        method: 'GET',
      }, `r-${index}`, opts[1]);
      request.once('load', () => {
        done(new Error('Should not load'));
      });
      request.once('error', () => done());
      request.send().catch((e) => done(e));
    });
  });

  it('has the id on the error', (done) => {
    const request = new ElectronRequest(requests[0], id, opts[1]);
    request.once('load', () => done());
    request.once('error', (err, rid) => {
      assert.equal(rid, id);
      done();
    });
    request.send().catch((e) => done(e));
  });
});
