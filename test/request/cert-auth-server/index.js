/* eslint-disable no-sync */
const fs = require('fs');
const https = require('https');
const path = require('path');
const options = {
  key: fs.readFileSync(path.join('test', 'request', 'cert-auth-server', 'server_key.pem')),
  cert: fs.readFileSync(path.join('test', 'request', 'cert-auth-server', 'server_cert.pem')),
  requestCert: true,
  rejectUnauthorized: false,
  ca: [fs.readFileSync('./test/request/cert-auth-server/server_cert.pem')],
};

/** @typedef {import('http').IncomingMessage} IncomingMessage */
/** @typedef {import('http').ServerResponse} ServerResponse */
/** @typedef {import('net').Socket} Socket */
/** @typedef {import('tls').TLSSocket} TLSSocket */

const servers = {
  srv: undefined,
};
let lastSocketKey = 0;
const socketMap = {};
/**
 * @param {Socket} socket
 */
function handleConnection(socket) {
  const socketKey = ++lastSocketKey;
  socketMap[socketKey] = socket;
  socket.on('close', () => {
    delete socketMap[socketKey];
  });
}

/**
 * Callback for client connection.
 *
 * @param {IncomingMessage} req Node's request object
 * @param {ServerResponse} res Node's response object
 */
function connectedCallback(req, res) {
  const socket = /** @type TLSSocket */ (req.socket);
  const cert = socket.getPeerCertificate();
  let status;
  let message;
  if (socket.authorized) {
    status = 200;
    message = {
      authenticated: true,
      name: cert.subject.CN,
      issuer: cert.issuer.CN,
    };
  } else if (cert.subject) {
    status = 403;
    message = {
      authenticated: false,
      name: cert.subject.CN,
      issuer: cert.issuer.CN,
    };
  } else {
    status = 401;
    message = {
      authenticated: false,
    };
  }
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=UTF-8',
  });
  res.end(JSON.stringify(message));
}
/**
 * @param {Number} httpPort
 * @return {Promise}
 */
function startHttpServer(httpPort) {
  return new Promise((resolve) => {
    servers.srv = https.createServer(options, connectedCallback);
    servers.srv.listen(httpPort, () => {
      // console.log(`Server is ready on port ${httpPort}`);
      resolve();
    });
    servers.srv.on('connection', handleConnection);
  });
}

exports.startServer = async function(port) {
  await startHttpServer(port);
};
exports.stopServer = function() {
  Object.keys(socketMap).forEach((socketKey) => {
    if (socketMap[socketKey].destroyed) {
      return;
    }
    socketMap[socketKey].destroy();
  });
  return new Promise((resolve) => {
    servers.srv.close(() => resolve());
  });
};
