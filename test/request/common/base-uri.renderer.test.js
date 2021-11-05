const { assert } = require('chai');
const { BaseRequest } = require('../../../renderer.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */

describe('BaseRequest uri', () => {
  const id = 'test-id';
  const requestData = /** @type ArcBaseRequest */ ({
    method: 'GET',
    url: 'https://domain.com',
  });

  it('uri is parsed URL', () => {
    const request = new BaseRequest(requestData, id);
    assert.typeOf(request.uri, 'URL');
    assert.equal(request.uri.hostname, 'domain.com');
  });

  it('changes uri', () => {
    const request = new BaseRequest(requestData, id);
    request._updateUrl('http://other.com');
    assert.typeOf(request.uri, 'URL');
    assert.equal(request.uri.hostname, 'other.com');
  });

  it('applies host rules', () => {
    const hosts = [{ from: 'domain.com', to: 'other.com' }];
    const request = new BaseRequest(requestData, id, {
      hosts,
    });
    assert.equal(request.uri.hostname, 'other.com');
  });
});
