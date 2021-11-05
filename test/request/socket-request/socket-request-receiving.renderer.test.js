const assert = require('chai').assert;
const { SocketRequest } = require('../../../renderer.js');
const chunkedServer = require('../chunked-server.js');
const { logger } = require('../dummy-logger.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../../request/RequestOptions').Options} Options */

describe('Socket request - receiving data', () => {
  const httpPort = 8123;
  const sslPort = 8124;

  const requestId = 'test1';
  const requests = /** @type ArcBaseRequest[] */ ([{
    url: `http://localhost:${httpPort}/api/endpoint?query=param`,
    method: 'GET',
    headers: 'Host: test.com\nContent-Length: 0',
    payload: 'abc',
  }]);

  const opts = /** @type Options[] */ ([{
    timeout: 10000,
    followRedirects: true,
    logger,
  }]);

  before(() => chunkedServer.startServer(httpPort, sslPort));

  after(() => chunkedServer.stopServer());

  describe('Chunked responses', () => {
    let request = /** @type SocketRequest */ (null);
    it('receives chunked response.', (done) => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
      request.once('load', (id, response) => {
        const parts = response.payload.toString().split('\n');
        assert.lengthOf(parts, 6);
        for (let i = 0; i < 5; i++) {
          assert.equal(parts[i].length, 128);
        }
        done();
      });
      request.once('error', (error) => {
        done(error);
      });
      request.send();
    });
  });

  describe('readChunkSize()', () => {
    let request = /** @type SocketRequest */ (null);
    before(() => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
    });

    it('Returns the the same array when new line not found', () => {
      const b = Buffer.from('test');
      const result = request.readChunkSize(b);
      assert.isTrue(b === result);
    });

    it('does not set chunkSize property', () => {
      const b = Buffer.from('test');
      request.readChunkSize(b);
      assert.isUndefined(request.chunkSize);
    });

    it('parses chunk size', () => {
      let chunk = Number(128).toString(16);
      chunk += '\r\ntest';
      const b = Buffer.from(chunk);
      request.readChunkSize(b);
      assert.equal(request.chunkSize, 128);
    });

    it('Buffer is truncated', () => {
      let chunk = Number(128).toString(16);
      chunk += '\r\ntest';
      const b = Buffer.from(chunk);
      const result = request.readChunkSize(b);
      assert.equal(result.toString(), 'test');
    });
  });

  describe('_processBodyChunked()', () => {
    let request = /** @type SocketRequest */ (null);
    beforeEach(() => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
      request._reportResponse = () => {};
    });

    it('reads body chunk', () => {
      let chunk = Number(4).toString(16);
      chunk += '\r\ntest\r\n0\r\n';
      const b = Buffer.from(chunk);
      request._processBodyChunked(b);
      assert.equal(request.chunkSize, 0);
      assert.equal(request._rawBody.toString(), 'test');
    });

    it('Reads multi chunks', () => {
      let chunk = Number(6).toString(16);
      chunk += '\r\ntest\r\n\r\n';
      chunk += Number(8).toString(16);
      chunk += '\r\ntest1234\r\n';
      chunk += '0\r\n';
      const b = Buffer.from(chunk);
      request._processBodyChunked(b);
      assert.equal(request.chunkSize, 0);
      assert.equal(request._rawBody.toString(), 'test\r\ntest1234');
    });

    it('Reads multi chunks with partial buffer', () => {
      let chunk = Number(6).toString(16);
      chunk += '\r\nte';
      request._processBodyChunked(Buffer.from(chunk));
      chunk = 'st\r\n\r\n';
      request._processBodyChunked(Buffer.from(chunk));
      chunk = Number(8).toString(16);
      chunk += '\r\ntest';
      request._processBodyChunked(Buffer.from(chunk));
      chunk = '1234\r\n0\r\n';
      request._processBodyChunked(Buffer.from(chunk));
      assert.equal(request.chunkSize, 0);
      assert.equal(request._rawBody.toString(), 'test\r\ntest1234');
    });
  });

  describe('_processBody()', () => {
    let request = /** @type SocketRequest */ (null);
    const testData = Buffer.from('abcdefghijklmn');
    const testLength = testData.length;

    beforeEach(() => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
      request._reportResponse = () => {};
    });

    it('Sets _rawBody property', () => {
      request._contentLength = testLength + 1;
      request._processBody(testData);
      assert.isTrue(request._rawBody === testData);
    });

    it('Does not call _reportResponse when length is higher than data',
      () => {
        request._contentLength = testLength + 1;
        let called = false;
        request._reportResponse = () => {
          called = true;
        };
        request._processBody(testData);
        assert.isFalse(called);
      });

    it('Reports response when the data is read as whole on one socket buffer',
      () => {
        request._contentLength = testLength;
        let called = false;
        request._reportResponse = () => {
          called = true;
        };
        request._processBody(testData);
        assert.isTrue(called, '_reportResponse was called');
      });

    it('Reports response after more calls', () => {
      request._contentLength = testLength;
      let called = false;
      request._reportResponse = () => {
        called = true;
      };
      request._processBody(Buffer.from('abcdef'));
      request._processBody(Buffer.from('ghijklmn'));
      assert.isTrue(called, '_reportResponse was called');
    });
  });
});
