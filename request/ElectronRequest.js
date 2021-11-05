/**
 * @license
 * Copyright 2018 The Advanced REST client authors <arc@mulesoft.com>
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
// eslint-disable-next-line no-shadow
import { URL } from 'url';
import http from 'http';
import https from 'https';
import { ArcHeaders } from '@advanced-rest-client/base/src/lib/headers/ArcHeaders.js';
import { PayloadSupport } from './PayloadSupport.js';
import { RequestUtils } from './RequestUtils.js';
import { BaseRequest } from './BaseRequest.js';
import { NetError } from './Errors.js';

/** @typedef {import('net').Socket} Socket */
/** @typedef {import('url').UrlWithStringQuery} UrlWithStringQuery */
/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('@advanced-rest-client/events').ArcResponse.Response} ArcResponse */
/** @typedef {import('./RequestOptions.js').RequestOptions} RequestOptions */
/** @typedef {import('./RequestOptions').Options} Options */

/**
 * A HTTP client for ARC that uses Electron APIs to make a request.
 * @extends BaseRequest
 */
export class ElectronRequest extends BaseRequest {
  /**
   * @param {ArcBaseRequest} request The request to send.
   * @param {string} id The id of the request, used with events and when reporting the response.
   * @param {Options=} options Request send options.
   */
  constructor(request, id, options) {
    super(request, id, options);
    // handlers
    this._connectHandler = this._connectHandler.bind(this);
    this._secureConnectHandler = this._secureConnectHandler.bind(this);
    this._responseHandler = this._responseHandler.bind(this);
    this._timeoutHandler = this._timeoutHandler.bind(this);
    this._errorHandler = this._errorHandler.bind(this);
    this._lookupHandler = this._lookupHandler.bind(this);
    this._closeHandler = this._closeHandler.bind(this);
    this._socketHandler = this._socketHandler.bind(this);
    this._sendEndHandler = this._sendEndHandler.bind(this);
  }

  /**
   * Cleans the state after finished.
   */
  _cleanUp() {
    super._cleanUp();
    this._sentHttpMessage = undefined;
    this.responseReported = false;
  }

  /**
   * Cleans up the state for redirect.
   */
  _cleanUpRedirect() {
    super._cleanUpRedirect();
    this._sentHttpMessage = undefined;
  }

  /**
   * Sends the request
   * @return {Promise}
   */
  async send() {
    this.abort();
    this.aborted = false;
    const message = await this._prepareMessage();
    const request = this.opts.proxy ? await this._connectProxy(message) : this._connect(message);
    this.request = request;
    const { timeout } = this;
    if (timeout > 0) {
      request.setTimeout(timeout);
    }
  }

  /**
   * Prepares a HTTP message from ARC's request object.
   *
   * @return {Promise<Buffer>} Resolved promise to a `Buffer`.
   */
  async _prepareMessage() {
    let payload = this.arcRequest.payload;
    if (['get', 'head'].indexOf(this.arcRequest.method.toLowerCase()) !== -1) {
      payload = undefined;
    }
    const headers = new ArcHeaders(this.arcRequest.headers);
    this._prepareHeaders(headers);
    const buffer = await PayloadSupport.payloadToBuffer(payload, headers);
    RequestUtils.addContentLength(this.arcRequest.method, buffer, headers);
    this.arcRequest.headers = headers.toString();
    return buffer;
  }

  /**
   * Connects to the remote machine.
   * @param {Buffer} message
   * @return {http.ClientRequest}
   */
  _connect(message) {
    const uri = new URL(this.arcRequest.url);
    const port = RequestUtils.getPort(uri.port, uri.protocol);
    if (port === 443 || uri.protocol === 'https:') {
      return this._connectHttps(message, uri);
    }
    return this._connectHttp(message, uri);
  }

  /**
   * Connects to the remote machine via a proxy.
   * @param {Buffer} message
   * @return {Promise<http.ClientRequest>}
   */
  async _connectProxy(message) {
    const { proxy } = this.opts;
    const { url } = this.arcRequest;
    const isTargetSsl = url.startsWith('https:');
    const isProxySsl = proxy.startsWith('https:');
    const uri = new URL(url);

    if (!isProxySsl && !isTargetSsl) {
      return this._proxyHttpOverHttp(message, uri, proxy);
    }
    if (!isProxySsl && isTargetSsl) {
      return this._proxyHttpsOverHttp(message, uri, proxy);
    }
    if (isProxySsl && !isTargetSsl) {
      return this._proxyHttpOverHttps(message, uri, proxy);
    }
    return this._proxyHttpsOverHttps(message, uri, proxy);
  }

  /**
   * Creates a default options for a request.
   * @param {URL|UrlWithStringQuery} uri Instance of URL class for current URL.
   * @return {http.RequestOptions}
   */
  _createGenericOptions(uri) {
    const result = /** @type http.RequestOptions */ ({
      protocol: uri.protocol,
      host: uri.hostname,
      hash: uri.hash,
      method: this.arcRequest.method.toUpperCase(),
      headers: {},
    });
    if (uri.port) {
      result.port = uri.port;
    }
    result.path = `${uri.pathname}${uri.search}`;
    const headers = new ArcHeaders(this.arcRequest.headers);
    for (const [key, value] of headers.entries()) {
      result.headers[key] = value;
    }
    return result;
  }

  /**
   * Adds SSL options to the request.
   * @param {Object} options
   */
  _addSslOptions(options) {
    if (this.opts.validateCertificates) {
      options.checkServerIdentity = this._checkServerIdentity.bind(this);
    } else {
      options.rejectUnauthorized = false;
      options.requestOCSP = false;
    }
    const cert = this.opts.clientCertificate;
    if (cert) {
      this._addClientCertificate(cert, options);
    }
    options.agent = new https.Agent(options);
  }

  /**
   * Creates a connection using regular transport.
   * @param {Buffer} message
   * @param {URL} uri
   * @return {http.ClientRequest}
   */
  _connectHttp(message, uri) {
    if (!uri.port) {
      uri.port = '80';
    }
    const options = this._createGenericOptions(uri);
    const startTime = Date.now();
    this.stats.startTime = startTime;
    this.transportRequest.startTime = startTime;

    const request = http.request(options);
    // request.socket._pendingData
    this._setCommonListeners(request);
    if (message) {
      request.write(message);
    }
    this.stats.messageStart = Date.now();
    request.end();
    // This is a hack to read sent data.
    // In the https://github.com/nodejs/node/blob/0a62026f32d513a8a5d9ed857481df5f5fa18e8b/lib/_http_outgoing.js#L960
    // library it hold the data until it is flushed.
    // @ts-ignore
    const pending = request.outputData;
    if (Array.isArray(pending)) {
      // const parts = pending.map((i) => i.data);
      // this._sentHttpMessage = Buffer.from(parts.join(''));
      this._sentHttpMessage = pending;
    }
    try {
      this.emit('loadstart', this.id);
    } catch (_) {
      //
    }
    return request;
  }

  /**
   * Creates options to be set on the proxy request.
   * It replaces the original `host` and `port` values with the ones defined
   * for the proxy server.
   *
   * @param {string} proxy The proxy URI. (e.g. 10.0.0.12:8118)
   * @param {URL} requestUri The original request URI.
   * @param {http.RequestOptions} requestOptions The original request options
   * @return {http.RequestOptions}
   */
  _createProxyOptions(proxy, requestUri, requestOptions) {
    let proxyUrl = proxy;
    const options = requestOptions;
    const isSsl = proxyUrl.startsWith('https:');
    const isHttp = proxyUrl.startsWith('http:');
    if (!isSsl && !isHttp) {
      proxyUrl = `http://${proxyUrl}`;
    }
    const proxyUri = new URL(proxyUrl);
    if (!options.headers) {
      options.headers = {};
    }
    const auth = this._proxyAuthHeader();
    if (auth) {
      if (!options.headers['proxy-authorization']) {
        options.headers['proxy-authorization'] = auth;
      }
    }
    options.headers.host = `${requestUri.hostname}:${requestUri.port || 80}`;
    delete options.headers.Host;
    return {
      ...options,
      protocol: proxyUri.protocol,
      host: proxyUri.hostname,
      hostname: proxyUri.hostname,
      port: proxyUri.port || 80,
      path: requestUri.toString(),
      agent: false,
    };
  }

  /**
   * Creates a connection to non-ssl target via a non-ssl proxy.
   *
   * @param {Buffer} message The message to send
   * @param {URL} uri The target URI
   * @param {string} proxy The proxy URI
   * @return {http.ClientRequest}
   */
  _proxyHttpOverHttp(message, uri, proxy) {
    const targetOptions = this._createGenericOptions(uri);
    const options = this._createProxyOptions(proxy, uri, targetOptions);
    const startTime = Date.now();
    this.stats.startTime = startTime;
    this.transportRequest.startTime = startTime;
    const request = http.request(options);
    this._setCommonListeners(request);
    if (message) {
      request.write(message);
    }
    this.stats.messageStart = Date.now();
    this.stats.sentTime = this.stats.messageStart + 1;
    request.end();
    try {
      this.emit('loadstart', this.id);
    } catch (_) {
      //
    }
    return request;
  }

  /**
   * Creates a connection to non-ssl target via an ssl proxy.
   *
   * @param {Buffer} message The message to send
   * @param {URL} uri The target URI
   * @param {string} proxy The proxy URI
   * @return {Promise<http.ClientRequest>}
   */
  async _proxyHttpsOverHttp(message, uri, proxy) {
    let proxyUrl = proxy;
    if (!proxyUrl.startsWith('http:')) {
      proxyUrl = `http://${proxyUrl}`;
    }
    const proxyUri = new URL(proxyUrl);
    const proxyPort = proxyUri.port || 80;
    const targetPort = uri.port || 443; // target is always SSL so 443.
    const authority = `${uri.hostname}:${targetPort}`;
    const connectOptions = /** @type http.RequestOptions */ ({
      host: proxyUri.hostname,
      port: proxyPort,
      method: 'CONNECT',
      path: authority,
      headers: {
        host: authority,
      },
    });
    const auth = this._proxyAuthHeader();
    if (auth) {
      connectOptions.headers = {
        'proxy-authorization': auth,
      };
    }
    return new Promise((resolve, reject) => {
      const connectRequest = http.request(connectOptions);
      connectRequest.on('connect', (res, socket, head) => {
        if (res.statusCode === 200) {
          const options = this._createGenericOptions(uri);
          this._addSslOptions(options);
          delete options.agent;
          const startTime = Date.now();
          this.stats.startTime = startTime;
          this.transportRequest.startTime = startTime;
          const agent = new https.Agent({
            socket,
          });
          const request = https.request({ ...options, agent });
          this._connectHandler();
          this._setCommonListeners(request);
          if (message) {
            request.write(message);
          }
          request.end();
          this.stats.messageStart = Date.now();
          this.stats.sentTime = this.stats.messageStart + 1;
          resolve(request);
        } else if (res.statusCode === 401) {
          this.currentHeaders = new ArcHeaders(res.headers);
          this.currentResponse = /** @type ArcResponse */ ({
            status: res.statusCode,
            statusText: res.statusMessage,
            loadingTime: 0,
            headers: this.currentHeaders.toString(),
          });
          if (head.length) {
            this._rawBody = head;
            this.currentResponse.payload = head;
          }
          connectRequest.destroy();
          resolve(undefined);
          setTimeout(() => {
            // const e = new NetError('The proxy requires authentication.', 127);
            this._publishResponse({});
          });
        } else {
          connectRequest.destroy();
          const e = new NetError('A tunnel connection through the proxy could not be established.', 111);
          reject(e);
        }
      });
      connectRequest.once('error', (err) => reject(err));
      try {
        this.emit('loadstart', this.id);
      } catch (_) {
        //
      }
      connectRequest.end();
    });
  }

  /**
   * Creates a connection using SSL transport.
   * @param {Buffer} message
   * @param {URL} uri
   * @return {http.ClientRequest}
   */
  _connectHttps(message, uri) {
    if (!uri.port) {
      uri.port = '443';
    }
    const options = this._createGenericOptions(uri);
    this._addSslOptions(options);
    const startTime = Date.now();
    this.stats.startTime = startTime;
    this.transportRequest.startTime = startTime;

    const request = https.request(options);
    this._setCommonListeners(request);
    if (message) {
      request.write(message);
    }
    this.stats.messageStart = Date.now();
    this.stats.sentTime = this.stats.messageStart + 1;
    request.end();
    // This is a hack to read sent data.
    // In the https://github.com/nodejs/node/blob/0a62026f32d513a8a5d9ed857481df5f5fa18e8b/lib/_http_outgoing.js#L960
    // library it hold the data until it is flushed.
    // @ts-ignore
    const pending = request.outputData;
    if (Array.isArray(pending)) {
      // const parts = pending.map((i) => i.data);
      // this._sentHttpMessage = Buffer.from(parts.join(''));
      this._sentHttpMessage = pending;
    }
    try {
      this.emit('loadstart', this.id);
    } catch (_) {
      //
    }
    return request;
  }

  /**
   * Creates a connection to a non-ssl target using SSL proxy.
   * @param {Buffer} message
   * @param {URL} uri
   * @param {string} proxy The proxy URI
   * @return {http.ClientRequest}
   */
  _proxyHttpOverHttps(message, uri, proxy) {
    const targetOptions = this._createGenericOptions(uri);
    const options = /** @type https.RequestOptions */ (this._createProxyOptions(proxy, uri, targetOptions));
    options.rejectUnauthorized = false;
    // @ts-ignore
    options.requestOCSP = false;
    const startTime = Date.now();
    this.stats.startTime = startTime;
    this.transportRequest.startTime = startTime;
    const request = https.request(options);
    this._setCommonListeners(request);
    if (message) {
      request.write(message);
    }
    this.stats.messageStart = Date.now();
    this.stats.sentTime = this.stats.messageStart + 1;
    request.end();
    // @ts-ignore
    const pending = request.outputData;
    if (Array.isArray(pending)) {
      this._sentHttpMessage = pending;
    }
    try {
      this.emit('loadstart', this.id);
    } catch (_) {
      //
    }
    return request;
  }

  /**
   * Creates a connection to a non-ssl target using SSL proxy.
   * @param {Buffer} message
   * @param {URL} uri
   * @param {string} proxy The proxy URI
   * @return {http.ClientRequest}
   */
  _proxyHttpsOverHttps(message, uri, proxy) {
    let proxyUrl = proxy;
    if (!proxyUrl.startsWith('https:')) {
      proxyUrl = `https://${proxyUrl}`;
    }
    const proxyUri = new URL(proxyUrl);
    const connectOptions = /** @type https.RequestOptions */ ({
      host: proxyUri.hostname, // IP address of proxy server
      port: proxyUri.port || 443, // port of proxy server
      method: 'CONNECT',
      path: `${uri.hostname}:${uri.port || 443}`,
      headers: {
        host: `${uri.hostname}:${uri.port || 443}`,
      },
      rejectUnauthorized: false,
      requestOCSP: false,
    });
    const auth = this._proxyAuthHeader();
    if (auth) {
      connectOptions.headers = {
        'proxy-authorization': auth,
      };
    }
    const connectRequest = https.request(connectOptions);
    connectRequest.on('connect', (res, socket) => {
      if (res.statusCode === 200) {
        const agent = new https.Agent({ socket });
        const options = this._createGenericOptions(uri);
        this._addSslOptions(options);
        const startTime = Date.now();
        this.stats.startTime = startTime;
        this.transportRequest.startTime = startTime;
        const sslRequest = https.request({ ...options, agent, protocol: 'https:' });
        this._connectHandler();
        this._setCommonListeners(sslRequest);
        if (message) {
          sslRequest.write(message);
        }
        this.stats.messageStart = Date.now();
        this.stats.sentTime = this.stats.messageStart + 1;
        sslRequest.end();
        // @ts-ignore
        const pending = sslRequest.outputData;
        if (Array.isArray(pending)) {
          this._sentHttpMessage = pending;
        }
      } else {
        this._errorRequest({
          code: 111,
          message: 'A tunnel connection through the proxy could not be established.',
        });
        connectRequest.destroy();
      }
    });
    connectRequest.once('error', this._errorHandler);
    try {
      this.emit('loadstart', this.id);
    } catch (_) {
      //
    }
    connectRequest.end();
    return connectRequest;
  }

  /**
   * Sets listeners on a socket
   * @param {http.ClientRequest} request The request object
   */
  _setCommonListeners(request) {
    request.once('socket', this._socketHandler);
    request.once('error', this._errorHandler);
    request.once('response', this._responseHandler);
    request.once('close', this._closeHandler);
  }

  /**
   * Handler for connection error.
   * @param {Object} e
   */
  _errorHandler(e) {
    if (this.aborted) {
      return;
    }
    this._errorRequest({
      code: e.code,
      message: e.message,
    });
  }

  /**
   * Handler for DNS lookup.
   */
  _lookupHandler() {
    this.stats.lookupTime = Date.now();
  }

  /**
   * Handler for connected event.
   */
  _secureConnectHandler() {
    this.stats.secureConnectedTime = Date.now();
  }

  /**
   * Handler for connecting event.
   */
  _connectHandler() {
    this.stats.connectedTime = Date.now();
    this.stats.secureStartTime = Date.now();
  }

  /**
   * Handler for sending finished event
   */
  _sendEndHandler() {
    if (!this.stats.sentTime) {
      this.stats.sentTime = Date.now();
    }
  }

  /**
   * Handler for timeout event
   */
  _timeoutHandler() {
    this._errorRequest({
      code: 7,
    });
    this.abort();
  }

  /**
   * A handler for response data event
   * @param {http.IncomingMessage} res
   */
  _responseHandler(res) {
    this.emit('firstbyte', this.id);
    this.stats.firstReceiveTime = Date.now();
    this.stats.responseTime = Date.now();
    if (this._sentHttpMessage) {
      this.transportRequest.httpMessage = this._readSentMessage(this._sentHttpMessage);
    } else {
      this.transportRequest.httpMessage = '';
    }
    const status = res.statusCode;
    const headers = res.headers;
    const arcHeaders = new ArcHeaders(headers);
    const rawHeaders = arcHeaders.toString();
    this.currentResponse = /** @type ArcResponse */ ({
      status,
      statusText: res.statusMessage,
      headers: rawHeaders,
      loadingTime: 0,
    });
    this.currentHeaders = arcHeaders;
    const detail = {
      returnValue: true,
      value: rawHeaders,
    };
    this.emit('headersreceived', this.id, detail);
    if (!detail.returnValue) {
      this.abort();
      return;
    }
    res.on('data', (chunk) => {
      if (!this._rawBody) {
        this._rawBody = chunk;
      } else {
        const endTime = Date.now();
        this.stats.lastReceivedTime = endTime;
        this._rawBody = Buffer.concat([this._rawBody, chunk]);
      }
    });

    res.once('end', () => {
      const endTime = Date.now();
      this.transportRequest.endTime = endTime;
      this.stats.receivingTime = endTime;
      this._reportResponse();
    });
  }

  /**
   * Handler for connection close event
   */
  _closeHandler() {
    if (this.responseReported || this.aborted || this.redirecting) {
      return;
    }
    if (!this.currentResponse) {
      // The parser haven't found the end of message so there was no message!
      this._errorRequest(new Error('Connection closed unexpectedly.'));
    } else {
      // There is an issue with the response. Size mismatch? Anyway,
      // it tries to create a response from current data.
      this.emit('loadend', this.id);
      this._publishResponse({ includeRedirects: true });
    }
  }

  /**
   * @param {Socket} socket
   */
  _socketHandler(socket) {
    this.socket = socket;
    socket.once('lookup', this._lookupHandler);
    socket.once('connect', this._connectHandler);
    socket.once('timeout', this._timeoutHandler);
    socket.once('end', this._sendEndHandler);
    socket.once('secureConnect', this._secureConnectHandler);
    this.stats.connectionTime = Date.now();
    // // @todo(pawel): this is a hack that shouldn't take place.
    // // @ts-ignore
    // this._sentHttpMessage = socket._pendingData;
  }

  /**
   * Creates and publishes a response.
   */
  _reportResponse() {
    if (this.aborted) {
      return;
    }
    const { status } = this.currentResponse;
    if (status >= 300 && status < 400) {
      if (this.followRedirects !== false && this._reportRedirect(status)) {
        return;
      }
    }
    if (this.responseReported) {
      return;
    }
    this.responseReported = true;
    this.emit('loadend', this.id);
    this._publishResponse({ includeRedirects: true });
  }

  /**
   * Transforms a message from the client to a string.
   * It uses `opts.sentMessageLimit` to limit number of data returned
   * by the client.
   * @param {string|Array<Object>} messages
   * @return {string}
   */
  _readSentMessage(messages) {
    let result = '';
    if (typeof messages === 'string') {
      result = messages;
    } else {
      for (let i = 0, len = messages.length; i < len; i++) {
        const chunk = messages[i].data;
        if (!chunk) {
          continue;
        }
        if (typeof chunk === 'string') {
          result += chunk;
        } else if (chunk instanceof Uint8Array) {
          result += chunk.toString();
        }
      }
    }
    const limit = this.opts.sentMessageLimit;
    if (limit && limit > 0 && result.length >= limit) {
      result = result.substr(0, limit);
      result += ' ...';
    }
    return result;
  }
}
