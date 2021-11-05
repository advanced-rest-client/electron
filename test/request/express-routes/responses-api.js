const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const BaseApi = require('./BaseApi.js');

const router = express.Router();
module.exports = router;

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */

class ImagesApiRoute extends BaseApi {
  /**
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async html(req, res) {
    const buff = await fs.readFile(path.join(__dirname, '..', 'resources', 'html.html'));
    res.setHeader('content-type', 'text/html; charset=UTF-8');
    res.send(buff);
  }

  /**
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async json(req, res) {
    const buff = await fs.readFile(path.join(__dirname, '..', 'resources', 'json.json'));
    res.setHeader('content-type', 'application/json');
    res.send(buff);
  }

  /**
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async xml(req, res) {
    const buff = await fs.readFile(path.join(__dirname, '..', 'resources', 'xml.xml'));
    res.setHeader('content-type', 'application/xml');
    res.send(buff);
  }

  /**
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async bytes(req, res) {
    const { params } = req;
    let size = Number(params.size);
    if (!size || Number.isNaN(size)) {
      size = 10;
    }
    const buf = crypto.randomBytes(size);
    res.setHeader('content-type', 'application/octet-stream');
    res.send(buf);
  }
}
const api = new ImagesApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.get('/html', cors(checkCorsFn), api.html.bind(api));
router.get('/json', cors(checkCorsFn), api.json.bind(api));
router.get('/xml', cors(checkCorsFn), api.xml.bind(api));
router.get('/bytes/:size', cors(checkCorsFn), api.bytes.bind(api));
