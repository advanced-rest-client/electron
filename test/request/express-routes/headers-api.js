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
class HeadersApiRoute extends BaseApi {
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
  async listHeaders(req, res) {
    const { headers } = req;
    res.send({ headers });
  }
}
const api = new HeadersApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.get('/', cors(checkCorsFn), api.listHeaders.bind(api));
