const express = require('express');
const cors = require('cors');
const BaseApi = require('./BaseApi.js');

const router = express.Router();
module.exports = router;

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */

/**
 * Some tests API route
 */
class TestApiRoute extends BaseApi {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.items = [];
  }

  /**
   * Inserts a new test
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async createTest(req, res) {
    const { body } = req;
    await this.aTimeout(10);
    this.items.push({
      id: this.items.length,
    });
    res.send({ body });
  }

  /**
   * List tests
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async listTest(req, res) {
    const { delay } = req.query;
    let delayTyped = Number(delay);
    if (Number.isNaN(delayTyped)) {
      delayTyped = 10;
    }
    await this.aTimeout(delayTyped);
    res.send({ body: this.items });
  }
}
const api = new TestApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.post('/', cors(checkCorsFn), api.createTest.bind(api));
router.get('/', cors(checkCorsFn), api.listTest.bind(api));
