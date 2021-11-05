const { assert } = require('chai');
const net = require('net');
const { BaseRequest } = require('../../../renderer.js');
const ExpressServer = require('../express-api.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */

describe('BaseRequest', () => {
  const expressPort = 8125;
  before(async () => {
    // await chunkedServer.startServer(httpPort, sslPort);
    await ExpressServer.startServer(expressPort);
  });

  after(async () => {
    // await chunkedServer.stopServer();
    await ExpressServer.stopServer();
  });

  describe('Aborting the request', () => {
    const id = 'test-id';
    const requestData = /** @type ArcBaseRequest */ ({
      method: 'GET',
      url: `http://localhost:${expressPort}/v1/headers`,
    });

    function setupSocket(base) {
      return new Promise((resolve, reject) => {
        const socket = new net.Socket({
          writable: true,
        });
        socket.connect(expressPort, 'localhost', () => {
          base.socket = socket;
          resolve();
        });
        socket.on('error', (e) => {
          reject(new Error('Unable to connect'));
        });
      });
    }

    it('sets aborted flag', () => {
      const base = new BaseRequest(requestData, id);
      base.abort();
      assert.isTrue(base.aborted);
    });

    it('destroys the socket', async () => {
      const base = new BaseRequest(requestData, id);
      await setupSocket(base);
      base.abort();
      assert.isUndefined(base.socket);
    });

    it('removes destroyed socket', async () => {
      const base = new BaseRequest(requestData, id);
      await setupSocket(base);
      base.socket.pause();
      base.socket.destroy();
      base.abort();
      assert.isUndefined(base.socket);
    });

    it('_decompress() results to undefined', async () => {
      const request = new BaseRequest(requestData, id);
      request.abort();
      const result = await request._decompress(Buffer.from('test'));
      assert.isUndefined(result);
    });

    it('_createResponse() results to undefined', async () => {
      const request = new BaseRequest(requestData, id);
      request.abort();
      const result = await request._createResponse();
      assert.isUndefined(result);
    });
  });
});
