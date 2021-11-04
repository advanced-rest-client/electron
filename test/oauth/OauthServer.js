const { OAuth2Server } = require('oauth2-mock-server');
const ports = require('../getPort.js');

const oauth2server = new OAuth2Server();

/**
 * @return {Promise<any>}
 */
module.exports.startServer = async function() {
  const port = await ports.getPorts({ port: ports.portNumbers(8000, 8100) });
  const jwtKey = await oauth2server.issuer.keys.generate('RS256');
  await oauth2server.start(port, 'localhost');
  return {
    port,
    jwtKey,
    issuer: oauth2server.issuer.url,
  };
};

/**
 * @return {Promise<void>}
 */
module.exports.stopServer = async function() {
  await oauth2server.stop();
};
