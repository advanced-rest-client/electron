import { ArcHeaders } from '@advanced-rest-client/base/src/lib/headers/ArcHeaders.js';

export declare interface RedirectOptions {
  /**
   * true if redirect is required
   */
  redirect?: boolean;
  /**
   * If true the redirected request has to be a GET request.
   */
  forceGet?: boolean;
  /**
   * location of the resource (redirect uri)
   */
  location?: string;
}

/**
 * A class containing only static members to contain multi-module
 * helper methods.
 */
export declare class RequestUtils {
  /**
   * Reads a port number for a connection.
   *
   * @param port Existing information about port.
   * @param protocol Request protocol. Only used if `port` is not set.
   * @returns A port number. Default to 80.
   */
  static getPort(port: string|number, protocol?: string): number;

  /**
   * Creates a value for host header.
   *
   * @param value An url to get the information from.
   * @returns Value of the host header
   */
  static getHostHeader(value: string): string;

  /**
   * Adds the `content-length` header to current request headers list if
   * it's required.
   * This function will do nothing if the request do not carry a payload or
   * when the content length header is already set.
   *
   * @param method HTTP request method
   * @param buffer Generated message buffer.
   * @param headers A headers object where to append headers if
   * needed
   */
  static addContentLength(method: string, buffer: Buffer, headers: ArcHeaders): void;

  /**
   * Checks if redirect is required.
   * @param status Response status code
   * @param method Request HTTP method
   * @param location Location header value, if any
   * @return Redirect options
   */
  static redirectOptions(status: number, method: string, location?: string): RedirectOptions;

  /**
   * Checks if redirect is an infinite loop.
   * @param location Redirect location
   * @param redirects List of response objects
   * @returns True if redirect is into the same place as already visited.
   */
  static isRedirectLoop(location: string, redirects: Set<Object>): boolean;

  /**
   * Processes redirection location
   * @param location Redirect location
   * @param requestUrl Request url
   * @returns Redirect location
   */
  static getRedirectLocation(location: string, requestUrl: string): string|undefined;
}
