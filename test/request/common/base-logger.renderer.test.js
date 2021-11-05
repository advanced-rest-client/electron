const assert = require('chai').assert;
const { BaseRequest } = require('../../../renderer.js');

/** @typedef {import('@advanced-rest-client/events').ArcRequest.ArcBaseRequest} ArcBaseRequest */

describe('BaseRequest - logger', () => {
  const id = 'test-id';
  const requestData = /** @type ArcBaseRequest */ ({
    method: 'GET',
    url: 'https://domain.com',
  });

  it('Sets default logger', () => {
    const base = new BaseRequest(requestData, id);
    const result = base.__setupLogger({});
    assert.typeOf(result, 'object');
    // @ts-ignore
    assert.typeOf(result.info, 'function');
    // @ts-ignore
    assert.typeOf(result.log, 'function');
    // @ts-ignore
    assert.typeOf(result.warn, 'function');
    // @ts-ignore
    assert.typeOf(result.error, 'function');
  });

  it('Sets passed logger option', () => {
    const base = new BaseRequest(requestData, id);
    const result = base.__setupLogger({
      logger: console,
    });
    assert.isTrue(result === console);
  });
});
