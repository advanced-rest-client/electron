const { assert } = require('chai');
const { BaseRequest, RequestOptions } = require('../../../renderer.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */

describe('BaseRequest constructor', () => {
  const id = 'test-id';
  const requestData = /** @type ArcBaseRequest */ ({
    method: 'GET',
    url: 'https://domain.com',
  });

  it('Sets options', () => {
    const request = new BaseRequest(requestData, id);
    assert.isTrue(request.opts instanceof RequestOptions);
  });

  it('Sets logger', () => {
    const request = new BaseRequest(requestData, id);
    assert.typeOf(request.logger, 'object');
  });

  it('Sets arcRequest', () => {
    const request = new BaseRequest(requestData, id);
    assert.typeOf(request.arcRequest, 'object');
  });

  it('arcRequest is a copy', () => {
    const request = new BaseRequest(requestData, id);
    request.arcRequest.url = 'test';
    assert.equal(requestData.url, 'https://domain.com');
  });

  it('Sets aborted', () => {
    const request = new BaseRequest(requestData, id);
    assert.isFalse(request.aborted);
  });

  it('Sets id', () => {
    const request = new BaseRequest(requestData, id);
    assert.equal(request.id, 'test-id');
  });

  it('Sets stats to empty object', () => {
    const request = new BaseRequest(requestData, id);
    assert.typeOf(request.stats, 'object');
    assert.lengthOf(Object.keys(request.stats), 0);
  });

  it('Sets hosts', () => {
    const hosts = [{ from: 'a', to: 'b' }];
    const request = new BaseRequest(requestData, id, {
      hosts,
    });
    assert.deepEqual(request.hosts, hosts);
  });

  it('sets the uri', () => {
    const request = new BaseRequest(requestData, id);
    assert.typeOf(request.uri, 'url');
  });

  it('Sets hostHeader', () => {
    const request = new BaseRequest(requestData, id);
    assert.equal(request.hostHeader, 'domain.com');
  });

  it('Sets _hostTestReg', () => {
    const request = new BaseRequest(requestData, id);
    assert.typeOf(request._hostTestReg, 'regexp');
  });
});
