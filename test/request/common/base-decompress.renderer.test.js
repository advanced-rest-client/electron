/* eslint-disable no-sync */
const assert = require('chai').assert;
const zlib = require('zlib');
require = require('esm')(module);
const { ArcHeaders } = require('@advanced-rest-client/base/src/lib/headers/ArcHeaders.js');
const { BaseRequest } = require('../../../renderer.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */

describe('Decompression', () => {
  function createDeflate(str) {
    return zlib.deflateSync(Buffer.from(str || 'deflate-string'));
  }

  function createGzip(str) {
    return zlib.gzipSync(Buffer.from(str || 'gzip-string'));
  }

  function createBrotli(str) {
    return zlib.brotliCompressSync(Buffer.from(str || 'brotli-string'));
  }

  const id = 'test-id';
  const requestData = /** @type ArcBaseRequest */ ({
    method: 'GET',
    url: 'https://domain.com',
  });

  describe('_inflate()', () => {
    it('resolves to a Buffer', async () => {
      const request = new BaseRequest(requestData, id);
      const result = await request._inflate(createDeflate());
      assert.equal(result.length, 14);
    });

    it('Buffer has original data', async () => {
      const request = new BaseRequest(requestData, id);
      const result = await request._inflate(createDeflate());
      assert.equal(result.toString(), 'deflate-string');
    });
  });

  describe('_gunzip()', () => {
    it('Promise resolves to buffer', async () => {
      const request = new BaseRequest(requestData, id);
      const result = await request._gunzip(createGzip());
      assert.equal(result.length, 11);
    });

    it('Buffer has original data', async () => {
      const request = new BaseRequest(requestData, id);
      const result = await request._gunzip(createGzip());
      assert.equal(result.toString(), 'gzip-string');
    });
  });

  describe('_brotli()', () => {
    it('Promise resolves to buffer', async () => {
      const request = new BaseRequest(requestData, id);
      const result = await request._brotli(createBrotli());
      assert.equal(result.length, 13);
    });

    it('Buffer has original data', async () => {
      const request = new BaseRequest(requestData, id);
      const result = await request._brotli(createBrotli());
      assert.equal(result.toString(), 'brotli-string');
    });
  });

  describe('_decompress()', () => {
    it('returns undefined when no data', async () => {
      const request = new BaseRequest(requestData, id);
      const result = await request._decompress(undefined);
      assert.isUndefined(result);
    });

    it('returns undefined when aborted', async () => {
      const request = new BaseRequest(requestData, id);
      request.aborted = true;
      const result = await request._decompress(Buffer.from('test'));
      assert.isUndefined(result);
    });

    it('returns the same buffer when no content-encoding header', async () => {
      const b = Buffer.from('test');
      const request = new BaseRequest(requestData, id);
      request.currentHeaders = new ArcHeaders();
      request.currentResponse = {
        status: 200,
        loadingTime: 1,
      };
      const result = await request._decompress(b);
      assert.equal(result.compare(b), 0);
    });

    it('decompresses deflate', async () => {
      const b = createDeflate();
      const request = new BaseRequest(requestData, id);
      request.currentHeaders = new ArcHeaders('content-encoding: deflate');
      request.currentResponse = {
        status: 200,
        loadingTime: 1,
      };
      const result = await request._decompress(b);
      assert.equal(result.toString(), 'deflate-string');
    });

    it('decompresses gzip', async () => {
      const b = createGzip();
      const request = new BaseRequest(requestData, id);
      request.currentHeaders = new ArcHeaders('content-encoding: gzip');
      request.currentResponse = {
        status: 200,
        loadingTime: 1,
      };
      const result = await request._decompress(b);
      assert.equal(result.toString(), 'gzip-string');
    });

    it('decompresses brotli', async () => {
      const b = createBrotli();
      const request = new BaseRequest(requestData, id);
      request.currentHeaders = new ArcHeaders('content-encoding: br');
      request.currentResponse = {
        status: 200,
        loadingTime: 1,
      };
      const result = await request._decompress(b);
      assert.equal(result.toString(), 'brotli-string');
    });
  });
});
