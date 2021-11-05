const assert = require('chai').assert;
const { ElectronRequest } = require('../../../renderer.js');
const ExpressServer = require('../express-api.js');
const { untilResponse } = require('../Utils.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../../request/RequestOptions').Options} Options */

describe('ElectronRequest', () => {
  const requestId = 'test-id';
  const expressPort = 8125;
  before(async () => {
    // await chunkedServer.startServer(httpPort, sslPort);
    await ExpressServer.startServer(expressPort);
  });

  after(async () => {
    // await chunkedServer.stopServer();
    await ExpressServer.stopServer();
  });

  describe('Redirects test', () => {
    describe('Absolute redirects', () => {
      const baseRequest = /** @type ArcBaseRequest */ (Object.freeze({
        url: `http://localhost:${expressPort}/v1/redirect/absolute/2?test=true`,
        method: 'GET',
      }));

      it('redirects to an absolute URL', async () => {
        const request = new ElectronRequest(baseRequest, requestId);
        await request.send();
        const { response } = await untilResponse(request);
        const { redirects } = response;
        assert.typeOf(redirects, 'array');
        assert.lengthOf(redirects, 2);
      });

      it('has the redirects data', async () => {
        const request = new ElectronRequest(baseRequest, requestId);
        await request.send();
        const { response } = await untilResponse(request);
        const { redirects } = response;
        const [rdr1] = redirects;
        const location = `http://localhost:${expressPort}/v1/redirect/absolute/1?test=true`;
        assert.equal(rdr1.url, location, 'has the redirect URL');
        assert.typeOf(rdr1.startTime, 'number', 'has the startTime property');
        assert.typeOf(rdr1.endTime, 'number', 'has the endTime property');
        assert.typeOf(rdr1.timings, 'object', 'has the timings property');
        assert.typeOf(rdr1.response, 'object', 'has the response property');
        assert.equal(rdr1.response.status, 302, 'has the status code');
        assert.equal(rdr1.response.statusText, 'Found', 'has the status text');
        assert.typeOf(rdr1.response.headers, 'string', 'has the headers');
        const body = rdr1.response.payload.toString();
        const parsed = JSON.parse(body);
        assert.equal(parsed.location, location, 'has the payload');
      });

      it('has the final response', async () => {
        const request = new ElectronRequest(baseRequest, requestId);
        await request.send();
        const { response, transport } = await untilResponse(request);
        const location = `http://localhost:${expressPort}/v1/get?test=true`;
        assert.equal(transport.url, location, 'transport request has the final URL');
        assert.equal(response.status, 200, 'has the status code');
      });
    });

    describe('Relative redirects - relative path', () => {
      const baseRequest = /** @type ArcBaseRequest */ (Object.freeze({
        url: `http://localhost:${expressPort}/v1/redirect/relative/2?test=true`,
        method: 'GET',
      }));

      it('redirects to a relative URL', async () => {
        const request = new ElectronRequest(baseRequest, requestId);
        await request.send();
        const { response } = await untilResponse(request);
        const { redirects } = response;
        assert.typeOf(redirects, 'array');
        assert.lengthOf(redirects, 2);
      });

      it('has the redirects data', async () => {
        const request = new ElectronRequest(baseRequest, requestId);
        await request.send();
        const { response } = await untilResponse(request);
        const { redirects } = response;
        const [rdr1] = redirects;
        const location = `http://localhost:${expressPort}/v1/redirect/relative/1?test=true`;
        assert.equal(rdr1.url, location, 'has the redirect URL');
        assert.typeOf(rdr1.startTime, 'number', 'has the startTime property');
        assert.typeOf(rdr1.endTime, 'number', 'has the endTime property');
        assert.typeOf(rdr1.timings, 'object', 'has the timings property');
        assert.typeOf(rdr1.response, 'object', 'has the response property');
        assert.equal(rdr1.response.status, 302, 'has the status code');
        assert.equal(rdr1.response.statusText, 'Found', 'has the status text');
        assert.typeOf(rdr1.response.headers, 'string', 'has the headers');
        const body = rdr1.response.payload.toString();
        const parsed = JSON.parse(body);
        assert.equal(parsed.location, '../relative/1?test=true', 'has the payload');
      });

      it('has the final response', async () => {
        const request = new ElectronRequest(baseRequest, requestId);
        await request.send();
        const { response, transport } = await untilResponse(request);
        const location = `http://localhost:${expressPort}/v1/get?test=true`;
        assert.equal(transport.url, location, 'transport request has the final URL');
        assert.equal(response.status, 200, 'has the status code');
      });
    });

    describe('Relative redirects - root path', () => {
      const baseRequest = /** @type ArcBaseRequest */ (Object.freeze({
        url: `http://localhost:${expressPort}/v1/redirect/relative-root/2?test=true`,
        method: 'GET',
      }));

      it('redirects to a relative URL', async () => {
        const request = new ElectronRequest(baseRequest, requestId);
        await request.send();
        const { response } = await untilResponse(request);
        const { redirects } = response;
        assert.typeOf(redirects, 'array');
        assert.lengthOf(redirects, 2);
      });

      it('has the redirects data', async () => {
        const request = new ElectronRequest(baseRequest, requestId);
        await request.send();
        const { response } = await untilResponse(request);
        const { redirects } = response;
        const [rdr1] = redirects;
        const location = `http://localhost:${expressPort}/v1/redirect/relative/1?test=true`;
        assert.equal(rdr1.url, location, 'has the redirect URL');
        assert.typeOf(rdr1.startTime, 'number', 'has the startTime property');
        assert.typeOf(rdr1.endTime, 'number', 'has the endTime property');
        assert.typeOf(rdr1.timings, 'object', 'has the timings property');
        assert.typeOf(rdr1.response, 'object', 'has the response property');
        assert.equal(rdr1.response.status, 302, 'has the status code');
        assert.equal(rdr1.response.statusText, 'Found', 'has the status text');
        assert.typeOf(rdr1.response.headers, 'string', 'has the headers');
        const body = rdr1.response.payload.toString();
        const parsed = JSON.parse(body);
        assert.equal(parsed.location, '/v1/redirect/relative/1?test=true', 'has the payload');
      });

      it('has the final response', async () => {
        const request = new ElectronRequest(baseRequest, requestId);
        await request.send();
        const { response, transport } = await untilResponse(request);
        const location = `http://localhost:${expressPort}/v1/get?test=true`;
        assert.equal(transport.url, location, 'transport request has the final URL');
        assert.equal(response.status, 200, 'has the status code');
      });
    });
  });
});
