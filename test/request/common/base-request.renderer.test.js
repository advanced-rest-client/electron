const { assert } = require('chai');
require = require('esm')(module);
const { ArcHeaders } = require('@advanced-rest-client/base/src/lib/headers/ArcHeaders.js');
const { BaseRequest } = require('../../../renderer.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../../request/RequestOptions').Options} Options */

describe('BaseRequest', () => {
  describe('_prepareHeaders()', () => {
    let request = /** @type ArcBaseRequest */ (null);
    let opts = /** @type Options */ (null);
    const id = 'test-id';

    beforeEach(() => {
      request = {
        url: 'https://api.domain.com',
        method: 'GET',
        headers: '',
      };
      opts = {
        defaultHeaders: true,
      };
    });

    it('adds default user-agent', () => {
      const base = new BaseRequest(request, id, opts);
      const headers = new ArcHeaders();
      base._prepareHeaders(headers);
      assert.equal(headers.get('user-agent'), 'advanced-rest-client');
    });

    it('adds default accept', () => {
      const base = new BaseRequest(request, id, opts);
      const headers = new ArcHeaders();
      base._prepareHeaders(headers);
      assert.equal(headers.get('accept'), '*/*');
    });

    it('adds configured user-agent', () => {
      opts.defaultUserAgent = 'test';
      const base = new BaseRequest(request, id, opts);
      const headers = new ArcHeaders();
      base._prepareHeaders(headers);
      assert.equal(headers.get('user-agent'), 'test');
    });

    it('adds configured accept', () => {
      opts.defaultAccept = 'test';
      const base = new BaseRequest(request, id, opts);
      const headers = new ArcHeaders();
      base._prepareHeaders(headers);
      assert.equal(headers.get('accept'), 'test');
    });

    it('ignores adding headers when no config option', () => {
      opts.defaultHeaders = false;
      const base = new BaseRequest(request, id, opts);
      const headers = new ArcHeaders();
      base._prepareHeaders(headers);
      assert.isFalse(headers.has('user-agent'), 'user-agent is not set');
      assert.isFalse(headers.has('accept'), 'accept is not set');
    });

    it('skips when user-agent header is set', () => {
      const base = new BaseRequest(request, id, opts);
      const headers = new ArcHeaders({
        'user-agent': 'test',
      });
      base._prepareHeaders(headers);
      assert.equal(headers.get('user-agent'), 'test');
    });

    it('skips when accept header is set', () => {
      const base = new BaseRequest(request, id, opts);
      const headers = new ArcHeaders({
        accept: 'test',
      });
      base._prepareHeaders(headers);
      assert.equal(headers.get('accept'), 'test');
    });
  });
});
