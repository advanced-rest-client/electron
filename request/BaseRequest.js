import zlib from 'zlib';
import tls from 'tls';
import { EventEmitter } from 'events';
import { Cookies } from '@advanced-rest-client/base/src/lib/Cookies.js';
import { ArcHeaders } from '@advanced-rest-client/base/src/lib/headers/ArcHeaders.js';
import { RequestOptions } from './RequestOptions.js';
import { RequestUtils } from './RequestUtils.js';
import { HttpErrorCodes } from './HttpErrorCodes.js';
import { HostRulesEval } from './HostRulesEval.js';
import logger from 'electron-log';

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('@advanced-rest-client/events').ClientCertificate.ClientCertificate} ClientCertificate */
/** @typedef {import('@advanced-rest-client/events').ArcResponse.RequestTime} RequestTime */
/** @typedef {import('@advanced-rest-client/events').ArcResponse.Response} ArcResponse */
/** @typedef {import('@advanced-rest-client/events').ArcResponse.ErrorResponse} ErrorResponse */
/** @typedef {import('@advanced-rest-client/events').ArcResponse.ResponseRedirect} ResponseRedirect */
/** @typedef {import('@advanced-rest-client/events').ArcResponse.ResponseAuth} ResponseAuth */
/** @typedef {import('@advanced-rest-client/events').ArcRequest.TransportRequest} TransportRequest */
/** @typedef {import('./RequestTypes').ResponsePublishOptions} ResponsePublishOptions */
/** @typedef {import('./RequestTypes').RequestStats} RequestStats */
/** @typedef {import('./RequestOptions').Options} Options */
/** @typedef {import('./RequestUtils').RedirectOptions} RedirectOptions */
/** @typedef {import('tls').PxfObject} PxfObject */
/** @typedef {import('tls').KeyObject} KeyObject */

/**
 * Base class for all HTTP clients.
 * @extends EventEmitter
 */
export class BaseRequest extends EventEmitter {
  /**
   * @param {ArcBaseRequest} request The request to send.
   * @param {string} id The id of the request, used with events and when reporting the response.
   * @param {Options=} options Request send options.
   */
  constructor(request, id, options) {
    super();
    let opts = options;
    if (!(opts instanceof RequestOptions)) {
      opts = new RequestOptions(opts);
    }
    this.opts = /** @type RequestOptions */ (opts);
    this.logger = this.__setupLogger(opts);
    this._printValidationWarnings();
    this.arcRequest = { ...request };
    /**
     * When true the request has been aborted.
     * @type {boolean}
     */
    this.aborted = false;
    /**
     * The ID of the request to be report back with events.
     * @type {string}
     */
    this.id = id;
    /**
     * Stats object to compute request statistics
     * @type {RequestStats}
     */
    this.stats = {};
    /**
     * Hosts table. See options class for description.
     * @type {object|undefined}
     */
    this.hosts = opts.hosts;
    /**
     * Parsed value of the request URL.
     * @type {URL}
     */
    this.uri = undefined;
    this._updateUrl(request.url);
    this.socket = undefined;
    /**
     * Host header can be different than registered URL because of
     * `hosts` rules.
     * If a rule changes host value of the URL the original URL host value
     * is used when generating the request and not overwritten one.
     * This way virtual hosts can be tested using hosts.
     *
     * @type {string}
     */
    this.hostHeader = RequestUtils.getHostHeader(request.url);
    this._hostTestReg = /^\s*host\s*:/im;
    /**
     * @type {ResponseAuth}
     */
    this.auth = null;
    this.redirecting = false;

    /**
     * @type {TransportRequest}
     */
    this.transportRequest = {
      endTime: -1,
      startTime: -1,
      httpMessage: '',
      method: request.method,
      url: request.url,
      headers: '',
    };
    /**
     * @type {Set<ResponseRedirect>}
     */
    this.redirects = new Set();

    /**
     * The response object being currently
     * @type {ArcResponse}
     */
    this.currentResponse = undefined;
    /**
     * The response headers parsed by the ARcHeaders class.
     * @type {ArcHeaders}
     */
    this.currentHeaders = undefined;
  }

  /**
   * @return {boolean} True if following redirects is allowed.
   */
  get followRedirects() {
    const { opts, arcRequest } = this;
    const { config } = arcRequest;
    if (config && typeof config.followRedirects === 'boolean') {
      return config.followRedirects;
    }
    if (typeof opts.followRedirects === 'boolean') {
      return opts.followRedirects;
    }
    return false;
  }

  /**
   * @return {number}
   */
  get timeout() {
    const { opts, arcRequest } = this;
    const { config } = arcRequest;
    if (config && typeof config.timeout === 'number') {
      return config.timeout;
    }
    if (typeof opts.timeout === 'number') {
      return opts.timeout;
    }
    return 0;
  }

  /**
   * Updates the `uri` property from current request URL
   * @param {string} value The request URL
   */
  _updateUrl(value) {
    value = HostRulesEval.applyHosts(value, this.hosts);
    this.uri = new URL(value);
  }

  /**
   * Creates a logger object to log debug output.
   *
   * @param {Options} opts
   * @return {any}
   */
  __setupLogger(opts) {
    if (opts.logger) {
      return opts.logger;
    }
    return logger;
  }

  /**
   * Prints warning messages to the logger.
   */
  _printValidationWarnings() {
    const warnings = this.opts.validationWarnings;
    if (!warnings || !warnings.length) {
      return;
    }
    warnings.forEach((warning) => {
      this.logger.warn(warning);
    });
  }

  /**
   * Cleans the state after finished.
   */
  _cleanUp() {
    this.redirects = new Set();
    this.currentHeaders = undefined;
    this.currentResponse = undefined;
    this._rawBody = undefined;
    this.redirecting = false;
    this.stats = /** @type RequestStats */ ({});
    this._clearSocketEventListeners();
  }

  /**
   * Cleans up the state for redirect.
   */
  _cleanUpRedirect() {
    this.currentHeaders = undefined;
    this.currentResponse = undefined;
    this._rawBody = undefined;
    this.stats = /** @type RequestStats */ ({});
    this._clearSocketEventListeners();
  }

  /**
   * Aborts current request.
   * It emits `error` event
   */
  abort() {
    this.aborted = true;
    if (!this.socket) {
      return;
    }
    if (this.socket.destroyed) {
      this.socket = undefined;
      return;
    }
    this.socket.pause();
    this.socket.destroy();
    this.socket = undefined;
  }

  /**
   * Decompresses received body if `content-encoding` header is set.
   *
   * @param {Buffer} body A body buffer to decompress.
   * @return {Promise<Buffer>} Promise resolved to parsed body
   */
  async _decompress(body) {
    if (this.aborted || !body) {
      return;
    }
    const ceHeader = 'content-encoding';
    if (!this.currentHeaders.has(ceHeader)) {
      return body;
    }
    const ce = this.currentHeaders.get(ceHeader);
    if (ce.indexOf('deflate') !== -1) {
      return this._inflate(body);
    }
    if (ce.indexOf('gzip') !== -1) {
      return this._gunzip(body);
    }
    if (ce.indexOf('br') !== -1) {
      return this._brotli(body);
    }
    return body;
  }

  /**
   * Decompress body with Inflate.
   * @param {Buffer} body Received response payload
   * @return {Promise<Buffer>} Promise resolved to decompressed buffer.
   */
  _inflate(body) {
    body = Buffer.from(body);
    return new Promise((resolve, reject) => {
      zlib.inflate(body, (err, buffer) => {
        if (err) {
          reject(new Error(err.message || String(err)));
        } else {
          resolve(buffer);
        }
      });
    });
  }

  /**
   * Decompress body with ZLib.
   * @param {Buffer} body Received response payload
   * @return {Promise<Buffer>} Promise resolved to decompressed buffer.
   */
  _gunzip(body) {
    body = Buffer.from(body);
    return new Promise((resolve, reject) => {
      zlib.gunzip(body, (err, buffer) => {
        if (err) {
          reject(new Error(err.message || String(err)));
        } else {
          resolve(buffer);
        }
      });
    });
  }

  /**
   * Decompress Brotli.
   * @param {Buffer} body Received response payload
   * @return {Promise<Buffer>} Promise resolved to decompressed buffer.
   */
  _brotli(body) {
    body = Buffer.from(body);
    return new Promise((resolve, reject) => {
      zlib.brotliDecompress(body, (err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    });
  }

  /**
   * Reports response when redirected.
   * @param {number} status Received status code
   * @return {boolean} True if the request has been redirected.
   */
  _reportRedirect(status) {
    const { arcRequest } = this;
    const rerUrl = this.currentHeaders.get('location');
    // https://github.com/jarrodek/socket-fetch/issues/13
    const redirectOptions = RequestUtils.redirectOptions(status, arcRequest.method, rerUrl);
    if (!redirectOptions.redirect) {
      return false;
    }
    this.redirecting = true;
    // @ts-ignore
    if (typeof window !== 'undefined') {
      // @ts-ignore
      // eslint-disable-next-line no-undef
      window.setTimeout(() => this._redirectRequest(redirectOptions));
    } else {
      process.nextTick(() => this._redirectRequest(redirectOptions));
    }
    return true;
  }

  /**
   * Creates a response and adds it to the redirects list and redirects
   * the request to the new location.
   *
   * @param {RedirectOptions} options A redirection options:
   * forceGet {Boolean} - If true the redirected request will be GET request
   * location {String} - location of the resource (redirect uri)
   */
  async _redirectRequest(options) {
    if (this.followRedirects === false) {
      this._publishResponse({ includeRedirects: true });
      return;
    }
    const location = RequestUtils.getRedirectLocation(options.location, this.arcRequest.url);
    if (!location) {
      this._errorRequest({ code: 302 });
      return;
    }

    // check if this is infinite loop
    if (RequestUtils.isRedirectLoop(location, this.redirects)) {
      this._errorRequest({ code: 310 });
      return;
    }

    const detail = {
      location,
      returnValue: true,
    };
    this.emit('beforeredirect', this.id, detail);
    if (!detail.returnValue) {
      this._publishResponse({ includeRedirects: true });
      return;
    }
    let responseCookies;
    if (this.currentHeaders.has('set-cookie')) {
      responseCookies = this.currentHeaders.get('set-cookie');
    }
    try {
      const response = await this._createRedirectResponse(location);
      this.redirects.add(response);
      this._cleanUpRedirect();
      if (responseCookies) {
        this._processRedirectCookies(responseCookies, location);
      }
      this.redirecting = false;
      this.arcRequest.url = location;
      this.transportRequest.url = location;
      if (options.forceGet) {
        this.arcRequest.method = 'GET';
      }
      this._updateUrl(location);
      this.hostHeader = RequestUtils.getHostHeader(location);
      // No idea why but without setTimeout the program loses it's
      // scope after calling the function.
      // @ts-ignore
      if (typeof window !== 'undefined') {
        // @ts-ignore
        // eslint-disable-next-line no-undef
        window.setTimeout(() => this.send());
      } else {
        // @ts-ignore
        process.nextTick(() => this.send());
      }
    } catch (e) {
      this._errorRequest({
        message: (e && e.message) || 'Unknown error occurred',
      });
    }
  }

  /**
   * @param {string} location The redirect location.
   * @return {Promise<ResponseRedirect>} Redirect response object
   */
  async _createRedirectResponse(location) {
    const { currentResponse } = this;
    const result = /** @type ResponseRedirect */ ({
      response: {
        status: currentResponse.status,
        statusText: currentResponse.statusText,
        headers: currentResponse.headers,
      },
      url: location,
      timings: this._computeStats(this.stats),
      startTime: this.stats.startTime,
      endTime: this.stats.responseTime,
    });
    const body = await this._decompress(this._rawBody);
    if (body) {
      result.response.payload = body;
      this.currentResponse.payload = body;
    }
    return result;
  }

  /**
   * Create a `Response` object.
   *
   * @param {ResponsePublishOptions=} opts Options to construct a response object.
   * @return {Promise<ArcResponse|ErrorResponse>} A response object.
   */
  async _createResponse(opts = {}) {
    if (opts.error) {
      const resp = /** @type ErrorResponse */ ({
        status: 0,
        error: new Error(opts.error.message),
        id: this.id,
        // sentHttpMessage: this.arcRequest.sentHttpMessage,
        // stats: this._computeStats(this.stats),
      });
      return resp;
    }
    if (this.aborted) {
      return;
    }
    const status = this.currentResponse.status;
    if (status < 100 || status > 599) {
      throw new Error(`The response status "${status}" is not allowed.
      See HTTP spec for more details: https://tools.ietf.org/html/rfc2616#section-6.1.1`);
    } else if (status === undefined) {
      throw new Error(`The response status is empty.
It means that the successful connection wasn't made.
Check your request parameters.`);
    }
    const body = await this._decompress(this._rawBody);
    const response = /** @type ArcResponse */ ({
      status,
      statusText: this.currentResponse.statusText,
      headers: this.currentResponse.headers,
      loadingTime: this._computeLoadingTime(),
      id: this.id,
      payload: body,
      timings: this._computeStats(this.stats),
      size: {
        request: 0,
        response: 0,
      },
    });
    if (body) {
      response.payload = body;
      this.currentResponse.payload = body;
      response.size.response = body.length;
    }
    if (this.transportRequest.httpMessage) {
      response.size.request = Buffer.from(this.transportRequest.httpMessage).length;
    }
    if (opts.includeRedirects && this.redirects.size) {
      response.redirects = Array.from(this.redirects);
    }
    if (status === 401) {
      response.auth = this._getAuth();
    }
    return response;
  }

  /**
   * Finishes the response with error message.
   * @param {Object} opts `code` and `message`
   * @param {number=} opts.code
   * @param {string=} opts.message
   */
  _errorRequest(opts) {
    const { currentResponse } = this;
    this.aborted = true;
    let message;
    if (opts.code && !opts.message) {
      message = HttpErrorCodes.getCodeMessage(opts.code);
    } else if (opts.message) {
      message = opts.message;
    }
    message = message || 'Unknown error occurred';
    const error = new Error(message);
    let response;
    if (currentResponse && currentResponse.status) {
      response = /** @type ErrorResponse */ ({
        status: currentResponse.status,
        statusText: currentResponse.statusText,
        headers: currentResponse.headers,
        error,
        id: this.id,
        payload: currentResponse.payload,
      });
    }
    this.emit('error', error, this.id, this.transportRequest, response);
    this._cleanUp();
  }

  /**
   * Generates authorization info object from response.
   *
   * @return {ResponseAuth}
   */
  _getAuth() {
    if (this.auth) {
      return this.auth;
    }
    let auth;
    if (this.currentHeaders.has('www-authenticate')) {
      auth = this.currentHeaders.get('www-authenticate');
    }
    const result = /** @type ResponseAuth */ ({
      method: 'unknown',
    });
    if (auth) {
      auth = auth.toLowerCase();
      if (auth.indexOf('ntlm') !== -1) {
        result.method = 'ntlm';
      } else if (auth.indexOf('basic') !== -1) {
        result.method = 'basic';
      } else if (auth.indexOf('digest') !== -1) {
        result.method = 'digest';
      }
    }
    return result;
  }

  /**
   * Generate response object and publish it to the listeners.
   *
   * @param {ResponsePublishOptions} opts
   * @return {Promise<void>}
   */
  async _publishResponse(opts) {
    if (this.aborted) {
      return;
    }
    let response;
    try {
      response = await this._createResponse(opts);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      this._errorRequest({
        message: (e && e.message) || 'Unknown error occurred',
      });
      return;
    }
    this.emit('load', this.id, response, this.transportRequest);
    this._cleanUp();
    this.abort();
  }

  /**
   * Computes the request loading time from current stats.
   * @return {number} The request loading time.
   */
  _computeLoadingTime() {
    const info = this._computeStats(this.stats);
    let result = 0;
    Object.keys(info).forEach((key) => {
      const value = info[key];
      if (value > 0) {
        result += value;
      }
    });
    return result;
  }

  /**
   * Creates HAR 1.2 timings object from stats.
   * @param {RequestStats} stats Timings object
   * @return {RequestTime}
   */
  _computeStats(stats) {
    const {
      sentTime,
      messageStart,
      connectionTime,
      lookupTime=0,
      connectedTime,
      secureStartTime,
      secureConnectedTime,
      lastReceivedTime,
      firstReceiveTime,
      receivingTime,
    } = stats;
    const type = 'number';
    // in case the `send` event was not handled we use the `messageStart` as this is set when the request is created.
    const adjustedSentTime = sentTime || messageStart;
    // when there was no body we check when the end time.
    const adjustedLastReceivedTime = lastReceivedTime || receivingTime;
    const adjustedLookupTime = lookupTime || messageStart;
    let send = adjustedSentTime && messageStart ? adjustedSentTime - messageStart : -1;
    if (send < 0) {
      send = 0;
    }
    const dns = lookupTime ? lookupTime - connectionTime : -1;
    const connect = connectedTime && adjustedLookupTime ? connectedTime - adjustedLookupTime : -1;
    let receive = adjustedLastReceivedTime && firstReceiveTime ? adjustedLastReceivedTime - firstReceiveTime : -1;
    if (receive < 0) {
      receive = 0;
    }
    let wait = firstReceiveTime && adjustedSentTime ? firstReceiveTime - adjustedSentTime : -1;
    if (wait < 0) {
      wait = 0;
    }
    let ssl = -1;
    if (typeof secureStartTime === type && typeof secureConnectedTime === type) {
      ssl = secureConnectedTime - secureStartTime;
    }
    return {
      blocked: 0,
      connect,
      receive,
      send,
      wait,
      dns,
      ssl,
    };
  }

  /**
   * Handles cookie exchange when redirecting the request.
   * @param {string} responseCookies Cookies received in the response
   * @param {string} location Redirect destination
   */
  _processRedirectCookies(responseCookies, location) {
    let newParser = new Cookies(responseCookies, location);
    newParser.filter();
    const expired = newParser.clearExpired();
    const headers = new ArcHeaders(this.arcRequest.headers);
    const hasCookie = headers.has('cookie');
    if (hasCookie) {
      const oldCookies = headers.get('cookie');
      const oldParser = new Cookies(oldCookies, location);
      oldParser.filter();
      oldParser.clearExpired();
      oldParser.merge(newParser);
      newParser = oldParser;
      // remove expired from the new response.
      newParser.cookies = newParser.cookies.filter((c) => {
        for (let i = 0, len = expired.length; i < len; i++) {
          if (expired[i].name === c.name) {
            return false;
          }
        }
        return true;
      });
    }
    const str = newParser.toString(true);
    if (str) {
      headers.set('cookie', str);
    } else if (hasCookie) {
      headers.delete('cookie');
    }
    this.arcRequest.headers = headers.toString();
  }

  /**
   * Checks certificate identity using TLS api.
   * @param {string} host Request host name
   * @param {Object} cert TLS certificate info object
   * @return {Error|undefined}
   */
  _checkServerIdentity(host, cert) {
    const err = tls.checkServerIdentity(host, cert);
    if (err) {
      return err;
    }
  }

  /**
   * Clears event listeners of the socket object,
   */
  _clearSocketEventListeners() {
    if (!this.socket) {
      return;
    }
    this.socket.removeAllListeners('error');
    this.socket.removeAllListeners('timeout');
    this.socket.removeAllListeners('end');
  }

  /**
   * Prepares headers list to be send to the remote machine.
   * If `defaultHeaders` option is set then it adds `user-agent` and `accept`
   * headers.
   * @param {ArcHeaders} headers Parsed headers
   */
  _prepareHeaders(headers) {
    if (!this.opts.defaultHeaders) {
      return;
    }
    if (!headers.has('user-agent')) {
      if (this.opts.defaultUserAgent) {
        headers.set('user-agent', this.opts.defaultUserAgent);
      }
    }
    if (!headers.has('accept')) {
      if (this.opts.defaultAccept) {
        headers.set('accept', this.opts.defaultAccept);
      }
    }
  }

  /**
   * Adds client certificate to the request configuration options.
   *
   * @param {ClientCertificate} certificate List of certificate configurations.
   * @param {tls.ConnectionOptions} options Request options. Cert agent options are
   * added to this object.
   */
  _addClientCertificate(certificate, options) {
    if (!certificate) {
      return;
    }
    const cert = { ...certificate };
    if (!Array.isArray(cert.cert)) {
      cert.cert = [cert.cert];
    }
    if (cert.type === 'p12') {
      options.pfx = cert.cert.map((item) => {
        const struct = /** @type PxfObject */ ({
          buf: item.data,
        });
        if (item.passphrase) {
          struct.passphrase = item.passphrase;
        }
        return struct;
      });
    } else if (cert.type === 'pem') {
      options.cert = cert.cert.map((item) => Buffer.from(/** @type string | Buffer */ (item.data)));
      if (cert.key) {
        if (!Array.isArray(cert.key)) {
          cert.key = [cert.key];
        }
        options.key = cert.key.map((item) => {
          const struct = /** @type KeyObject */ ({
            pem: item.data,
          });
          if (item.passphrase) {
            struct.passphrase = item.passphrase;
          }
          return struct;
        });
      }
    }
  }

  /**
   * @return {string|undefined} Proxy authorization header value, when defined.
   */
  _proxyAuthHeader() {
    const { proxyUsername, proxyPassword='' } = this.opts;
    if (!proxyUsername) {
      return undefined;
    }
    const auth = `${proxyUsername}:${proxyPassword}`;
    const hash = Buffer.from(auth).toString('base64');
    return `Basic ${hash}`;
  }
}
