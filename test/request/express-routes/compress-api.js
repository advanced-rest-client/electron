const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const shrinkRay = require('shrink-ray-current');
const BaseApi = require('./BaseApi.js');

const router = express.Router();
module.exports = router;

router.use(shrinkRay());

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */

class CompressApiRoute extends BaseApi {
  /**
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async brotli(req, res) {
    const buff = await fs.readFile(path.join(__dirname, '..', 'resources', 'json.json'));
    res.setHeader('content-type', 'application/json');
    res.send(buff);
  }

  /**
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async deflate(req, res) {
    const buff = await fs.readFile(path.join(__dirname, '..', 'resources', 'json.json'));
    res.setHeader('content-type', 'application/json');
    res.send(buff);
  }

  /**
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async gzip(req, res) {
    const buff = await fs.readFile(path.join(__dirname, '..', 'resources', 'json.json'));
    res.setHeader('content-type', 'application/json');
    res.send(buff);
  }
}
const api = new CompressApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.get('/brotli', cors(checkCorsFn), api.brotli.bind(api));
router.get('/deflate', cors(checkCorsFn), api.deflate.bind(api));
router.get('/gzip', cors(checkCorsFn), api.gzip.bind(api));
