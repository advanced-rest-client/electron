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
class PostApiRoute extends BaseApi {
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
  async echoProperties(req, res) {
    const { headers, query } = req;
    const body = await this.readRequestBuffer(req);
    res.send({ headers, query, body: body.toString('utf8') });
  }
}
const api = new PostApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.post('/', cors(checkCorsFn), api.echoProperties.bind(api));
