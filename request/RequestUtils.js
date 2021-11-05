/* eslint-disable no-shadow */
import { URL } from 'url';

/** @typedef {import('@advanced-rest-client/events').ArcResponse.ResponseRedirect} ResponseRedirect */
/** @typedef {import('@advanced-rest-client/base/src/lib/headers/ArcHeaders').ArcHeaders} ArcHeaders */
/** @typedef {import('./RequestUtils').RedirectOptions} RedirectOptions */
/**
 * A class containing only static members to contain multi-module
 * helper methods.
 */
export class RequestUtils {
  /**
   * Reads a port number for a connection.
   *
   * @param {number|string} port Existing information about the port.
   * @param {string=} protocol Request protocol. Only used if `port` is not set.
   * @return {number} A port number. Default to 80.
   */
  static getPort(port, protocol) {
    if (port) {
      const typedPort = Number(port);
      if (!Number.isNaN(typedPort)) {
        return typedPort;
      }
    }
    if (protocol === 'https:') {
      return 443;
    }
    return 80;
  }

  /**
   * Creates a value for host header.
   *
   * @param {String} value An url to get the information from.
   * @return {String} Value of the host header
   */
  static getHostHeader(value) {
    let uri;
    try {
      uri = new URL(value);
    } catch (e) {
      return;
    }
    let hostValue = uri.hostname;
    const defaultPorts = [80, 443];
    const port = RequestUtils.getPort(uri.port, uri.protocol);
    if (defaultPorts.indexOf(port) === -1) {
      hostValue += `:${port}`;
    }
    return hostValue;
  }

  /**
   * Adds the `content-length` header to current request headers list if
   * it's required.
   * This function will do nothing if the request do not carry a payload or
   * when the content length header is already set.
   *
   * @param {string} method HTTP request method
   * @param {Buffer} buffer Generated message buffer.
   * @param {ArcHeaders} headers A headers object where to append headers if
   * needed
   */
  static addContentLength(method, buffer, headers) {
    if (method === 'GET') {
      return;
    }
    const size = buffer ? buffer.length : 0;
    headers.set('content-length', String(size));
  }

  /**
   * Checks if redirect is required.
   * @param {number} status Response status code
   * @param {string} method Request HTTP method
   * @param {string=} location Location header value, if any
   * @return {RedirectOptions} The redirect options
   */
  static redirectOptions(status, method, location) {
    const result = {
      redirect: false,
      forceGet: false,
    };
    switch (status) {
      case 300:
      case 304:
      case 305:
        // do nothing;
        break;
      case 301:
      case 302:
      case 307:
        if (['GET', 'HEAD'].indexOf(method) !== -1) {
          result.redirect = true;
        }
        break;
      case 303:
        result.redirect = true;
        result.forceGet = true;
        break;
      default:
    }
    if (!result.redirect) {
      return result;
    }
    if (location) {
      result.location = location;
    }
    return result;
  }

  /**
   * Checks if request is an infinite loop.
   * @param {string} location Redirect location
   * @param {ResponseRedirect[]|Set<ResponseRedirect>} redirects List of response objects
   * @return {Boolean} True if redirect is into the same place as already visited.
   */
  static isRedirectLoop(location, redirects) {
    if (redirects) {
      let index = -1;
      let i = 0;
      for (const item of redirects) {
        if (item.url === location) {
          index = i;
          break;
        }
        i++;
      }
      if (index !== -1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Processes redirection location
   * @param {string} location Redirect location
   * @param {string} requestUrl Request url
   * @return {string|undefined} Redirect location
   */
  static getRedirectLocation(location, requestUrl) {
    // https://github.com/jarrodek/socket-fetch/issues/5
    try {
      // eslint-disable-next-line no-new
      new URL(location);
    } catch (e) {
      try {
        location = new URL(location, requestUrl).toString();
      } catch (_) {
        return;
      }
    }
    return location;
  }
}
