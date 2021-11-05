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
class DelayRoute extends BaseApi {
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
  async delay(req, res) {
    const { params } = req;
    let duration = Number(params.ms);
    if (Number.isNaN(duration)) {
      duration = 10;
    }
    await this.aTimeout(duration);
    res.send({ body: `Delayed for ${duration}ms.` });
  }
}
const api = new DelayRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.get('/:ms', cors(checkCorsFn), api.delay.bind(api));
