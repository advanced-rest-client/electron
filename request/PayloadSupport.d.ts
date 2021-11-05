import { ArcHeaders } from '@advanced-rest-client/base/src/lib/headers/ArcHeaders.js';
/**
 * A class containing static helper methods to deal with Payload
 * transformations
 */
export declare class PayloadSupport {
  /**
   * Transfers blob to `ArrayBuffer`.
   *
   * @param blob A blob object to transform
   * @returns A promise resolved to a `Buffer`
   */
  static blob2buffer(blob: Blob): Promise<Buffer>;

  /**
   * NormalizeLineEndingsToCRLF
   * https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/
   * platform/text/LineEnding.cpp&rcl=1458041387&l=101
   *
   * @param string A string to be normalized.
   * @returns normalized string
   */
  static normalizeString(string: string): string;

  /**
   * Transforms a payload message into `Buffer`
   *
   * @param {String|Blob|ArrayBuffer|FormData|Buffer} payload A payload message
   * @param {ArcHeaders} headers A headers object where to append headers if
   * needed
   * @return {Promise<Buffer>} A promise resolved to a `Buffer`.
   */
  static payloadToBuffer(payload: String|Blob|ArrayBuffer|FormData|Buffer, headers: ArcHeaders): Promise<Buffer>;
}
