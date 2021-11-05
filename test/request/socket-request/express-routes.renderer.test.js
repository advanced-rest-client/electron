const { assert } = require('chai');
const { logger } = require('../dummy-logger.js');
const { SocketRequest } = require('../../../renderer.js');
const { startServer, stopServer } = require('../express-api.js');
const { untilResponse } = require('../Utils.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../../request/RequestOptions').Options} Options */

describe('ExpressJS requests', () => {
  const httpPort = 8125;
  const requestId = 'r-1';

  before(async () => startServer(httpPort));

  after(async () => stopServer());

  describe('POST requests', () => {
    const requestData = /** @type ArcBaseRequest */ ({
      url: `http://localhost:${httpPort}/v1/tests/`,
      method: 'POST',
      headers: 'Host: test.com\nContent-Length: 0',
      payload: 'abc',
    });
    const opts = /** @type Options */ ({
      timeout: 50000,
      followRedirects: false,
      hosts: [],
      logger,
    });

    it('makes a POST request', async () => {
      const request = new SocketRequest(requestData, requestId, opts);
      await request.send();
      const { id } = await untilResponse(request);
      assert.equal(id, requestId);
    });

    it('response has stats', async () => {
      const request = new SocketRequest(requestData, requestId, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.equal(response.status, 200);
    });

    it('response has statusText', async () => {
      const request = new SocketRequest(requestData, requestId, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.equal(response.statusText, 'OK');
    });

    it('response has headers', async () => {
      const request = new SocketRequest(requestData, requestId, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.typeOf(response.headers, 'string');
    });

    it('has response payload', async () => {
      const request = new SocketRequest(requestData, requestId, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.ok(response.payload);
    });

    it('has the response timings object', async () => {
      const request = new SocketRequest(requestData, requestId, opts);
      await request.send();
      const { response } = await untilResponse(request);
      assert.typeOf(response.timings, 'object');
    });

    // it('has response sentHttpMessage', async () => {
    //   const request = new SocketRequest(requestData, requestId, opts);
    //   await request.send();
    //   const { response } = await untilResponse(request);
    //   assert.typeOf(response.sentHttpMessage, 'string');
    // });
  });

  describe('GET requests', () => {
    const requestData = /** @type ArcBaseRequest */ ({
      url: `http://localhost:${httpPort}/v1/tests/`,
      method: 'GET',
      headers: 'Host: test.com',
    });
    const opts = /** @type Options */ ({
      timeout: 50000,
      followRedirects: false,
      hosts: [],
      logger,
    });

    it('makes a GET request', async () => {
      const request = new SocketRequest(requestData, requestId, opts);
      await request.send();
      const { id } = await untilResponse(request);
      assert.equal(id, requestId);
    });

    it('makes a delayed GET request', async () => {
      const r = { ...requestData };
      r.url += '?delay=300';
      const request = new SocketRequest(r, requestId, opts);
      await request.send();
      const { id } = await untilResponse(request);
      assert.equal(id, requestId);
    });
  });
});
