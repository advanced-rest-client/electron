/** @typedef {import('@advanced-rest-client/events').HostRule.HostRule} HostRule */
/** @typedef {import('@advanced-rest-client/events').ClientCertificate.ClientCertificate} ClientCertificate */
/** @typedef {import('./RequestOptions').Options} Options */

/**
 * Native request options.
 */
export class RequestOptions {
  /**
   * @param {Options=} opts
   */
  constructor(opts = {}) {
    /**
     * @type {string[]}
     */
    this.validationWarnings = [];
    opts = this.processOptions(opts);
    /**
     * When set it validates certificates during request.
     * @type {boolean=}
     */
    this.validateCertificates = opts.validateCertificates;
    /**
     * When false the request object won't follow redirects.
     * @type {boolean=}
     */
    this.followRedirects = opts.followRedirects;
    /**
     * Request timeout in milliseconds
     * @type {number=}
     */
    this.timeout = opts.timeout;
    /**
     * Logger object.
     * @type {Object=}
     */
    this.logger = opts.logger;
    /**
     * Hosts table.
     * Each rule must have `from` and `to` properties.
     * @type {HostRule[]}
     */
    this.hosts = opts.hosts;
    /**
     * A limit of characters to include into the `sentHttpMessage` property
     * of the request object. 0 to disable limit. Default to 2048.
     * @type {number}
     */
    this.sentMessageLimit = opts.sentMessageLimit;
    /**
     * When set the request adds `accept` and `user-agent` headers if missing.
     * @type {boolean}
     */
    this.defaultHeaders = opts.defaultHeaders;
    /**
     * Default `user-agent` header to be used with request when `defaultHeaders`
     * is set.
     *
     * @type {string}
     * @default advanced-rest-client
     */
    this.defaultUserAgent = opts.defaultUserAgent;
    /**
     * Default `accept` header to be used with request when `defaultHeaders`
     * is set.
     *
     * @type {string}
     * @default *\/*
     */
    this.defaultAccept = opts.defaultAccept;
    /**
     * A certificate to use with the request.
     *
     * Certificate object:
     * - data {String|Buffer} - The certificate to use. Required.
     * The `p12` type certificate must be a `Buffer`.
     * - passphrase {String} - A passphrase to use to unlock the certificate.
     * Optional.
     *
     * Client certificate:
     * - type {String} `p12` or `pem`
     * - cert {Array<Certificate>} The certificate to use. Required.
     * - key {Array<Certificate>} Key for `pem` certificate. Optional.
     *
     * @type {ClientCertificate}
     */
    this.clientCertificate = opts.clientCertificate;
    /**
     * The proxy URI to connect to when making the connection.
     * It should contain the host and port. Default port is 80.
     */
    this.proxy = opts.proxy;
    /**
     * The proxy authorization username value.
     */
    this.proxyUsername = opts.proxyUsername;
    /**
     * The proxy authorization password value.
     */
    this.proxyPassword = opts.proxyPassword;
  }

  /**
   * @return {Object} Map of options with data types
   */
  get validOptions() {
    return {
      validateCertificates: Boolean,
      followRedirects: Boolean,
      timeout: Number,
      logger: Object,
      hosts: Array,
      sentMessageLimit: Number,
      defaultHeaders: Boolean,
      defaultUserAgent: String,
      defaultAccept: String,
      clientCertificate: Object,
      // technically this is not an option for a request but it is kept here for
      // compatibility with ARC config object.
      nativeTransport: Boolean,
      proxy: String,
      proxyUsername: String,
      proxyPassword: String,
    };
  }

  /**
   * Processes user options. Removes options that has type mismatch.
   * @param {Object} opts User options
   * @return {Object} Processed options.
   */
  processOptions(opts) {
    opts = opts || {};
    this.validateOptions(opts);
    opts = this._setDefaults(opts);
    return opts;
  }

  /**
   * Validates user input options.
   * Sets `_validationErrors` and `_validationWarnings` arrays on this object
   * contemning the corresponding messages.
   *
   * @param {Object} userOpts User options to check.
   */
  validateOptions(userOpts) {
    userOpts = userOpts || {};
    this._validateOptionsList(userOpts);
    this._validateLogger(userOpts);
    this._validateMessageLimit(userOpts);
    this._validateCertificate(userOpts);
  }

  /**
   * Validates passed user options for data type and names.
   * @param {Options} userOpts
   */
  _validateOptionsList(userOpts) {
    const keys = Object.keys(userOpts);
    const known = this.validOptions;
    const knownKeys = Object.keys(known);
    const unknown = [];
    const typeMismatch = [];
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      if (knownKeys.indexOf(key) === -1) {
        unknown.push(key);
        try {
          delete userOpts[key];
        } catch (_) {
          //
        }
        continue;
      }
      const expectedType = known[key].name.toLowerCase();
      const userValue = userOpts[key];
      const userType = typeof userValue;
      if (userType === 'undefined') {
        continue;
      }
      if (
        (expectedType === 'array' && !(userValue instanceof Array)) ||
        (userType !== expectedType && expectedType !== 'array')
      ) {
        typeMismatch.push({
          key,
          expectedType,
          userType,
        });
        try {
          delete userOpts[key];
        } catch (_) {
          //
        }
      }
    }
    if (unknown.length) {
      let message = 'Unknown option';
      if (unknown.length > 1) {
        message += 's';
      }
      message += `: ${unknown.join(', ')}`;
      this.validationWarnings.push(message);
    }
    if (typeMismatch.length) {
      typeMismatch.forEach((error) => {
        let msg = `Property ${error.key} expected to be ${error.expectedType}`;
        msg += ` but found ${error.userType}.`;
        this.validationWarnings.push(msg);
      });
    }
  }

  /**
   * Validates user option for the `logger` property.
   *
   * @param {Options} userOpts Passed user options.
   */
  _validateLogger(userOpts) {
    if (!userOpts.logger) {
      return;
    }
    const logger = userOpts.logger;
    if (!logger.log || !logger.info || !logger.warn || !logger.error) {
      this.validationWarnings.push('Invalid logger passed as an option. Will use own logger.');
      try {
        delete userOpts.logger;
      } catch (_) {
        //
      }
    }
  }

  /**
   * Validates user option for the `logger` property.
   *
   * @param {Options} opts Passed user options.
   */
  _validateMessageLimit(opts) {
    if (!('sentMessageLimit' in opts)) {
      return;
    }
    if (opts.sentMessageLimit < 0) {
      this.validationWarnings.push('"validationWarnings" cannot be negative number.');
      opts.sentMessageLimit = 2048;
    }
  }

  /**
   * Validates `clientCertificate` value.
   * @param {Options} opts Passed user options.
   */
  _validateCertificate(opts) {
    if (!('clientCertificate' in opts)) {
      return;
    }
    if (!opts.clientCertificate.type) {
      this.validationWarnings.push('The certificate has no type. It will be ignored.');
      try {
        delete opts.clientCertificate;
      } catch (_) {
        //
      }
      return;
    }
    if (!opts.clientCertificate.cert) {
      this.validationWarnings.push('The certificate has no data. It will be ignored.');
      try {
        delete opts.clientCertificate;
      } catch (_) {
        //
      }
      return;
    }
  }

  /**
   * Creates default values for passed options.
   * @param {Options} opts
   * @return {Options}
   */
  _setDefaults(opts) {
    if (!('validateCertificates' in opts)) {
      opts.validateCertificates = false;
    }
    if (!('followRedirects' in opts)) {
      opts.followRedirects = true;
    }
    if (!('sentMessageLimit' in opts)) {
      opts.sentMessageLimit = 2048;
    }
    if (!('defaultAccept' in opts)) {
      opts.defaultAccept = '*/*';
    }
    if (!('defaultUserAgent' in opts)) {
      opts.defaultUserAgent = 'advanced-rest-client';
    }
    return opts;
  }
}
