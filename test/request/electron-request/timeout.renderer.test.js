/* eslint-disable import/extensions */
const assert = require('chai').assert;
const { ElectronRequest } = require('../../../renderer.js');
const { startServer, stopServer } = require('../express-api.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */
/** @typedef {import('../../../request/RequestOptions').Options} Options */

describe('Timeout test', () => {
  const httpPort = 8129;

  const requestId = 'test id';
  const requests = /** @type ArcBaseRequest[] */ ([{
    url: `http://localhost:${httpPort}/v1/delay/1000`,
    method: 'GET',
  }, {
    url: `http://localhost:${httpPort}/v1/delay/1000`,
    method: 'GET',
    config: {
      timeout: 20,
    },
  }]);

  const opts = /** @type Options */ ([{
    timeout: 60,
    followRedirects: false,
  }]);

  before(() => startServer(httpPort));

  after(() => stopServer());

  it('timeouts the request from the class options', (done) => {
    const request = new ElectronRequest(requests[0], requestId, opts[0]);
    request.once('load', (id, rsp) => done(new Error(`Should not load: ${rsp.payload.toString()}`)));
    request.once('error', () => done());
    request.send();
  });

  it('timeouts the request from request options', (done) => {
    const request = new ElectronRequest(requests[1], requestId);
    request.once('load', (id, rsp) => done(new Error(`Should not load: ${rsp.payload.toString()}`)));
    request.once('error', () => done());
    request.send();
  });

  it('has the id on the error', (done) => {
    const request = new ElectronRequest(requests[1], requestId);
    request.once('load', (id, rsp) => done(new Error(`Should not load: ${rsp.payload.toString()}`)));
    request.once('error', (err, id) => {
      assert.equal(id, requestId);
      done();
    });
    request.send();
  });
});
