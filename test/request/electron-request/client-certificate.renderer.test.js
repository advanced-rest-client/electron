/* eslint-disable no-sync */
const server = require('../cert-auth-server/index.js');
const { ElectronRequest } = require('../../../renderer.js');
const fs = require('fs');
const { assert } = require('chai');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../../request/RequestOptions').Options} Options */

describe('ElectronRequest', () => {
  /**
   * Promise wrapper for the request.
   * @param {Object} request
   * @param {string} id
   * @param {Object} options
   * @return {Promise}
   */
  async function untilResponse(request, id, options) {
    return new Promise((resolve, reject) => {
      const instance = new ElectronRequest(request, id, options);
      instance.once('load', (requestId, response) => {
        resolve({
          id: requestId,
          response,
        });
      });
      instance.once('error', (e) => {
        reject(e);
      });
      instance.send().catch((e) => reject(e));
    });
  }
  /**
   * Convents string to Uint8Array.
   * @param {string} str
   * @return {Uint8Array}
   */
  function str2bf(str) {
    const binStr = atob(str);
    return new Uint8Array([...binStr].map((char) => char.charCodeAt(0)));
  }

  describe('Client certificate', () => {
    const httpPort = 8345;
    const id = 'test1';
    const requests = /** @type ArcBaseRequest[] */ ([{
      url: `https://localhost:${httpPort}/`,
      method: 'GET',
      headers: 'host: localhost',
    }]);

    const opts = /** @type Options[] */ ([{
      timeout: 10000,
    }, {
      clientCertificate: {
        cert: {
          data: fs.readFileSync('./test/request/cert-auth-server/alice_cert.pem', 'utf8'),
        },
        key: {
          data: fs.readFileSync('./test/request/cert-auth-server/alice_key.pem', 'utf8'),
        },
        type: 'pem',
      },
    }, {
      clientCertificate: {
        // has to be buffer
        cert: {
          data: fs.readFileSync('./test/request/cert-auth-server/alice.p12'),
          passphrase: '',
        },
        type: 'p12',
      },
    }, {
      clientCertificate: {
        // has to be buffer
        cert: {
          data: fs.readFileSync('./test/request/cert-auth-server/alice-password.p12'),
          passphrase: 'test',
        },
        type: 'p12',
      },
    }, {
      clientCertificate: {
        // has to be buffer
        cert: {
          data: fs.readFileSync('./test/request/cert-auth-server/bob.p12'),
          passphrase: 'test',
        },
        type: 'p12',
      },
    }]);

    before(async () => {
      await server.startServer(httpPort);
    });

    after(async () => {
      await server.stopServer();
    });

    it('makes connection without certificate', async () => {
      const data = await untilResponse(requests[0], id, opts[0]);
      const payloadString = data.response.payload.toString();
      const payload = JSON.parse(payloadString);
      assert.isFalse(payload.authenticated);
    });

    it('makes a connection with p12 client certificate', async () => {
      const data = await untilResponse(requests[0], id, opts[2]);
      const payloadString = data.response.payload.toString();
      const payload = JSON.parse(payloadString);
      assert.isTrue(payload.authenticated);
      assert.equal(payload.name, 'Alice');
      assert.equal(payload.issuer, 'localhost');
    });

    it('makes a connection with p12 client certificate and password', async () => {
      const data = await untilResponse(requests[0], id, opts[3]);
      const payloadString = data.response.payload.toString();
      const payload = JSON.parse(payloadString);
      assert.isTrue(payload.authenticated);
      assert.equal(payload.name, 'Alice');
      assert.equal(payload.issuer, 'localhost');
    });

    it('ignores untrusted valid certificates', async () => {
      const data = await untilResponse(requests[0], id, opts[4]);
      const payloadString = data.response.payload.toString();
      const payload = JSON.parse(payloadString);
      assert.isFalse(payload.authenticated);
      assert.equal(payload.name, 'Bob');
      // Bob has self-signed cert
      assert.equal(payload.issuer, 'Bob');
    });

    it('makes a connection with pem client certificate', async () => {
      const data = await untilResponse(requests[0], id, opts[1]);
      const payloadString = data.response.payload.toString();
      const payload = JSON.parse(payloadString);
      assert.isTrue(payload.authenticated);
      assert.equal(payload.name, 'Alice');
      assert.equal(payload.issuer, 'localhost');
    });

    it('uses Uint8Array for the certificate', async () => {
      const buff = fs.readFileSync('./test/request/cert-auth-server/alice.p12');
      const base64data = buff.toString('base64');
      const options = {
        clientCertificate: {
          // has to be buffer
          cert: {
            data: str2bf(base64data),
            passphrase: '',
          },
          type: 'p12',
        },
      };
      const data = await untilResponse(requests[0], id, options);
      const payloadString = data.response.payload.toString();
      const payload = JSON.parse(payloadString);
      assert.isTrue(payload.authenticated);
      assert.equal(payload.name, 'Alice');
      assert.equal(payload.issuer, 'localhost');
    });
  });
});
