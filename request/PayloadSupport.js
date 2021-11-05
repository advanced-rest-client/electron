import formDataConverter from './FormData.js';
import { ArcHeaders } from '@advanced-rest-client/base/src/lib/headers/ArcHeaders.js';

/**
 * A class containing static helper methods to deal with Payload
 * transformations
 */
export class PayloadSupport {
  /**
   * Transfers blob to `ArrayBuffer`.
   *
   * @param {Blob} blob A blob object to transform
   * @return {Promise<Buffer>} A promise resolved to a `Buffer`
   */
  static async blob2buffer(blob) {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      const reader = new FileReader();
      reader.addEventListener('loadend', () => {
        resolve(Buffer.from(reader.result));
      });
      reader.addEventListener('error', () => {
        reject(new Error('Unable to covert a file data to ArrayBuffer.'));
      });
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * NormalizeLineEndingsToCRLF
   * https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/
   * platform/text/LineEnding.cpp&rcl=1458041387&l=101
   *
   * @param {string} string A string to be normalized.
   * @return {string} normalized string
   */
  static normalizeString(string) {
    let result = '';
    for (let i = 0; i < string.length; i++) {
      const c = string[i];
      const p = string[i + 1];
      if (c === '\r') {
        // Safe to look ahead because of trailing '\0'.
        if (p && p !== '\n') {
          // Turn CR into CRLF.
          result += '\r';
          result += '\n';
        }
      } else if (c === '\n') {
        result += '\r';
        result += '\n';
      } else {
        // Leave other characters alone.
        result += c;
      }
    }
    return result;
  }

  /**
   * Transforms a payload message into `Buffer`
   *
   * @param {String|Blob|ArrayBuffer|FormData|Buffer} payload A payload message
   * @param {ArcHeaders} headers A headers object where to append headers if
   * needed
   * @return {Promise<Buffer>} A promise resolved to a `Buffer`.
   */
  static async payloadToBuffer(payload, headers) {
    if (!payload) {
      return;
    }
    if (typeof payload === 'string') {
      payload = PayloadSupport.normalizeString(payload);
      return Buffer.from(payload, 'utf8');
    }
    if (payload instanceof ArrayBuffer) {
      return Buffer.from(payload);
    }
    if (payload instanceof Buffer) {
      return payload;
    }
    // @ts-ignore
    if (payload instanceof FormData) {
      const result = await formDataConverter(payload);
      headers.set('Content-Type', result.type);
      return result.buffer;
    }
    // @ts-ignore
    if (payload instanceof Blob) {
      if (!headers.has('content-type') && payload.type) {
        headers.set('content-type', payload.type);
      }
      return PayloadSupport.blob2buffer(payload);
    }
    throw new Error('Unsupported payload message');
  }
}
