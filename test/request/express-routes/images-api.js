const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
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
  async jpeg(req, res) {
    const buff = await fs.readFile(path.join(__dirname, '..', 'resources', 'jpeg.jpg'));
    res.setHeader('content-type', 'image/jpeg');
    res.send(buff);
  }

  /**
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async png(req, res) {
    const buff = await fs.readFile(path.join(__dirname, '..', 'resources', 'png.png'));
    res.setHeader('content-type', 'image/png');
    res.send(buff);
  }

  /**
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async svg(req, res) {
    const buff = await fs.readFile(path.join(__dirname, '..', 'resources', 'svg.svg'));
    res.setHeader('content-type', 'image/svg+xml');
    res.send(buff);
  }

  /**
   * @param {Request} req
   * @param {Response} res
   * @return {Promise}
   */
  async webp(req, res) {
    const buff = await fs.readFile(path.join(__dirname, '..', 'resources', 'webp.webp'));
    res.setHeader('content-type', 'image/webp');
    res.send(buff);
  }
}
const api = new ImagesApiRoute();
api.setCors(router);
const checkCorsFn = api._processCors;
router.get('/jpeg', cors(checkCorsFn), api.jpeg.bind(api));
router.get('/png', cors(checkCorsFn), api.png.bind(api));
router.get('/svg', cors(checkCorsFn), api.svg.bind(api));
router.get('/webp', cors(checkCorsFn), api.webp.bind(api));
