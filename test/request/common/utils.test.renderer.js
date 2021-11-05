const { assert } = require('chai');
require = require('esm')(module);
const { ArcHeaders } = require('@advanced-rest-client/base/src/lib/headers/ArcHeaders.js');
const { RequestUtils } = require('../../../renderer.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */

describe('RequestUtils tests', () => {
  const requests = /** @type ArcBaseRequest[] */ ([{
    url: `http://localhost:1234/api/endpoint?query=param`,
    method: 'POST',
    headers: 'content-type: text/plain',
    payload: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x0a, 0x74, 0x65, 0x73, 0x74]),
  }, {
    url: `http://localhost:1234/api/endpoint?query=param`,
    method: 'GET',
    headers: 'Host: test.com',
  }]);

  describe('getPort()', () => {
    it('Returns number when number is passed', () => {
      const result = RequestUtils.getPort(20);
      assert.equal(result, 20);
    });

    it('Returns number when number is a string', () => {
      const result = RequestUtils.getPort('20');
      assert.equal(result, 20);
    });

    it('Returns 443 port from the protocol', () => {
      const result = RequestUtils.getPort(0, 'https:');
      assert.equal(result, 443);
    });

    it('Returns 80 port from the protocol', () => {
      const result = RequestUtils.getPort(undefined, 'http:');
      assert.equal(result, 80);
    });
  });

  describe('getHostHeader()', () => {
    it('Returns host with SSL port', () => {
      const result = RequestUtils.getHostHeader('https://domain.com/path');
      assert.equal(result, 'domain.com');
    });

    it('Returns host with http port', () => {
      const result = RequestUtils.getHostHeader('http://domain.com/path');
      assert.equal(result, 'domain.com');
    });

    it('Respects existing port', () => {
      const result = RequestUtils.getHostHeader('https://domain.com:123/path');
      assert.equal(result, 'domain.com:123');
    });
  });

  describe('_addContentLength()', () => {
    let headers;
    beforeEach(() => {
      headers = new ArcHeaders();
    });

    it('Adds content length header', () => {
      RequestUtils.addContentLength(requests[0].method, /** @type Buffer */ (requests[0].payload), headers);
      assert.equal(headers.get('content-length'), 9);
    });

    it('Do nothing for GET requests', () => {
      RequestUtils.addContentLength(requests[1].method, undefined, headers);
      assert.isFalse(headers.has('content-length'));
    });
  });

  describe('redirectOptions()', () => {
    [300, 304, 305].forEach((code) => {
      it(`does not set redirect flag for ${code}`, () => {
        const result = RequestUtils.redirectOptions(code, 'GET');
        assert.isFalse(result.redirect);
      });

      it(`does not set forceGet flag for ${code}`, () => {
        const result = RequestUtils.redirectOptions(code, 'GET');
        assert.isFalse(result.forceGet);
      });
    });

    [301, 302, 307].forEach((code) => {
      it(`Redirects ${code} for HEAD method`, () => {
        const result = RequestUtils.redirectOptions(code, 'HEAD');
        assert.isTrue(result.redirect);
      });

      it(`Redirects ${code} for GET method`, () => {
        const result = RequestUtils.redirectOptions(code, 'GET');
        assert.isTrue(result.redirect);
      });

      it(`Do not redirects ${code} for other method`, () => {
        const result = RequestUtils.redirectOptions(code, 'POST');
        assert.isFalse(result.redirect);
      });

      it(`Do not set forceGet for ${code} status`, () => {
        const result = RequestUtils.redirectOptions(code, 'GET');
        assert.isFalse(result.forceGet);
      });
    });

    it(`Adds redirect location`, () => {
      const result = RequestUtils.redirectOptions(301, 'GET', 'domain.com');
      assert.equal(result.location, 'domain.com');
    });

    it('Sets forceGet for 303 status', () => {
      const result = RequestUtils.redirectOptions(303, 'GET');
      assert.isTrue(result.forceGet);
    });
  });

  describe('isRedirectLoop()', () => {
    const url = 'https://domain.com';
    it('returns false when no redirects', () => {
      const result = RequestUtils.isRedirectLoop(url, undefined);
      assert.isFalse(result);
    });

    it('returns false when redirects is empty', () => {
      const result = RequestUtils.isRedirectLoop(url, new Set());
      assert.isFalse(result);
    });

    it('returns false when url is not on the list', () => {
      const result = RequestUtils.isRedirectLoop(url, new Set([{
        url: 'other.com',
      }]));
      assert.isFalse(result);
    });

    it('returns true when url is on the list', () => {
      const result = RequestUtils.isRedirectLoop(url, new Set([{
        url,
      }]));
      assert.isTrue(result);
    });
  });

  describe('getRedirectLocation()', () => {
    it('returns the same valid url', () => {
      const url = 'https://domain.com/path?a=b';
      const result = RequestUtils.getRedirectLocation(url, '');
      assert.equal(result, url);
    });

    it('Resolves relative URL', () => {
      const url = '/path?a=b';
      const base = 'https://domain.com/other';
      const compare = 'https://domain.com/path?a=b';
      const result = RequestUtils.getRedirectLocation(url, base);
      assert.equal(result, compare);
    });

    it('Returns undefined for unknown state', () => {
      const url = '/path?a=b';
      const base = '/other';
      const result = RequestUtils.getRedirectLocation(url, base);
      assert.isUndefined(result);
    });
  });
});
