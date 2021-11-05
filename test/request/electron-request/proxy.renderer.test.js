const { assert } = require('chai');
const { ElectronRequest } = require('../../../renderer.js');
const { untilResponse } = require('../Utils.js');
const ProxyServer = require('../ProxyServer.js');
const { ExpressServer } = require('../express-api.js');
const { logger } = require('../dummy-logger.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../../renderer').Options} Options */

describe('Proxying requests (electron request)', () => {
  const id = 'r-1';
  const httpOpts = /** @type Options */ ({
    logger,
    validateCertificates: false,
  });
  const httpsOpts = /** @type Options */ ({
    logger,
    validateCertificates: false,
  });
  const proxy = new ProxyServer();
  const server = new ExpressServer();
  /** @type string */
  let baseHttpHostname;
  /** @type string */
  let baseHttpsHostname;

  before(async () => {
    // proxy.debug = true;
    await proxy.start();
    await server.start();
    httpOpts.proxy = `127.0.0.1:${proxy.httpPort}`;
    httpsOpts.proxy = `https://127.0.0.1:${proxy.httpsPort}`;
    baseHttpHostname = `localhost:${server.httpPort}`;
    baseHttpsHostname = `localhost:${server.httpsPort}`;
  });

  after(async () => {
    await proxy.stop();
    await server.stop();
  });

  describe('http proxy', () => {
    it('reads from an HTTP server', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/get?a=b`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const request = new ElectronRequest(config, id, httpOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers.host, `${baseHttpHostname}`, 'sets the destination host header');
      // the definite proof that the request gone through the proxy, set by the proxy.
      assert.equal(body.headers.via, '1.1 localhost', 'sets the proxy header');
      assert.deepEqual(body.query, { a: 'b' }, 'passes the query parameters');
      assert.equal(body.method, 'GET', 'passes the method');
      assert.equal(body.protocol, 'http', 'uses the http protocol');

      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.isAtLeast(response.timings.connect, 0, 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.strictEqual(response.timings.dns, -1, 'has the timings.dns');
      assert.strictEqual(response.timings.ssl, -1, 'has the timings.ssl');
    });

    it('posts to an HTTP server', async () => {
      const payload = JSON.stringify({ test: true });
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/get?x=y`,
        method: 'POST',
        headers: `content-type: application/json\nx-custom: true`,
        payload,
      });
      const request = new ElectronRequest(config, id, httpOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers['content-type'], 'application/json', 'passes the content type');
      assert.equal(body.headers.host, `${baseHttpHostname}`, 'sets the destination host header');
      // the definite proof that the request gone through the proxy, set by the proxy.
      assert.equal(body.headers.via, '1.1 localhost', 'sets the proxy header');
      
      assert.deepEqual(body.query, { x: 'y' }, 'passes the query parameters');
      assert.equal(body.method, 'POST', 'passes the method');
      assert.equal(body.protocol, 'http', 'uses the http protocol');
      assert.equal(body.body, payload, 'passes the body');

      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.isAtLeast(response.timings.connect, 0, 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.strictEqual(response.timings.ssl, -1, 'has the timings.ssl');
    });

    it('reads from an HTTPS server', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `https://${baseHttpsHostname}/v1/get?o=p`,
        method: 'GET',
        headers: `x-custom: true`,
      });
      // config.url = 'https://httpbin.org/get?o=p';
      // httpOpts.proxy = '192.168.86.249:8118';
      const request = new ElectronRequest(config, id, httpOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');
      const { response } = info;

      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers.host, `${baseHttpsHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { o: 'p' }, 'passes the query parameters');
      assert.equal(body.method, 'GET', 'passes the method');
      assert.equal(body.protocol, 'https', 'uses the http protocol');
      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');

      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.typeOf(response.timings.connect, 'number', 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });

    it('posts to an HTTPS server', async () => {
      const payload = JSON.stringify({ test: true });
      const config = /** @type ArcBaseRequest */ ({
        url: `https://${baseHttpsHostname}/v1/get?o=p`,
        method: 'POST',
        headers: `content-type: application/json\nx-custom: true`,
        payload,
      });
      const request = new ElectronRequest(config, id, httpOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers['content-type'], 'application/json', 'passes the content type');
      assert.equal(body.headers.host, `${baseHttpsHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { o: 'p' }, 'passes the query parameters');
      assert.equal(body.method, 'POST', 'passes the method');
      assert.equal(body.protocol, 'https', 'uses the http protocol');
      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.equal(body.body, payload, 'passes the body');

      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.typeOf(response.timings.connect, 'number', 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });

    it('uses the proxy for redirects', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/redirect/relative/2`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const request = new ElectronRequest(config, id, httpOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');

      const { response } = info;
      assert.typeOf(response.redirects, 'array', 'has the redirects');
      assert.lengthOf(response.redirects, 2, 'has both redirects');
      const [redirect] = response.redirects;
      
      const bodyStr = redirect.response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);

      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers.host, `${baseHttpHostname}`, 'sets the destination host header');
      // the definite proof that the request gone through the proxy, set by the proxy.
      assert.equal(body.headers.via, '1.1 localhost', 'sets the proxy header');
    });

    it('authenticates with the proxy', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/get?a=b`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const localOptions = { ...httpOpts, proxyUsername: 'proxy-name', proxyPassword: 'proxy-password' };
      const request = new ElectronRequest(config, id, localOptions);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      // this header is added by the proxy to the target request on the http connection
      // when the `proxy-authorization` is set and has valid values.
      assert.equal(body.headers['x-proxy-authenticated'], 'true', 'passes request headers');
    });

    it('handles proxy authorization errors', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/get?a=b`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const localOptions = { ...httpOpts, proxyUsername: 'some-name' };
      const request = new ElectronRequest(config, id, localOptions);
      await request.send();
      const info = await untilResponse(request);

      assert.ok(info, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 401, 'has the response status code');
      assert.strictEqual(response.statusText, 'Unauthorized', 'has the response status text');
      
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.error, 'the proxy credentials are invalid', 'has the error message');
    });
  });

  describe('https proxy', () => {
    it('reads from an HTTP server', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/get?a=b`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const request = new ElectronRequest(config, id, httpsOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');
      const { response } = info;

      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);

      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers.host, `${baseHttpHostname}`, 'sets the destination host header');
      // the definite proof that the request gone through the proxy, set by the proxy.
      assert.equal(body.headers.via, '1.1 localhost', 'sets the proxy header');
      assert.deepEqual(body.query, { a: 'b' }, 'passes the query parameters');
      assert.equal(body.method, 'GET', 'passes the method');
      assert.equal(body.protocol, 'http', 'uses the http protocol');

      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.isAtLeast(response.timings.connect, 0, 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.strictEqual(response.timings.dns, -1, 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });

    it('posts to an HTTP server', async () => {
      const payload = JSON.stringify({ test: true });
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/get?x=y`,
        method: 'POST',
        headers: `content-type: application/json\nx-custom: true`,
        payload,
      });
      const request = new ElectronRequest(config, id, httpsOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers['content-type'], 'application/json', 'passes the content type');
      assert.equal(body.headers.host, `${baseHttpHostname}`, 'sets the destination host header');
      // the definite proof that the request gone through the proxy, set by the proxy.
      assert.equal(body.headers.via, '1.1 localhost', 'sets the proxy header');

      assert.deepEqual(body.query, { x: 'y' }, 'passes the query parameters');
      assert.equal(body.method, 'POST', 'passes the method');
      assert.equal(body.protocol, 'http', 'uses the http protocol');
      assert.equal(body.body, payload, 'passes the body');

      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.isAtLeast(response.timings.connect, 0, 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });

    it('reads from an HTTPS server', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `https://${baseHttpsHostname}/v1/get?o=p`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const request = new ElectronRequest(config, id, httpsOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');
      const { response } = info;

      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);

      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers.host, `${baseHttpsHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { o: 'p' }, 'passes the query parameters');
      assert.equal(body.method, 'GET', 'passes the method');
      assert.equal(body.protocol, 'https', 'uses the http protocol');
      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');

      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.isAtLeast(response.timings.connect, 0, 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });

    it('posts to an HTTPS server', async () => {
      const payload = JSON.stringify({ test: true });
      const config = /** @type ArcBaseRequest */ ({
        url: `https://${baseHttpsHostname}/v1/get?o=p`,
        method: 'POST',
        headers: `content-type: application/json\nx-custom: true`,
        payload,
      });
      const request = new ElectronRequest(config, id, httpsOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');
      assert.isNotEmpty(response.headers, 'has the response headers');
      assert.ok(response.payload, 'has the payload');
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers['content-type'], 'application/json', 'passes the content type');
      assert.equal(body.headers.host, `${baseHttpsHostname}`, 'sets the destination host header');
      assert.deepEqual(body.query, { o: 'p' }, 'passes the query parameters');
      assert.equal(body.method, 'POST', 'passes the method');
      assert.equal(body.protocol, 'https', 'uses the http protocol');
      assert.isAtLeast(response.loadingTime, body.delay, 'has the loading time');
      assert.equal(body.body, payload, 'passes the body');

      assert.strictEqual(response.timings.blocked, 0, 'has the timings.blocked');
      assert.typeOf(response.timings.connect, 'number', 'has the timings.connect');
      assert.isAtLeast(response.timings.receive, 0, 'has the timings.receive');
      assert.isAtLeast(response.timings.send, 0, 'has the timings.send');
      assert.isAtLeast(response.loadingTime, response.timings.wait, 'has the timings.wait');
      assert.typeOf(response.timings.dns, 'number', 'has the timings.dns');
      assert.isAtLeast(response.timings.ssl, 0, 'has the timings.ssl');
    });

    it('uses the proxy for redirects', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `https://${baseHttpsHostname}/v1/redirect/relative/2`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const request = new ElectronRequest(config, id, httpOpts);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');

      const { response } = info;
      assert.typeOf(response.redirects, 'array', 'has the redirects');
      assert.lengthOf(response.redirects, 2, 'has both redirects');
      const [redirect] = response.redirects;
      
      const bodyStr = redirect.response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);

      assert.equal(body.headers['x-custom'], 'true', 'passes request headers');
      assert.equal(body.headers.host, `${baseHttpsHostname}`, 'sets the destination host header');
    });

    it('authenticates with the proxy', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `https://${baseHttpsHostname}/v1/get?a=b`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const localOptions = { ...httpOpts, proxyUsername: 'proxy-name', proxyPassword: 'proxy-password' };
      const request = new ElectronRequest(config, id, localOptions);
      await request.send();
      const info = await untilResponse(request);
      assert.ok(info, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 200, 'has the response status code');
      assert.strictEqual(response.statusText, 'OK', 'has the response status text');

      // there's no way to tell that the proxy server actually performed the authentication
      // because the connection is over SSL. Just the 200 is enough since we are controlling the server,
    });

    it('handles proxy authorization errors (HTTP)', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `http://${baseHttpHostname}/v1/get?a=b`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const localOptions = { ...httpOpts, proxyUsername: 'some-name' };
      const request = new ElectronRequest(config, id, localOptions);
      await request.send();
      const info = await untilResponse(request);

      assert.ok(info, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 401, 'has the response status code');
      assert.strictEqual(response.statusText, 'Unauthorized', 'has the response status text');
      
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.error, 'the proxy credentials are invalid', 'has the error message');
    });

    it('handles proxy authorization errors (HTTPS)', async () => {
      const config = /** @type ArcBaseRequest */ ({
        url: `https://${baseHttpsHostname}/v1/get?a=b`,
        method: 'GET',
        headers: 'x-custom: true',
      });
      const localOptions = { ...httpOpts, proxyUsername: 'some-name' };
      const request = new ElectronRequest(config, id, localOptions);
      await request.send();
      const info = await untilResponse(request);

      assert.ok(info, 'has the ARC response');
      const { response } = info;
      assert.strictEqual(response.status, 401, 'has the response status code');
      assert.strictEqual(response.statusText, 'Unauthorized', 'has the response status text');
      
      const bodyStr = response.payload.toString('utf8');
      const body = JSON.parse(bodyStr);
      
      assert.equal(body.error, 'the proxy credentials are invalid', 'has the error message');
    });
  });
});
