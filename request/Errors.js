/**
 * Network errors occurred during transport with a message and error code.
 */
export class NetError extends Error {
  /**
   * @param {string} message
   * @param {number=} code Optional error code.
   */
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
