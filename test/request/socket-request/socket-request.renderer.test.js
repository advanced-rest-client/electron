const assert = require('chai').assert;
require = require('esm')(module);
const { ArcHeaders } = require('@advanced-rest-client/base/src/lib/headers/ArcHeaders.js');
const { SocketRequest } = require('../../../renderer.js');
const chunkedServer = require('../chunked-server.js');
const ExpressServer = require('../express-api.js');
const { logger } = require('../dummy-logger.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../../request/RequestOptions').Options} Options */

describe('Socket request basics', () => {
  const httpPort = 8123;
  const sslPort = 8124;
  const expressPort = 8125;

  const requestId = 'test1';
  const requests = /** @type ArcBaseRequest[] */ ([
    // 0
    {
      url: `http://localhost:${httpPort}/api/endpoint?query=param`,
      method: 'GET',
      headers: 'Host: test.com\nContent-Length: 0',
      payload: 'abc',
    },
    // 1
    {
      url: `http://localhost:${httpPort}/api/endpoint?query=param`,
      method: 'POST',
      headers: 'content-type: text/plain',
      payload: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x0a, 0x74, 0x65, 0x73, 0x74]),
    },
    // 2
    {
      url: `http://localhost:${httpPort}/api/endpoint?query=param`,
      method: 'POST',
      headers: 'Host: test.com\nContent-Length: 12',
      payload: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x0a, 0x74, 0x65, 0x73, 0x74]),
    },
    // 3
    {
      url: `http://localhost:${httpPort}/api/endpoint?query=param`,
      method: 'GET',
      headers: 'Host: test.com',
      payload: '',
    },
    // 4
    {
      url: `http://localhost:${httpPort}/api/endpoint?query=param`,
      method: 'GET',
      headers: 'Host: test.com',
      auth: {
        method: 'ntlm',
        domain: 'domain.com',
        username: 'test',
        password: 'test',
      },
    },
    // 5
    {
      url: `http://localhost:${expressPort}/v1/headers`,
      method: 'GET',
      headers: 'x-test: true',
    },
    // 6
    {
      url: 'http://localhost:8080/api/endpoint?query=param#access_token=test',
      method: 'GET',
      headers: 'Host: test.com',
      auth: {
        method: 'ntlm',
        domain: 'domain.com',
        username: 'test',
        password: 'test',
      },
    },
    // 7
    {
      url: `http://localhost:${expressPort}/v1/query-params?a=b&c=d`,
      method: 'GET',
    },
    // 8
    {
      url: `http://localhost:${expressPort}/v1/headers`,
      method: 'GET',
      headers: 'x-test: true\naccept: application/json',
    },
    // 9
    {
      url: `http://localhost:${httpPort}/api/endpoint?query=param`,
      method: 'GET',
      headers: 'Host: test.com',
      authorization: [
        {
          enabled: true,
          type: 'ntlm',
          config: {
            domain: 'domain.com',
            username: 'test',
            password: 'test',
          },
        },
      ],
    },
    // 10
    {
      url: `http://localhost:${httpPort}/v1/query-params?va=test-paßword`,
      method: 'GET',
      headers: '',
    },
  ]);

  const opts = /** @type Options[] */ ([{
    timeout: 50000,
    followRedirects: false,
    hosts: [{
      from: 'domain.com',
      to: 'test.com',
    }],
    logger,
  }]);

  before(async () => {
    await chunkedServer.startServer(httpPort, sslPort);
    await ExpressServer.startServer(expressPort);
  });

  after(async () => {
    await chunkedServer.stopServer();
    await ExpressServer.stopServer();
  });

  describe('constructor', () => {
    let request = /** @type SocketRequest */ (null);
    before(() => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
    });

    it('arcRequest is set as a copy of the request object', () => {
      assert.ok(request.arcRequest, 'arcRequest is set');
      assert.isFalse(request.arcRequest === requests[0]);
    });

    it('Sets the aborted property', () => {
      assert.isFalse(request.aborted);
    });

    it('Sets empty stats property', () => {
      assert.typeOf(request.stats, 'object');
      assert.lengthOf(Object.keys(request.stats), 0);
    });

    it('Sets state property', () => {
      assert.equal(request.state, 0);
    });

    it('Sets hosts property', () => {
      assert.typeOf(request.hosts, 'array');
      assert.lengthOf(request.hosts, 1);
    });

    it('sets the uri property', () => {
      assert.typeOf(request.uri, 'url');
    });

    it('Sets hostHeader property', () => {
      assert.typeOf(request.hostHeader, 'string');
    });
  });

  describe('_connect()', () => {
    let request = /** @type SocketRequest */ (null);
    const host = 'localhost';

    before(() => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
    });

    it('returns HTTP server client', async () => {
      const client = await request._connect(httpPort, host);
      assert.typeOf(client, 'object');
      client.destroy();
    });

    it('Sets stats property', async () => {
      const client = await request._connect(httpPort, host);
      client.destroy();
      assert.typeOf(request.stats.connectionTime, 'number', 'connectionTime stat is set');
      assert.typeOf(request.stats.lookupTime, 'number', 'lookupTime stat is set');
    });
  });

  describe('_connectTls()', () => {
    let request = /** @type SocketRequest */ (null);
    const host = 'localhost';

    before(() => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
    });

    it('returns HTTP server client', async () => {
      const client = await request._connectTls(sslPort, host);
      assert.typeOf(client, 'object');
      client.destroy();
    });

    it('sets stats property', async () => {
      const client = await request._connectTls(sslPort, host);
      client.destroy();
      assert.typeOf(request.stats.connectionTime, 'number', 'connectionTime stat is set');
      assert.typeOf(request.stats.lookupTime, 'number', 'lookupTime stat is set');
      assert.typeOf(request.stats.secureStartTime, 'number', 'secureStartTime stat is set');
      assert.typeOf(request.stats.secureConnectedTime, 'number', 'secureConnectedTime stat is set');
    });
  });

  describe('connect()', () => {
    let request = /** @type SocketRequest */ (null);
    let createdClient;

    before(() => {
      request = new SocketRequest(requests[5], requestId, opts[0]);
    });

    afterEach(() => {
      if (createdClient) {
        createdClient.end();
        createdClient.destroy();
        createdClient = undefined;
      }
    });

    it('returns HTTP server client', async () => {
      const client = await request.connect();
      assert.typeOf(client, 'object');
      createdClient = client;
    });

    it('sets the socket property', async () => {
      const client = await request.connect();
      assert.isTrue(request.socket === client);
      createdClient = client;
    });
  });

  describe('_authorizeNtlm()', () => {
    let headers;
    let request = /** @type SocketRequest */ (null);
    beforeEach(() => {
      headers = new ArcHeaders();
      request = new SocketRequest(requests[4], requestId, opts[0]);
    });

    it('Adds authorization header', () => {
      // @ts-ignore
      request._authorizeNtlm(requests[4].auth, headers);
      assert.isTrue(headers.has('Authorization'));
    });

    it('Authorization is NTLM', () => {
      // @ts-ignore
      request._authorizeNtlm(requests[4].auth, headers);
      const value = headers.get('Authorization');
      assert.equal(value.indexOf('NTLM '), 0);
    });
  });

  describe('_prepareMessage()', () => {
    it('returns a buffer', () => {
      const request = new SocketRequest(requests[1], requestId, opts[0]);
      const result = request._prepareMessage(new ArcHeaders(''));
      assert.isTrue(result instanceof Buffer);
    });

    it('contains the status message', () => {
      const request = new SocketRequest(requests[1], requestId, opts[0]);
      const result = request._prepareMessage(new ArcHeaders('')).toString();
      assert.equal(result.split('\n')[0], 'POST /api/endpoint?query=param HTTP/1.1\r');
    });

    it('removes hash from the URL', () => {
      const request = new SocketRequest(requests[6], requestId, opts[0]);
      const result = request._prepareMessage(new ArcHeaders('')).toString();
      assert.equal(result.split('\n')[0],
        'GET /api/endpoint?query=param HTTP/1.1\r');
    });

    it('adds the Host header', () => {
      const request = new SocketRequest(requests[1], requestId, opts[0]);
      const result = request._prepareMessage(new ArcHeaders('')).toString();
      assert.equal(result.split('\n')[1], `Host: localhost:${httpPort}\r`);
    });

    it('adds the passed headers', () => {
      const request = new SocketRequest(requests[1], requestId, opts[0]);
      const result = request._prepareMessage(new ArcHeaders('content-type: text/plain')).toString();
      assert.equal(result.split('\n')[2], 'content-type: text/plain\r');
    });

    it('adds empty line after headers', () => {
      const request = new SocketRequest(requests[1], requestId, opts[0]);
      const result = request._prepareMessage(new ArcHeaders('content-type: text/plain')).toString();
      assert.equal(result.split('\n')[3], '\r');
    });

    it('adds payload message', () => {
      const request = new SocketRequest(requests[1], requestId, opts[0]);
      const headers = new ArcHeaders('content-type: text/plain');
      const result = request._prepareMessage(headers, Buffer.from(/** @type string */ (requests[1].payload))).toString();
      assert.equal(result.split('\n')[4], 'test');
      assert.equal(result.split('\n')[5], 'test');
    });

    it('encodes query parameters', () => {
      const request = new SocketRequest(requests[10], requestId, opts[0]);
      const result = request._prepareMessage(new ArcHeaders('')).toString();
      assert.include(result, 'GET /v1/query-params?va=test-pa%C3%9Fword HTTP/1.1');
    });
  });

  describe('prepareMessage()', () => {
    it('returns a Buffer', async () => {
      const request = new SocketRequest(requests[0], requestId, opts[0]);
      const result = await request.prepareMessage();
      assert.isTrue(result instanceof Buffer);
    });

    it('ignores payload for GET requests', async () => {
      const request = new SocketRequest(requests[0], requestId, opts[0]);
      const result = await request.prepareMessage();
      assert.lengthOf(result.toString().split('\n'), 5);
    });

    it('creates a message with the passed payload', async () => {
      const request = new SocketRequest(requests[1], requestId, opts[0]);
      const result = await request.prepareMessage();
      assert.lengthOf(result.toString().split('\n'), 7);
    });

    it('adds NTLM request headers from payload processing (legacy auth)', async () => {
      const request = new SocketRequest(requests[4], requestId, opts[0]);
      const result = await request.prepareMessage();
      assert.equal(request.arcRequest.headers.indexOf('NTLM '), -1, 'Headers are not altered');
      assert.isAbove(result.toString().indexOf('NTLM '), 0, 'Adds headers to body');
    });

    it('adds NTLM request headers from payload processing (new API)', async () => {
      const request = new SocketRequest(requests[9], requestId, opts[0]);
      const result = await request.prepareMessage();
      assert.equal(request.arcRequest.headers.indexOf('NTLM '), -1, 'Headers are not altered');
      assert.isAbove(result.toString().indexOf('NTLM '), 0, 'Adds headers to body');
    });

    it('adds content length header', async () => {
      const request = new SocketRequest(requests[1], requestId, opts[0]);
      const result = await request.prepareMessage();
      const search = request.transportRequest.headers.indexOf('content-length: 9');
      assert.isAbove(search, 0);
      assert.isAbove(result.toString().indexOf('content-length: 9'), 0);
    });

    it('adds the default headers', async () => {
      const request = new SocketRequest(requests[1], requestId, {
        defaultHeaders: true,
      });
      await request.prepareMessage();
      assert.include(request.transportRequest.headers, 'user-agent: advanced-rest-client', 'user-agent is set');
      assert.include(request.transportRequest.headers, 'accept: */*', 'accept is set');
    });
  });

  describe('writeMessage()', () => {
    let message;
    let request = /** @type SocketRequest */ (null);
    let createdClient;

    before(() => {
      let str = 'GET /api/endpoint?query=param HTTP/1.1\r\n';
      str += 'Host: localhost:8123\r\n';
      str += '\r\n';
      message = Buffer.from(str);
    });

    beforeEach(() => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
      return request.connect()
      .then((client) => {
        createdClient = client;
      });
    });

    afterEach(() => {
      if (createdClient) {
        createdClient.end();
        createdClient.destroy();
        createdClient = undefined;
      }
    });

    it('sets messageSent property on arcRequest', async () => {
      await request.writeMessage(message);
      assert.typeOf(request.transportRequest.httpMessage, 'string');
    });

    it('sets messageStart property on stats object', async () => {
      await request.writeMessage(message);
      assert.typeOf(request.stats.messageStart, 'number');
    });

    it('Sets sentTime property on stats object', async () => {
      await request.writeMessage(message);
      assert.typeOf(request.stats.sentTime, 'number');
    });

    it('Emits loadstart event', (done) => {
      request.once('loadstart', (id) => {
        assert.equal(id, requestId);
        done();
      });
      request.once('error', (e) => done(e));
      request.writeMessage(message);
    });
  });

  describe('_parseHeaders()', () => {
    let request = /** @type SocketRequest */ (null);
    let headersStr;
    let headersBuf;
    before(() => {
      request = new SocketRequest(requests[1], requestId, opts[0]);
      // @ts-ignore
      request.currentResponse = {};
      headersStr = 'Content-Type: application/test\r\n';
      headersStr += 'Content-Length: 123\r\n';
      headersStr += 'Transfer-Encoding: chunked\r\n';
      headersBuf = Buffer.from(headersStr);
    });

    it('Sets headers property', () => {
      request._parseHeaders(headersBuf);
      assert.typeOf(request.currentResponse.headers, 'string');
    });

    it('Headers contains 3 headers', () => {
      request._parseHeaders(headersBuf);
      const list = {};
      request.currentHeaders.forEach((value, name) => {
        list[name] = value;
      });
      assert.lengthOf(Object.keys(list), 3);
    });

    it('Sets _contentLength property', () => {
      request._parseHeaders(headersBuf);
      assert.equal(request._contentLength, 123);
    });

    it('Sets _chunked property', () => {
      request._parseHeaders(headersBuf);
      assert.isTrue(request._chunked);
    });

    it('Dispatches headersreceived event', (done) => {
      request.once('headersreceived', (id) => {
        assert.equal(id, requestId);
        done();
      });
      request.once('error', (e) => done(e));
      request._parseHeaders(headersBuf);
    });

    it('The headersreceived event contains returnValue', (done) => {
      request.once('headersreceived', (id, detail) => {
        // @ts-ignore
        assert.isTrue(detail.returnValue);
        done();
      });
      request.once('error', (e) => done(e));
      request._parseHeaders(headersBuf);
    });

    it('The headersreceived event contains value property', (done) => {
      request.once('headersreceived', (id, detail) => {
        // @ts-ignore
        assert.ok(detail.value);
        done();
      });
      request.once('error', (e) => done(e));
      request._parseHeaders(headersBuf);
    });

    it('Aborts the request when the event is canceled', () => {
      request.once('headersreceived', (id, detail) => {
        // @ts-ignore
        detail.returnValue = false;
      });
      request._parseHeaders(headersBuf);
      assert.isTrue(request.aborted);
    });
  });

  describe('Events', () => {
    let request = /** @type SocketRequest */ (null);
    beforeEach(() => {
      request = new SocketRequest(requests[1], requestId, opts[0]);
    });

    it('Dispatches "loadstart" event', (done) => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
      let called = false;
      request.once('load', () => {
        assert.isTrue(called);
        done();
      });
      request.once('loadstart', (id) => {
        assert.equal(id, requestId);
        called = true;
      });
      request.once('error', (error) => {
        done(error);
      });
      request.send()
      .catch((e) => done(e));
    });

    it('Dispatches "firstbyte" event', (done) => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
      let called = false;
      request.once('load', () => {
        assert.isTrue(called);
        done();
      });
      request.once('firstbyte', (id) => {
        assert.equal(id, requestId);
        called = true;
      });
      request.once('error', (error) => {
        done(error);
      });
      request.send()
      .catch((e) => done(e));
    });

    it('Dispatches "loadend" event', (done) => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
      let called = false;
      request.once('load', () => {
        assert.isTrue(called);
        done();
      });
      request.once('loadend', (id) => {
        assert.equal(id, requestId);
        called = true;
      });
      request.once('error', (error) => {
        done(error);
      });
      request.send()
      .catch((e) => done(e));
    });

    it('Dispatches "headersreceived" event', (done) => {
      request = new SocketRequest(requests[0], requestId, opts[0]);
      let called = false;
      request.once('load', () => {
        assert.isTrue(called);
        done();
      });
      request.once('headersreceived', (id) => {
        assert.equal(id, requestId);
        called = true;
      });
      request.once('error', (error) => {
        done(error);
      });
      request.send()
      .catch((e) => done(e));
    });
  });

  describe('Sending request parameters', () => {
    it('sends query parameters to the server', (done) => {
      const request = new SocketRequest(requests[7], requestId, opts[0]);
      request.once('load', (id, response) => {
        const payloadString = response.payload.toString();
        const payload = JSON.parse(payloadString);
        assert.deepEqual(payload.params.query, {
          a: 'b',
          c: 'd',
        });
        done();
      });
      request.once('error', (error) => done(error));
      request.send().catch((e) => done(e));
    });

    it('sends headers to the server', (done) => {
      const request = new SocketRequest(requests[8], requestId, opts[0]);
      request.once('load', (id, response) => {
        const payloadString = response.payload.toString();
        const payload = JSON.parse(payloadString);
        assert.deepEqual(payload.headers, {
          'accept': 'application/json',
          'host': `localhost:${expressPort}`,
          'x-test': 'true',
        });
        done();
      });
      request.once('error', (error) => done(error));
      request.send().catch((e) => done(e));
    });
  });

  describe('Request size', () => {
    it('has the request size value', (done) => {
      const request = new SocketRequest(requests[8], requestId, opts[0]);
      request.once('load', (id, response) => {
        try {
          assert.equal(response.size.request, 90);
        } catch (e) {
          done(e);
          return;
        }
        done();
      });
      request.once('error', (error) => done(error));
      request.send().catch((e) => done(e));
    });

    it('has the response size value', (done) => {
      const request = new SocketRequest(requests[8], requestId, opts[0]);
      request.once('load', (id, response) => {
        try {
          assert.equal(response.size.response, 81);
        } catch (e) {
          done(e);
          return;
        }
        done();
      });
      request.once('error', (error) => done(error));
      request.send().catch((e) => done(e));
    });
  });
});
