const cors = require('cors');

/** @typedef {import('express').Response} Response */
/** @typedef {import('express').Request} Request */

/**
 * A base class for API routes
 */
class BaseApi {
  /**
   * @constructor
   */
  constructor() {
    this._processCors = this._processCors.bind(this);
  }

  /**
   * Sets CORS on all routes for `OPTIONS` HTTP method.
   * @param {Object} router Express app.
   */
  setCors(router) {
    router.options('*', cors(this._processCors));
  }

  /**
   * Shorthand function to register a route on this class.
   * @param {Object} router Express app.
   * @param {Array<Array<String>>} routes List of routes. Each route is an array
   * where:
   * - index `0` is the API route, eg, `/api/models/:modelId`
   * - index `1` is the function name to call
   * - index `2` is optional and describes HTTP method. Defaults to 'get'.
   * It must be lowercase.
   */
  wrapApi(router, routes) {
    for (let i = 0, len = routes.length; i < len; i++) {
      const route = routes[i];
      const method = route[2] || 'get';
      const clb = this[route[1]].bind(this);
      router[method](route[0], cors(this._processCors), clb);
    }
  }

  /**
   * Sends error to the client in a standardized way.
   * @param {Response} res HTTP response object
   * @param {String} message Error message to send.
   * @param {Number=} [status=400] HTTP status code, default to 400.
   */
  sendError(res, message, status = 400) {
    res.status(status).send({
      error: true,
      message,
    });
  }

  /**
   * Processes CORS request.
   * @param {Request} req
   * @param {Function} callback
   */
  _processCors(req, callback) {
    const whitelist = ['https://ci.advancedrestclient.com'];
    const origin = req.header('Origin');
    let corsOptions;
    if (!origin) {
      corsOptions = { origin: false };
    } else if (
      origin.indexOf('http://localhost:') === 0 ||
      origin.indexOf('http://127.0.0.1:') === 0
    ) {
      corsOptions = { origin: true };
    } else if (whitelist.indexOf(origin) !== -1) {
      corsOptions = { origin: true };
    }
    if (corsOptions) {
      // @ts-ignore
      corsOptions.credentials = true;
      // @ts-ignore
      corsOptions.allowedHeaders = ['Content-Type', 'Authorization'];
      // @ts-ignore
      corsOptions.origin = origin;
    }
    callback(null, corsOptions);
  }

  /**
   * Awaits a timeout.
   * @param {number=} [timeout=0]
   * @return {Promise}
   */
  async aTimeout(timeout = 0) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), timeout);
    });
  }

  /**
   * @param {Request} request
   * @return {Promise<Buffer>}
   */
  async readRequestBuffer(request) {
    return new Promise((resolve) => {
      const parts = [];
      request.on('data', (chunk) => {
        if (typeof chunk === 'string') {
          parts.push(Buffer.from(chunk));
        } else {
          parts.push(chunk);
        }
      });
      request.on('end', () => {
        resolve(Buffer.concat(parts));
      });
    });
  }
}
module.exports = BaseApi;
