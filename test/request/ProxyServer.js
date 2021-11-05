/* eslint-disable no-console */
/* eslint-disable no-shadow */
const ports = require('../getPort.js');
const http = require('http');
const https = require('https');
const net = require('net');
const path = require('path');
const fs = require('fs-extra');
const { URL } = require('url');

/** @typedef {import('net').Socket} Socket */

class ProxyServer {
  #requestHandler;

  #connectionHandler;

  #connectHandler;

  constructor() {
    /** @type number */
    this.httpPort = undefined;
    /** @type number */
    this.httpsPort = undefined;
    this.httpServer = undefined;
    this.httpsServer = undefined;
    /** @type Record<number, Socket> */
    this.socketMap = {};
    this.lastSocketKey = 0;
    this.#requestHandler = this.#requestCallback.bind(this);
    this.#connectionHandler = this.#connectionCallback.bind(this);
    this.#connectHandler = this.#connectCallback.bind(this);

    this.debug = false;
  }

  /**
   * @param {...any} messages
   */
  log(...messages) {
    if (!this.debug) {
      return;
    }
    const d = new Date();
    const hrs = d.getHours().toString().padStart(2, '0');
    const mns = d.getMinutes().toString().padStart(2, '0');
    const mss = d.getSeconds().toString().padStart(2, '0');
    const mls = d.getMilliseconds().toString().padStart(3, '0');
    const time = `${hrs}:${mns}:${mss}.${mls}`;
    messages.unshift('[PROXY]');
    messages.unshift('›');
    messages.unshift(time);
    // eslint-disable-next-line prefer-spread
    console.log.apply(console, messages);
  }

  async start() {
    await this.startHttp();
    await this.startHttps();
  }

  async stop() {
    this.disconnectAll();
    await this.stopHttp();
    await this.stopHttps();
  }

  async startHttp() {
    this.httpPort = await ports.getPorts({ port: ports.portNumbers(8000, 8100) });
    this.httpServer = http.createServer(); // (this.#requestHandler);
    this.httpServer.on('connection', this.#connectionHandler); // -> this.#connectionCallback
    this.httpServer.on('connect', this.#connectHandler); // -> this.#connectCallback
    this.httpServer.on('request', this.#requestHandler); // -> this.#requestCallback
    return new Promise((resolve) => {
      this.httpServer.listen(this.httpPort, () => resolve());
    });
  }

  async startHttps() {
    this.httpsPort = await ports.getPorts({ port: ports.portNumbers(8000, 8100) });
    const key = await fs.readFile(path.join('test', 'request', 'certs', 'privkey.pem'));
    const cert = await fs.readFile(path.join('test', 'request', 'certs', 'fullchain.pem'));
    return new Promise((resolve) => {
      const options = {
        key,
        cert,
      };
      this.httpsServer = https.createServer(options); // (options, this.#requestHandler);
      this.httpsServer.listen(this.httpsPort, () => resolve());
      this.httpsServer.on('connection', this.#connectionHandler); // -> this.#connectionCallback
      this.httpsServer.on('connect', this.#connectHandler); // -> this.#connectCallback
      this.httpsServer.on('request', this.#requestHandler); // -> this.#requestCallback/ -> this.#requestCallback
    });
  }

  async stopHttp() {
    return new Promise((resolve) => {
      this.httpServer.close(() => resolve());
    });
  }

  async stopHttps() {
    return new Promise((resolve) => {
      this.httpsServer.close(() => resolve());
    });
  }

  disconnectAll() {
    const { socketMap } = this;
    Object.keys(socketMap).forEach((socketKey) => {
      if (socketMap[socketKey].destroyed) {
        return;
      }
      socketMap[socketKey].destroy();
    });
  }

  /**
   * Callback for client connection.
   *
   * @param {http.IncomingMessage} req Node's request object
   * @param {http.ServerResponse} res Node's response object
   */
  #requestCallback(req, res) {
    if (req.method === 'CONNECT') {
      res.writeHead(500, {
        'Content-Type': 'application/json',
      });
      res.write(JSON.stringify({ error: 'should not handle this path.' }));
      res.end();
    } else {
      this.#proxy(req, res);
    }
  }

  /**
   * @param {http.IncomingMessage} request
   * @param {Socket} clientSocket
   * @param {Buffer} head
   */
  #connectCallback(request, clientSocket, head) {
    if (!this.#isAuthorizedProxy(request)) {
      const messages = [
        'HTTP/1.1 401 Unauthorized',
        `Date: ${new Date().toUTCString()}`,
        `Proxy-Authenticate: Basic realm="This proxy requires authentication"`,
        'Content-Type: application/json',
      ];
      const bodyBuffer = Buffer.from(JSON.stringify({ error: 'the proxy credentials are invalid' }));
      messages.push(`content-length: ${bodyBuffer.length}`);
      messages.push('');
      messages.push('');
      const headersBuffer = Buffer.from(messages.join('\r\n'));
      const message = Buffer.concat([headersBuffer, bodyBuffer, Buffer.from('\r\n\r\n')]);
      // console.log(message.toString('utf8'));
      clientSocket.write(message);
      clientSocket.end();
      return;
    }

    this.log('Opening an SSL tunnel');
    clientSocket.setKeepAlive(true);
    const { port, hostname } = new URL(`https://${request.url}`);
    const targetPort = Number(port || 443);
    this.log('Tunneling to', hostname, targetPort);
    clientSocket.pause();
    const serverSocket = net.connect(targetPort, hostname);
    clientSocket.on('data', (data) => {
      this.log('Tunneling Client -> Server:');
      this.log(`Buffer [${data.length}] bytes`);
      // data.toString().split('\n').forEach((line) => this.log(line));
    });
    serverSocket.on('data', (data) => {
      this.log('Tunneling Client <- Server:');
      this.log(`Buffer [${data.length}] bytes`);
      // data.toString().split('\n').forEach((line) => this.log(line));
    });
    serverSocket.once('end', () => {
      this.log('Target socket ended.');
    });
    serverSocket.once('error', (err) => {
      this.log('Server socket error', err);
    });
    serverSocket.once('connect', () => {
      this.log('Connected to the target through a tunnel.');
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
        'Proxy-agent: Test-Server\r\n' +
        '\r\n');
      if (head.length) {
        serverSocket.write(head);
      }
      clientSocket.pipe(serverSocket);
      serverSocket.pipe(clientSocket);
      clientSocket.resume();
    });
    serverSocket.once('close', () => {
      this.log('Server socket close');
      clientSocket.destroy();
      serverSocket.destroy();
    });
    clientSocket.on('end', () => {
      this.log('Client socket ended.');
    });
    serverSocket.setKeepAlive(true);
  }

  /**
   * Caches sockets after connection.
   * @param {Socket} socket
   */
  #connectionCallback(socket) {
    const socketKey = ++this.lastSocketKey;
    this.socketMap[socketKey] = socket;
    socket.on('close', () => {
      delete this.socketMap[socketKey];
    });
  }

  /**
   * Proxies streams.
   *
   * @param {http.IncomingMessage} req Node's request object
   * @param {http.ServerResponse} res Node's response object
   */
  #proxy(req, res) {
    const isSsl = req.url.startsWith('https:');
    const isHttp = req.url.startsWith('http:');
    if (!isSsl && !isHttp) {
      res.writeHead(400, {
        'Content-Type': 'application/json',
      });
      res.write(JSON.stringify({ error: 'the destination URL has no scheme' }));
      res.end();
      return;
    }
    if (isSsl) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.write(JSON.stringify({ error: 'Invalid request. Use tunneling instead.' }));
      res.end();
    } else {
      this.#proxyHttp(req, res);
    }
  }

  /**
   * @param {http.IncomingHttpHeaders} incoming
   * @return {http.OutgoingHttpHeaders}
   */
  #prepareHeaders(incoming) {
    const result = /** @type http.OutgoingHttpHeaders */ ({});
    const keys = Object.keys(incoming);
    const ignored = /** @type {(keyof http.IncomingHttpHeaders)[]} */ ([
      'proxy-authorization',
      'connection',
      'upgrade',
    ]);
    keys.forEach((key) => {
      const name = key.toLowerCase();
      if (ignored.includes(name)) {
        return;
      }
      result[key] = incoming[key];
    });
    result.via = '1.1 localhost';
    const proxyAuth = incoming['proxy-authorization'];
    if (proxyAuth) {
      result['x-proxy-authenticated'] = 'true';
    }
    return result;
  }

  /**
   * Proxies http streams.
   *
   * @param {http.IncomingMessage} sourceRequest Node's request object
   * @param {http.ServerResponse} sourceResponse Node's response object
   */
  #proxyHttp(sourceRequest, sourceResponse) {
    if (!this.#isAuthorizedProxy(sourceRequest)) {
      sourceResponse.writeHead(401, {
        'Content-Type': 'application/json',
      });
      sourceResponse.write(JSON.stringify({ error: 'the proxy credentials are invalid' }));
      sourceResponse.end();
      return;
    }
    const urlInfo = new URL(sourceRequest.url);
    const headers = this.#prepareHeaders(sourceRequest.headers);
    const options = /** @type http.RequestOptions */ ({
      method: sourceRequest.method,
      host: urlInfo.host,
      hostname: urlInfo.hostname,
      path: `${urlInfo.pathname}${urlInfo.search || ''}`,
      port: urlInfo.port || 80,
      protocol: urlInfo.protocol,
      headers,
    });
    const proxy = http.request(options, (targetResponse) => {
      sourceResponse.statusCode = targetResponse.statusCode;
      if (targetResponse.statusMessage) {
        sourceResponse.statusMessage = targetResponse.statusMessage;
      }
      for (let i = 0, len = targetResponse.rawHeaders.length; i < len; i+=2) {
        const name = targetResponse.rawHeaders[i];
        const value = targetResponse.rawHeaders[i + 1];
        sourceResponse.setHeader(name, value);
      }
      targetResponse.on('data', (data) => {
        sourceResponse.write(data);
      });
      targetResponse.on('end', () => {
        sourceResponse.end();
      });
    });
    sourceRequest.on('data', (data) => {
      proxy.write(data);
    });
    if (sourceRequest.readableEnded) {
      proxy.end();
    } else {
      sourceRequest.once('end', () => {
        proxy.end();
      });
    }
    proxy.on('error', (err) => {
      // @ts-ignore
      if (err.code === 'ENOTFOUND') {
        sourceResponse.writeHead(404);
        sourceResponse.end();
      } else {
        sourceResponse.writeHead(500);
        sourceResponse.end();
      }
    });
  }

  /**
   * If present, it reads proxy authorization and checks with preconfigured values.
   *
   * @param {http.IncomingMessage} req Node's request object
   * @return {boolean} false when invalid authorization.
   */
  #isAuthorizedProxy(req) {
    const { headers } = req;
    const info = headers['proxy-authorization'];
    if (!info || !info.toLowerCase().startsWith('basic')) {
      return true;
    }
    try {
      const buff = Buffer.from(info.substr(6), 'base64');
      const text = buff.toString('ascii');
      const parts = text.split(':');
      const [username, password] = parts;
      return username === 'proxy-name' && password === 'proxy-password';
    } catch (e) {
      return false;
    }
  }
}

module.exports = ProxyServer;
