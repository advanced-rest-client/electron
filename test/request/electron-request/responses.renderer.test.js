const { assert } = require('chai');
require = require('esm')(module);
const { ArcHeaders } = require('@advanced-rest-client/base/src/lib/headers/ArcHeaders.js');
const { ElectronRequest } = require('../../../renderer.js');
const { ExpressServer } = require('../express-api.js');
const { untilResponse } = require('../Utils.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../../request/RequestOptions').Options} Options */

describe('Electron request', () => {
  const server = new ExpressServer();
  /** @type number */
  const httpPort = 8125;
  
  before(async () => {
    await server.startHttp(httpPort);
  });

  after(async () => {
    await server.stopHttp();
  });

  describe('Responses test', () => {
    [
      ['Image - jpeg', `http://localhost:${httpPort}/v1/image/jpeg`, 'image/jpeg'],
      ['Image - png', `http://localhost:${httpPort}/v1/image/png`, 'image/png'],
      ['Image - svg', `http://localhost:${httpPort}/v1/image/svg`, 'image/svg+xml'],
      ['Image - webp', `http://localhost:${httpPort}/v1/image/webp`, 'image/webp'],
      ['html', `http://localhost:${httpPort}/v1/response/html`, 'text/html; charset=UTF-8'],
      ['json', `http://localhost:${httpPort}/v1/response/json`, 'application/json'],
      ['xml', `http://localhost:${httpPort}/v1/response/xml`, 'application/xml'],
      ['Bytes', `http://localhost:${httpPort}/v1/response/bytes/120`, 'application/octet-stream'],
    ].forEach((item, index) => {
      const [name, url, mime] = item;
      it(`Reads the response: ${name}`, (done) => {
        const id = `r-${index}`;
        const request = new ElectronRequest({
          url,
          method: 'GET',
        }, id);
        request.once('load', (rid, response) => {
          try {
            assert.equal(rid, id, 'has the request id');
            assert.ok(response.payload, 'has the payload');
            const headers = new ArcHeaders(response.headers);
            assert.equal(headers.get('content-type'), mime, 'has the content type');
            // @ts-ignore
            const { length } = Buffer.from(response.payload);
            assert.equal(headers.get('content-length'), String(length));
          } catch (e) {
            done(e);
            return;
          }
          done();
        });
        request.once('error', (err) => done(err));
        request.send();
      });
    });
  });

  describe('Compression test', () => {
    [
      ['brotli', `http://localhost:${httpPort}/v1/compression/brotli`, 'br'],
      ['deflate', `http://localhost:${httpPort}/v1/compression/deflate`, 'deflate'],
      ['gzip', `http://localhost:${httpPort}/v1/compression/gzip`, 'gzip'],
    ].forEach((item, index) => {
      const [name, url, enc] = item;
      it(`reads the compressed response: ${name}`, (done) => {
        const id = `r-${index}`;
        const request = new ElectronRequest({
          url,
          method: 'GET',
          headers: `accept-encoding: ${enc}`,
        }, id);
        request.once('load', (rid, response) => {
          try {
            assert.equal(rid, id, 'has the request id');
            assert.ok(response.payload, 'has the payload');
            const headers = new ArcHeaders(response.headers);
            assert.equal(headers.get('content-encoding'), enc, 'has the content-encoding in the response');
            const body = response.payload.toString();
            const data = JSON.parse(body);
            assert.typeOf(data, 'array', 'has the response body');
          } catch (e) {
            done(e);
            return;
          }
          done();
        });
        request.once('error', (err) => done(err));
        request.send();
      });
    });
  });

  describe('Timings tests', () => {
    it('has the stats object', (done) => {
      const request = new ElectronRequest({
        url: `http://localhost:${httpPort}/v1/get`,
        method: 'GET',
      }, 'test');
      request.once('load', (id, response) => {
        assert.typeOf(response.timings, 'object');
        done();
      });
      request.once('error', (err) => done(err));
      request.send();
    });

    ['connect', 'receive', 'send', 'wait', 'dns', 'ssl'].forEach((prop) => {
      it(`Has ${prop} value`, (done) => {
        const request = new ElectronRequest({
          url: `http://localhost:${httpPort}/v1/get`,
          method: 'GET',
        }, 'test');
        request.once('load', (id, response) => {
          assert.typeOf(response.timings[prop], 'number');
          done();
        });
        request.once('error', (err) => done(err));
        request.send();
      });
    });

    it('Has stats time for ssl', (done) => {
      const request = new ElectronRequest({
        url: 'https://www.google.com/',
        method: 'GET',
      }, 'test');
      request.once('load', (id, response) => {
        assert.isAbove(response.timings.ssl, -1);
        done();
      });
      request.once('error', (err) => done(err));
      request.send();
    });
  });

  describe('Request size', () => {
    it('has the request size value', async () => {
      const request = new ElectronRequest({
        url: `http://localhost:${httpPort}/v1/get`,
        method: 'GET',
      }, 'test');
      await request.send();
      const info = await untilResponse(request);
      assert.equal(info.response.size.request, 65);
    });

    it('has the response size value', async () => {
      const request = new ElectronRequest({
        url: `http://localhost:${httpPort}/v1/get`,
        method: 'GET',
      }, 'test');
      await request.send();
      const info = await untilResponse(request);
      assert.equal(info.response.size.response, 238);
    });
  });
});
