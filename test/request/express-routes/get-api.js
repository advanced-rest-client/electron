const express = require('express');
const cors = require('cors');
const BaseApi = require('./BaseApi.js');

const router = express.Router();
module.exports = router;

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */

/**
 * Tests query parameters.
 */
class GetApiRoute extends BaseApi {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.items = [];
  }

  /**
   * List headers
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async echoGet(req, res) {
    const { headers, query, originalUrl, baseUrl, cookies, hostname, method, params, path, ip, protocol, url } = req;
    const start = Date.now();
    await this.aTimeout(120);
    res.send({
      headers,
      query,
      originalUrl,
      baseUrl,
      cookies,
      hostname,
      method,
      params,
      path,
      ip,
      protocol,
      url,
      delay: Date.now() - start,
    });
  }

  /**
   * List headers
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async echoPost(req, res) {
    req.setEncoding('utf8');
    const { headers, query, originalUrl, baseUrl, cookies, hostname, method, params, path, ip, protocol, url } = req;
    const data = await this.readRequestBuffer(req);
    const start = Date.now();
    await this.aTimeout(120);
    res.send({
      headers,
      query,
      originalUrl,
      baseUrl,
      cookies,
      hostname,
      method,
      params,
      path,
      ip,
      protocol,
      url,
      delay: Date.now() - start,
      body: data.toString('utf8'),
    });
  }
}
const api = new GetApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.get('/', cors(checkCorsFn), api.echoGet.bind(api));
router.post('/', cors(checkCorsFn), api.echoPost.bind(api));
