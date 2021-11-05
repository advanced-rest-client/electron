import { URL, UrlWithStringQuery } from 'url';
import { ClientRequest } from 'http';
import { Socket } from 'net';
import { ArcRequest } from '@advanced-rest-client/events';
import { BaseRequest } from './BaseRequest.js';
import { Options } from './RequestOptions';
import { RequestOptions } from 'https';

/**
 * A HTTP client for ARC that uses Electron APIs to make a request.
 */
export declare class ElectronRequest extends BaseRequest {
  /**
   * @param request
   * The id of the request, used with events and when reporting the response.
   * @param options
   */
  constructor(request: ArcRequest.ArcBaseRequest, id: string, options?: Options);

  /**
   * Cleans the state after finished.
   */
  _cleanUp(): void;

  /**
   * Cleans up the state for redirect.
   */
  _cleanUpRedirect(): void;

  /**
   * Sends the request
   * @return {Promise}
   */
  send(): Promise<void>;

  /**
   * Prepares a HTTP message from ARC's request object.
   *
   * @returns A Promise resolved to a `Buffer`.
   */
  _prepareMessage(): Promise<Buffer>;

  /**
   * Connects to a remote machine.
   * @param {Buffer} message
   * @return {http.ClientRequest} [description]
   */
  _connect(message: Buffer): ClientRequest;

  /**
   * Connects to the remote machine via a proxy.
   * @param {Buffer} message
   * @return {http.ClientRequest} [description]
   */
  _connectProxy(message: Buffer): ClientRequest;

  /**
   * Creates a default options for a request.
   * @param uri Instance of URL class for current URL.
   */
  _createGenericOptions(uri: URL|UrlWithStringQuery): any;

  /**
   * Adds SSL options to the request.
   * @param {Object} options
   */
  _addSslOptions(options: Object): void;

  /**
   * Creates a connection using regular transport.
   */
  _connectHttp(message: Buffer, uri: URL): ClientRequest;

  /**
   * Creates options to be set on the proxy request.
   * It replaces the original `host` and `port` values with the ones defined
   * for the proxy server.
   *
   * @param proxy The proxy URI. (e.g. 10.0.0.12:8118)
   * @param requestUri The original request URI.
   * @param requestOptions The original request options
   * @param auth Optional authorization.
   */
  _createProxyOptions(proxy: string, requestUri: URL, requestOptions: RequestOptions, auth?: string): RequestOptions;

  /**
   * Creates a connection to non-ssl target via a non-ssl proxy.
   *
   * @param message The message to send
   * @param uri The target URI
   * @param proxy The proxy URI
   * @param auth Optional authorization header value (not encoded).
   */
  _proxyHttpOverHttp(message: Buffer, uri: URL, proxy: String, auth?: string): ClientRequest;

  /**
   * Creates a connection to non-ssl target via an ssl proxy.
   *
   * @param message The message to send
   * @param uri The target URI
   * @param proxy The proxy URI
   * @param auth Optional authorization header value (not encoded).
   */
  _proxyHttpsOverHttp(message: Buffer, uri: URL, proxy: String, auth?: string): ClientRequest;

  /**
   * Creates a connection using SSL transport.
   */
  _connectHttps(message: Buffer, uri: URL): ClientRequest;

  /**
   * Creates a connection to a non-ssl target using SSL proxy.
   * @param message
   * @param uri
   * @param proxy The proxy URI
   * @param auth Optional authorization header value (not encoded).
   */
   _proxyHttpOverHttps(message: Buffer, uri: URL, proxy: String, auth?: string): ClientRequest;

  /**
   * Creates a connection to a non-ssl target using SSL proxy.
   * @param message
   * @param uri
   * @param proxy The proxy URI
   * @param auth Optional authorization header value (not encoded).
   */
  _proxyHttpsOverHttps(message: Buffer, uri: URL, proxy: String, auth?: string): ClientRequest;

  /**
   * Sets listeners on a socket
   * @param request The request object
   */
  _setCommonListeners(request: ClientRequest): void;

  /**
   * Handler for connection error.
   */
  _errorHandler(e: object): void;

  /**
   * Handler for DNS lookup.
   */
  _lookupHandler(): void;

  /**
   * Handler for connected event.
   */
  _secureConnectHandler(): void;

  /**
   * Handler for connecting event.
   */
  _connectHandler(): void;

  /**
   * Handler for sending finished event
   */
  _sendEndHandler(): void;

  /**
   * Handler for timeout event
   */
  _timeoutHandler(): void;

  /**
   * A handler for response data event
   */
  _responseHandler(res: Object): void;

  /**
   * Handler for connection close event
   */
  _closeHandler(): void;

  _socketHandler(socket: Socket): void;

  /**
   * Creates and publishes a response.
   */
  _reportResponse(): void;

  /**
   * Transforms a message from the client to a string.
   * It uses `opts.sentMessageLimit` to limit number of data returned
   * by the client.
   */
  _readSentMessage(messages: string|object[]): string;
}
