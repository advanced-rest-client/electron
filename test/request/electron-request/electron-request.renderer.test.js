/* eslint-disable no-shadow */
const { assert } = require('chai');
const { URL } = require('url');
const { ElectronRequest } = require('../../../renderer.js');
const { untilBody } = require('../Utils.js');
const { ExpressServer } = require('../express-api.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../../request/RequestOptions').Options} Options */

describe('Electron request', () => {
  const server = new ExpressServer();
  /** @type number */
  let httpPort;
  /** @type ArcBaseRequest[] */
  let requests;

  const jsonBody = JSON.stringify({ test: true, body: 'some value' });

  before(async () => {
    await server.startHttp();
    httpPort = server.httpPort;
    requests = /** @type ArcBaseRequest[] */ ([
      // 0
      {
        url: `http://localhost:${httpPort}/v1/get`,
        method: 'GET',
        headers: 'Host: test.com\nContent-Length: 0',
        payload: 'abc',
      },
      // 1
      {
        url: `http://localhost:${httpPort}/v1/post`,
        method: 'POST',
        headers: 'content-type: text/plain',
        payload: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x0a, 0x74, 0x65, 0x73, 0x74]),
      },
      // 2
      {
        url: 'https://google.com',
        method: 'GET',
        headers: 'Host: localhost\nContent-Length: 0',
        payload: 'abc',
      },
      // 3
      {
        url: 'https://api.com:5123/path?qp1=v1&qp2=v2#test',
        method: 'POST',
        headers: 'Host: localhost\nContent-Length: 3\nx-test: true',
        payload: 'abc',
      },
      // 4
      {
        url: `http://localhost:${httpPort}/v1/get?a=b&c=d`,
        method: 'GET',
        headers: 'x-test: true\naccept: application/json',
      },
      // 5
      {
        url: `http://localhost:${httpPort}/v1/get`,
        method: 'GET',
      },
      // 6
      {
        url: `http://localhost:${httpPort}/v1/post`,
        method: 'POST',
        headers: 'content-type: application/json',
        payload: jsonBody,
      },
    ]);
  });

  after(async () => {
    await server.stopHttp();
  });

  describe('Basic requests', () => {
    const id = 'test-id';
    const opts = /** @type Options[] */ ([
      {
        timeout: 9500,
        followRedirects: false,
        hosts: [{
          from: 'domain.com',
          to: 'test.com',
        }],
      },
    ]);

    describe('_connect()', () => {
      let request = /** @type ElectronRequest */ (null);
      before(() => {
        request = new ElectronRequest(requests[0], id, opts[0]);
      });

      it('returns request object', (done) => {
        const result = request._connect(Buffer.from('test'));
        assert.typeOf(result, 'object');
        result.once('close', () => done());
        result.once('error', () => done());
      });

      it('sets the startTime', (done) => {
        const result = request._connect(Buffer.from('test'));
        assert.typeOf(request.stats.startTime, 'number');
        result.once('close', () => done());
        result.once('error', () => done());
      });

      it('sets the messageStart', (done) => {
        const result = request._connect(Buffer.from('test'));
        assert.typeOf(request.stats.messageStart, 'number');
        result.once('close', () => done());
        result.once('error', () => done());
      });
    });

    describe('_connectHttps()', () => {
      let request = /** @type ElectronRequest */ (null);
      beforeEach(() => {
        request = new ElectronRequest(requests[2], id, opts[0]);
      });

      it('returns an object', (done) => {
        // @ts-ignore
        const result = request._connectHttps(undefined, request.uri);
        assert.typeOf(result, 'object');
        request.once('load', () => done());
        request.once('error', () => done());
      });

      it('Sets startTime', (done) => {
        // @ts-ignore
        request._connectHttps(undefined, request.uri);
        assert.typeOf(request.stats.startTime, 'number');
        request.once('load', () => done());
        request.once('error', () => done());
      });

      it('Sets messageStart', (done) => {
        // @ts-ignore
        request._connectHttps(undefined, request.uri);
        assert.typeOf(request.stats.messageStart, 'number');
        request.once('load', () => done());
        request.once('error', () => done());
      });
    });

    describe('_connectHttp()', () => {
      let request = /** @type ElectronRequest */ (null);
      before(() => {
        request = new ElectronRequest(requests[0], id, opts[0]);
      });

      it('Returns an object', (done) => {
        // @ts-ignore
        const result = request._connectHttp(undefined, request.uri);
        assert.typeOf(result, 'object');
        result.once('close', () => done());
        result.once('error', () => done());
      });

      it('Sets startTime', (done) => {
        // @ts-ignore
        const result = request._connectHttp(undefined, request.uri);
        assert.typeOf(request.stats.startTime, 'number');
        result.once('close', () => done());
        result.once('error', () => done());
      });

      it('Sets messageStart', (done) => {
        // @ts-ignore
        const result = request._connectHttp(undefined, request.uri);
        assert.typeOf(request.stats.messageStart, 'number');
        result.once('close', () => done());
        result.once('error', () => done());
      });
    });

    describe('_prepareMessage()', () => {
      it('Returns promise resolved to a Buffer', async () => {
        const request = new ElectronRequest(requests[1], id, opts[0]);
        const result = await request._prepareMessage();
        assert.isTrue(result instanceof Uint8Array);
      });

      it('Ignores payload for GET requests', async () => {
        const request = new ElectronRequest(requests[0], id, opts[0]);
        const result = await request._prepareMessage();
        assert.isUndefined(result);
      });

      it('Adds content length header', async () => {
        const request = new ElectronRequest(requests[1], id, opts[0]);
        await request._prepareMessage();
        const search = request.arcRequest.headers.indexOf('content-length: 9');
        assert.isAbove(search, 0);
      });

      it('Adds default headers', async () => {
        const request = new ElectronRequest(requests[1], id, {
          defaultHeaders: true,
        });
        await request._prepareMessage();
        assert.include(request.arcRequest.headers, 'user-agent: advanced-rest-client', 'user-agent is set');
        assert.include(request.arcRequest.headers, 'accept: */*', 'accept is set');
      });
    });

    describe('_createGenericOptions()', () => {
      let request = /** @type ElectronRequest */ (null);
      before(() => {
        request = new ElectronRequest(requests[3], id, opts[0]);
      });

      it('Returns an object', () => {
        const uri = new URL(requests[3].url);
        const result = request._createGenericOptions(uri);
        assert.typeOf(result, 'object');
      });

      it('Sets protocol', () => {
        const uri = new URL(requests[3].url);
        const result = request._createGenericOptions(uri);
        assert.equal(result.protocol, 'https:');
      });

      it('Sets host', () => {
        const uri = new URL(requests[3].url);
        const result = request._createGenericOptions(uri);
        assert.equal(result.host, 'api.com');
      });

      it('Sets port', () => {
        const uri = new URL(requests[3].url);
        const result = request._createGenericOptions(uri);
        assert.equal(result.port, '5123');
      });

      it('Sets hash', () => {
        const uri = new URL(requests[3].url);
        const result = request._createGenericOptions(uri);
        assert.equal(result.hash, '#test');
      });

      it('Sets search parameters with path', () => {
        const uri = new URL(requests[3].url);
        const result = request._createGenericOptions(uri);
        assert.equal(result.path, '/path?qp1=v1&qp2=v2');
      });

      it('Sets method', () => {
        const uri = new URL(requests[3].url);
        const result = request._createGenericOptions(uri);
        assert.equal(result.method, 'POST');
      });

      it('Sets headers', () => {
        const uri = new URL(requests[3].url);
        const result = request._createGenericOptions(uri);
        assert.typeOf(result.headers, 'object');
      });

      it('Sets header #1', () => {
        const uri = new URL(requests[3].url);
        const result = request._createGenericOptions(uri);
        assert.equal(result.headers.Host, 'localhost');
      });

      it('Sets header #2', () => {
        const uri = new URL(requests[3].url);
        const result = request._createGenericOptions(uri);
        assert.equal(result.headers['Content-Length'], '3');
      });

      it('Sets header #3', () => {
        const uri = new URL(requests[3].url);
        const result = request._createGenericOptions(uri);
        assert.equal(result.headers['x-test'], 'true');
      });
    });

    describe('_addSslOptions()', () => {
      let request = /** @type ElectronRequest */ (null);
      let options;
      before(() => {
        request = new ElectronRequest(requests[3], id, opts[0]);
        options = {};
      });

      it('Sets HTTP agent', () => {
        request._addSslOptions(options);
        assert.typeOf(options.agent, 'object');
      });

      it('Adds SSL certificate ignore options', () => {
        request.opts.validateCertificates = true;
        request._addSslOptions(options);
        assert.typeOf(options.checkServerIdentity, 'function');
      });

      it('Adds SSL certificate validation options', () => {
        request.opts.validateCertificates = false;
        request._addSslOptions(options);
        assert.isFalse(options.rejectUnauthorized);
        assert.isFalse(options.requestOCSP);
      });
    });

    describe('Starts handlers', () => {
      let request = /** @type ElectronRequest */ (null);
      before(() => {
        request = new ElectronRequest(requests[3], id, opts[0]);
      });

      it('Sets lookupTime', () => {
        request._lookupHandler();
        assert.typeOf(request.stats.lookupTime, 'number');
      });

      it('Sets secureConnectedTime', () => {
        request._secureConnectHandler();
        assert.typeOf(request.stats.secureConnectedTime, 'number');
      });

      it('Sets secureConnectedTime', () => {
        request._connectHandler();
        assert.typeOf(request.stats.connectedTime, 'number');
      });

      it('Sets secureStartTime', () => {
        request._connectHandler();
        assert.typeOf(request.stats.secureStartTime, 'number');
      });

      it('Sets sentTime', () => {
        request._sendEndHandler();
        assert.typeOf(request.stats.sentTime, 'number');
      });

      it('Sets sentTime only once', (done) => {
        request._sendEndHandler();
        const t1 = request.stats.sentTime;
        setTimeout(() => {
          request._sendEndHandler();
          const t2 = request.stats.sentTime;
          assert.equal(t1, t2);
          done();
        });
      });
    });

    describe('Events', () => {
      let request = /** @type ElectronRequest */ (null);

      it('Dispatches "loadstart" event', (done) => {
        request = new ElectronRequest(requests[0], id, opts[0]);
        let called = false;
        request.once('load', () => {
          assert.isTrue(called);
          done();
        });
        request.once('loadstart', (rid) => {
          assert.equal(rid, id);
          called = true;
        });
        request.once('error', (error) => {
          done(error);
        });
        request.send().catch((e) => done(e));
      });

      it('Dispatches "firstbyte" event', (done) => {
        request = new ElectronRequest(requests[0], id, opts[0]);
        let called = false;
        request.once('load', () => {
          assert.isTrue(called);
          done();
        });
        request.once('firstbyte', (rid) => {
          assert.equal(rid, id);
          called = true;
        });
        request.once('error', (error) => {
          done(error);
        });
        request.send().catch((e) => done(e));
      });

      it('Dispatches "loadend" event', (done) => {
        request = new ElectronRequest(requests[0], id, opts[0]);
        let called = false;
        request.once('load', () => {
          assert.isTrue(called);
          done();
        });
        request.once('loadend', (rid) => {
          assert.equal(rid, id);
          called = true;
        });
        request.once('error', (error) => {
          done(error);
        });
        request.send().catch((e) => done(e));
      });

      it('Dispatches "headersreceived" event', (done) => {
        request = new ElectronRequest(requests[0], id, opts[0]);
        let called = false;
        request.once('load', () => {
          assert.isTrue(called);
          done();
        });
        request.once('headersreceived', (rid) => {
          assert.equal(rid, id);
          called = true;
        });
        request.once('error', (error) => {
          done(error);
        });
        request.send().catch((e) => done(e));
      });
    });

    describe('Sending request parameters', () => {
      it('sends query parameters to the server', (done) => {
        const request = new ElectronRequest(requests[4], id, opts[0]);
        request.once('load', (id, response) => {
          assert.ok(id, 'ID is set');
          const payloadString = response.payload.toString();
          const payload = JSON.parse(payloadString);
          assert.deepEqual(payload.query, { a: 'b', c: 'd' });
          done();
        });
        request.once('error', (error) => done(error));
        request.send().catch((e) => done(e));
      });

      it('Sends headers to the server', async () => {
        const request = new ElectronRequest(requests[4], id, opts[0]);
        await request.send();
        const response = await untilBody(request);
        const { headers } = response;
        assert.deepEqual(headers, {
          'x-test': 'true',
          'accept': 'application/json',
          'host': `localhost:${httpPort}`,
          'connection': 'close',
        });
      });

      it('adds the default headers', async () => {
        const options = { ...opts[0] };
        options.defaultHeaders = true;
        const request = new ElectronRequest(requests[5], id, options);
        await request.send();
        const response = await untilBody(request);
        const { headers } = response;
        assert.deepEqual(headers, {
          'user-agent': 'advanced-rest-client',
          'accept': '*/*',
          'host': `localhost:${httpPort}`,
          'connection': 'close',
        });
      });

      it('adds passed accept header value', async () => {
        const options = { ...opts[0] };
        options.defaultHeaders = true;
        options.defaultAccept = 'application/json';
        const request = new ElectronRequest(requests[5], id, options);
        await request.send();
        const response = await untilBody(request);
        const { headers } = response;
        assert.equal(headers.accept, 'application/json');
      });

      it('adds passed accept header value', async () => {
        const options = { ...opts[0] };
        options.defaultHeaders = true;
        options.defaultUserAgent = 'test-run';
        const request = new ElectronRequest(requests[5], id, options);
        await request.send();
        const response = await untilBody(request);
        const { headers } = response;
        assert.equal(headers['user-agent'], 'test-run');
      });

      it('adds content-length header when body is send', async () => {
        const request = new ElectronRequest(requests[6], id);
        await request.send();
        const response = await untilBody(request);
        const { headers } = response;
        assert.equal(headers['content-length'], '33');
      });

      it('sends the string body with the request', async () => {
        const request = new ElectronRequest(requests[6], id);
        await request.send();
        const response = await untilBody(request);
        const { body } = response;
        assert.deepEqual(body, jsonBody);
      });

      it('sends the buffer body with the request', async () => {
        const item = { ...requests[6] };
        // @ts-ignore
        item.payload = Buffer.from(item.payload);
        const request = new ElectronRequest(item, id);
        await request.send();
        const response = await untilBody(request);
        const { body } = response;
        assert.deepEqual(body, jsonBody);
      });

      it('sends the FormData body with the request', async () => {
        const item = { ...requests[6] };
        const fd = new FormData();
        fd.append('a', 'b');
        item.payload = fd;
        const request = new ElectronRequest(item, id);
        await request.send();
        const response = await untilBody(request);
        const { body } = response;
        assert.include(body, 'name="a"');
      });
    });
  });
});
