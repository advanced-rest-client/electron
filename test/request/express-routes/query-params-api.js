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
class QueryParamsApiRoute extends BaseApi {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.items = [];
  }

  /**
   * List tests
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async listParams(req, res) {
    const { query } = req;
    res.send({ params: { query } });
  }
}
const api = new QueryParamsApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.get('/', cors(checkCorsFn), api.listParams.bind(api));
