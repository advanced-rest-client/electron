/** @typedef {import('../../renderer').SocketRequest} SocketRequest */
/** @typedef {import('../../renderer').ElectronRequest} ElectronRequest */
/** @typedef {import('@advanced-rest-client/events').ArcResponse.Response} ArcResponse */
/** @typedef {import('@advanced-rest-client/events').ArcRequest.TransportRequest} TransportRequest */

/**
 * @typedef UntilResponseResult
 * @property {string} id
 * @property {ArcResponse} response
 * @property {TransportRequest} transport
 */

/**
 * @param {SocketRequest|ElectronRequest} request
 * @return {Promise<UntilResponseResult>}
 */
async function untilResponse(request) {
  return new Promise((resolve, reject) => {
    request.once('error', (error) => {
      reject(error);
    });
    request.once('load', (id, response, transport) => {
      resolve({
        id,
        response,
        transport,
      });
    });
  });
}
/**
 * @param {SocketRequest|ElectronRequest} request
 * @return {Promise<any>}
 */
async function untilBody(request) {
  return new Promise((resolve, reject) => {
    request.once('error', (error) => {
      reject(error);
    });
    request.once('load', (id, response) => {
      const { payload } = response;
      const body = payload.toString('utf8');
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (e) {
        parsed = body;
      }
      resolve(parsed);
    });
  });
}

module.exports.untilResponse = untilResponse;
module.exports.untilBody = untilBody;
