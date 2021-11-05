const express = require('express');
const cors = require('cors');
const querystring = require('querystring');
const BaseApi = require('./BaseApi.js');

const router = express.Router();
module.exports = router;

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */

/**
 * Tests query parameters.
 */
class RedirectsApiRoute extends BaseApi {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.items = [];
  }

  /**
   * Reads query params from the request and returns them as a string.
   * @param {Request} req
   * @return {string}
   */
  readQueryParams(req) {
    const { query } = req;
    // @ts-ignore
    return querystring.stringify(query);
  }

  /**
   * Redirects absolute URLs
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async absolute(req, res) {
    const { params } = req;
    const size = Number(params.n) - 1;
    let next;
    if (Number.isNaN(size) || size === 0) {
      next = `${req.protocol}://${req.headers.host}/v1/get`;
    } else {
      next = `${req.protocol}://${req.headers.host}/v1/redirect/absolute/${size}`;
    }
    const qp = this.readQueryParams(req);
    if (qp) {
      next += `?${qp}`;
    }
    res.setHeader('location', next);
    res.setHeader('connection', 'close');
    res.status(302);
    res.send({
      location: next,
      headers: req.headers,
    });
  }

  /**
   * Redirects relative URLs
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async relative(req, res) {
    const { params } = req;
    const size = Number(params.n) - 1;
    let next;
    if (Number.isNaN(size) || size === 0) {
      next = `/v1/get`;
    } else {
      next = `/v1/redirect/relative/${size}`;
    }
    const qp = this.readQueryParams(req);
    if (qp) {
      next += `?${qp}`;
    }
    res.setHeader('location', next);
    res.setHeader('connection', 'close');
    res.status(302);
    res.send({
      location: next,
      headers: req.headers,
    });
  }

  /**
   * Redirects relative URLs
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async relativePath(req, res) {
    const { params } = req;
    const size = Number(params.n) - 1;
    let next;
    if (Number.isNaN(size) || size === 0) {
      next = `/v1/get`;
    } else {
      next = `../relative/${size}`;
    }
    const qp = this.readQueryParams(req);
    if (qp) {
      next += `?${qp}`;
    }
    res.setHeader('location', next);
    res.setHeader('connection', 'close');
    res.status(302);
    res.send({
      location: next,
      headers: req.headers,
    });
  }
}
const api = new RedirectsApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.get('/absolute/:n', cors(checkCorsFn), api.absolute.bind(api));
router.get('/relative/:n', cors(checkCorsFn), api.relativePath.bind(api));
router.get('/relative-root/:n', cors(checkCorsFn), api.relative.bind(api));
