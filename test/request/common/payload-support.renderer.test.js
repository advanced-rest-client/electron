const { assert } = require('chai');
require = require('esm')(module);
const { ArcHeaders } = require('@advanced-rest-client/base/src/lib/headers/ArcHeaders.js');
const { PayloadSupport } = require('../../../renderer.js');

describe('PayloadSupport tests', () => {
  describe('blob2buffer()', () => {
    const blob = new Blob(['abc'], { type: 'text/plain' });

    it('Returns a promise', () => {
      const result = PayloadSupport.blob2buffer(blob);
      assert.typeOf(result.then, 'function');
      return result.then(() => {});
    });

    it('Promise resolves to a buffer', async () => {
      const result = await PayloadSupport.blob2buffer(blob);
      assert.isTrue(result instanceof Buffer);
    });

    it('Buffer has blob\'s data', async () => {
      const result = await PayloadSupport.blob2buffer(blob);
      const compare = Buffer.from([97, 98, 99]);
      assert.equal(result.compare(compare), 0);
    });
  });

  describe('normalizeString()', () => {
    it('Normalizes LF', () => {
      const str = 'a\nb\nc';
      const result = PayloadSupport.normalizeString(str);
      assert.equal(result, 'a\r\nb\r\nc');
    });

    it('Normalizes CR', () => {
      const str = 'a\rb\rc';
      const result = PayloadSupport.normalizeString(str);
      assert.equal(result, 'a\r\nb\r\nc');
    });

    it('Normalizes CRLF', () => {
      const str = 'a\r\nb\r\nc';
      const result = PayloadSupport.normalizeString(str);
      assert.equal(result, 'a\r\nb\r\nc');
    });
  });

  describe('payloadToBuffer()', () => {
    let headers;
    beforeEach(() => {
      headers = new ArcHeaders();
    });

    it('Returns undefined if no data', async () => {
      const result = await PayloadSupport.payloadToBuffer(undefined, headers);
      assert.isUndefined(result);
    });

    it('Returns normalized string buffer', async () => {
      const result = await PayloadSupport.payloadToBuffer('a\nb\nc', headers);
      assert.equal(result.compare(Buffer.from('a\r\nb\r\nc')), 0);
    });

    it('Returns buffer from array buffer', async () => {
      const typed = new Uint8Array([97, 98, 99]);
      const result = await PayloadSupport.payloadToBuffer(typed.buffer, headers);
      const compare = Buffer.from([97, 98, 99]);
      assert.equal(result.compare(compare), 0);
    });

    it('Returns buffer for FormData', async () => {
      const fd = new FormData();
      fd.append('a', 'b');
      const result = await PayloadSupport.payloadToBuffer(fd, headers);
      const strValue = result.toString();
      const val = 'Content-Disposition: form-data; name="a"\r\n\r\nb';
      assert.notEqual(strValue.indexOf(val), -1);
    });

    it('FormData sets content type header', async () => {
      const fd = new FormData();
      fd.append('a', 'b');
      headers.set('Content-type', 'x-type');
      await PayloadSupport.payloadToBuffer(fd, headers);
      assert.notEqual(headers.get('content-type'), 'x-type');
    });

    it('Creates buffer from blob', async () => {
      const blob = new Blob(['abc'], { type: 'text/plain' });
      const result = await PayloadSupport.payloadToBuffer(blob, headers);
      const compare = Buffer.from([97, 98, 99]);
      assert.equal(result.compare(compare), 0);
    });

    it('Sets content type from blob', async () => {
      const blob = new Blob(['abc'], { type: 'text/x-plain' });
      await PayloadSupport.payloadToBuffer(blob, headers);
      assert.equal(headers.get('content-type'), 'text/x-plain');
    });

    it('Ignores blob\'s type if content-type is set', async () => {
      const blob = new Blob(['abc'], { type: 'text/x-plain' });
      headers.set('Content-type', 'x-type');
      await PayloadSupport.payloadToBuffer(blob, headers);
      assert.equal(headers.get('content-type'), 'x-type');
    });
  });
});
