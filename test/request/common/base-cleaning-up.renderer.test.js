const { assert } = require('chai');
require = require('esm')(module);
const { ArcHeaders } = require('@advanced-rest-client/base/src/lib/headers/ArcHeaders.js');
const { BaseRequest } = require('../../../renderer.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */

describe('BaseRequest - cleaning up', () => {
  const id = 'test-id';
  const requestData = /** @type ArcBaseRequest */ ({
    method: 'GET',
    url: 'https://domain.com',
  });

  it('_cleanUp()', () => {
    const base = new BaseRequest(requestData, id);
    base.redirects = new Set();
    base.currentResponse = {
      loadingTime: 1,
      status: 0,
    };
    base.currentHeaders = new ArcHeaders('content-type: test');
    base._rawBody = Buffer.from('test');
    // @ts-ignore
    base.stats = { time: Date.now() };
    base._cleanUp();
    assert.equal(base.redirects.size, 0);
    assert.isUndefined(base.currentResponse);
    assert.isUndefined(base.currentHeaders);
    assert.isUndefined(base._rawBody);
    assert.deepEqual(base.stats, {});
  });

  it('_cleanUpRedirect()', () => {
    const base = new BaseRequest(requestData, id);
    // @ts-ignore
    base.redirects.add({});
    base.currentResponse = {
      loadingTime: 1,
      status: 0,
    };
    base.currentHeaders = new ArcHeaders('content-type: test');
    base._rawBody = Buffer.from('test');
    // @ts-ignore
    base.stats = { time: Date.now() };
    base._cleanUpRedirect();
    assert.equal(base.redirects.size, 1);
    assert.isUndefined(base.currentResponse);
    assert.isUndefined(base.currentHeaders);
    assert.isUndefined(base._rawBody);
    assert.deepEqual(base.stats, {});
  });
});
