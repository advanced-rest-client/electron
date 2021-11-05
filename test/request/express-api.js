/* eslint-disable no-console */
// process.env.DEBUG = 'express:router';
const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs-extra');
const ports = require('../getPort.js');
const apiRouter = require('./express-routes/index.js');

/** @typedef {import('http').Server} Server */
/** @typedef {import('net').Socket} Socket */

class ExpressServer {
  constructor() {
    /** @type Server */
    this.httpServer = undefined;
    /** @type Server */
    this.httpsServer = undefined;
    /** @type Socket[] */
    this.httpSockets = [];
    /** @type Socket[] */
    this.httpsSockets = [];
    /** @type number */
    this.httpPort = undefined;
    /** @type number */
    this.httpsPort = undefined;

    const app = express();
    this.app = app;
    app.disable('etag');
    app.disable('x-powered-by');
    app.set('trust proxy', true);
    this.#setupRoutes();
  }

  #setupRoutes() {
    const { app } = this;
    app.use('/v1', apiRouter);
    app.get('/_ah/health', (req, res) => {
      res.status(200).send('ok');
    });
    // Basic 404 handler
    app.use((req, res) => {
      res.status(404).send('Not Found');
    });
  }

  async start() {
    await this.startHttp();
    await this.startHttps();
  }

  async stop() {
    await this.stopHttp();
    await this.stopHttps();
  }

  /**
   * @param {number=} port Optional port number to open. If not set a random port is selected.
   * @return {Promise<number>} The opened port number.
   */
  async startHttp(port) {
    this.httpPort = port || await ports.getPorts({ port: ports.portNumbers(8000, 8100) });
    return new Promise((resolve) => {
      this.httpServer = http.createServer(this.app);
      this.httpServer.listen(this.httpPort, () => resolve(this.httpPort));
      this.httpServer.on('connection', (socket) => {
        this.httpSockets.push(socket);
        socket.on('close', () => {
          const index = this.httpSockets.indexOf(socket);
          this.httpSockets.splice(index, 1);
        });
      });
    });
  }
  
  /**
   * @param {number=} port Optional port number to open. If not set a random port is selected.
   * @return {Promise<number>} The opened port number.
   */
  async startHttps(port) {
    this.httpsPort = port || await ports.getPorts({ port: ports.portNumbers(8000, 8100) });
    const key = await fs.readFile(path.join('test', 'request', 'certs', 'privkey.pem'));
    const cert = await fs.readFile(path.join('test', 'request', 'certs', 'fullchain.pem'));
    const options = {
      key,
      cert,
    };
    return new Promise((resolve) => {
      this.httpsServer = https.createServer(options, this.app);
      this.httpsServer.listen(this.httpsPort, () => resolve(this.httpsPort));
      this.httpServer.on('connection', (socket) => {
        this.httpsSockets.push(socket);
        socket.on('close', () => {
          const index = this.httpsSockets.indexOf(socket);
          this.httpsSockets.splice(index, 1);
        });
      });
    });
  }

  async stopHttp() {
    return new Promise((resolve) => {
      const { httpSockets, httpServer } = this;
      if (httpSockets.length) {
        console.error(`There are ${httpSockets.length} connections when closing the server`);
        httpSockets.forEach((s) => s.destroy());
      }
      httpServer.close(() => resolve());
    });
  }

  async stopHttps() {
    return new Promise((resolve) => {
      const { httpsSockets, httpsServer } = this;
      if (httpsSockets.length) {
        console.error(`There are ${httpsSockets.length} connections when closing the server`);
        httpsSockets.forEach((s) => s.destroy());
      }
      httpsServer.close(() => resolve());
    });
  }
}

module.exports.ExpressServer = ExpressServer;

// compatibility with old tests.
const instance = new ExpressServer();
/**
 * @param {number=} port Optional port number to open. If not set a random port is selected.
 * @return {Promise<number>} The opened port number.
 */
module.exports.startServer = (port) => instance.startHttp(port);

module.exports.stopServer = () => instance.stopHttp();
  
