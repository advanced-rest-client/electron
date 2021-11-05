const { RequestOptions } = require('../../../renderer.js');
const assert = require('chai').assert;

describe('RequestOptions', () => {
  describe('validateOptions()', () => {
    describe('_validateOptionsList()', () => {
      it('Will not set warning for valid options', () => {
        const options = new RequestOptions();
        options._validateOptionsList({
          validateCertificates: false,
          followRedirects: false,
          timeout: 20,
          logger: console,
          hosts: [{ from: 'a', to: 'b' }],
          sentMessageLimit: 12,
          nativeTransport: true,
          defaultAccept: 'application/json',
          defaultUserAgent: 'my-agent',
          clientCertificate: {
            cert: [{ data: 'test' }],
            key: [{ data: 'test' }],
            type: 'pem',
            name: 'test-cert',
          },
        });
        assert.lengthOf(options.validationWarnings, 0);
      });

      it('Sets warning for type mismatch', () => {
        const options = new RequestOptions();
        options._validateOptionsList({
          // @ts-ignore
          validateCertificates: 'false',
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Ignores "undefined" mismatch', () => {
        const options = new RequestOptions();
        options._validateOptionsList({
          sentMessageLimit: undefined,
        });
        assert.lengthOf(options.validationWarnings, 0);
      });

      it('Sets default value for type mismatch', () => {
        const options = new RequestOptions();
        options._validateOptionsList({
          // @ts-ignore
          validateCertificates: 'false',
        });
        assert.isFalse(options.validateCertificates);
      });

      it('Sets warning for unknown property', () => {
        const options = new RequestOptions();
        options._validateOptionsList({
          // @ts-ignore
          unknown: 1,
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Removes unknown property', () => {
        const options = new RequestOptions();
        options._validateOptionsList({
          // @ts-ignore
          unknown: 1,
        });
        // @ts-ignore
        assert.isUndefined(options.options);
      });
    });

    describe('_validateLogger()', () => {
      it('Should set warning for invalid object', () => {
        const options = new RequestOptions({
          // @ts-ignore
          logger: {},
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Should set warning when missing info method', () => {
        const options = new RequestOptions({
          logger: {
            log: () => {},
            // @ts-ignore
            warning: () => {},
            error: () => {},
          },
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Should set warning when missing log method', () => {
        const options = new RequestOptions({
          logger: {
            info: () => {},
            // @ts-ignore
            warning: () => {},
            error: () => {},
          },
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Should set warning when missing warning method', () => {
        const options = new RequestOptions({
          // @ts-ignore
          logger: {
            info: () => {},
            log: () => {},
            error: () => {},
          },
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Should set warning when missing error method', () => {
        const options = new RequestOptions({
          logger: {
            info: () => {},
            log: () => {},
            // @ts-ignore
            warning: () => {},
          },
        });
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Should not set warning when valid', () => {
        const options = new RequestOptions({
          // @ts-ignore
          logger: {
            info: () => {},
            log: () => {},
            warn: () => {},
            error: () => {},
          },
        });
        assert.lengthOf(options.validationWarnings, 0);
      });
    });
  });

  describe('_validateMessageLimit()', () => {
    it('Adds warning for negative message limit', () => {
      const options = new RequestOptions({
        sentMessageLimit: -1,
      });
      assert.lengthOf(options.validationWarnings, 1);
    });

    it('Sets default message limit', () => {
      const options = new RequestOptions({
        sentMessageLimit: -1,
      });
      assert.equal(options.sentMessageLimit, 2048);
    });

    it('Respects 0 value', () => {
      const options = new RequestOptions({
        sentMessageLimit: 0,
      });
      assert.equal(options.sentMessageLimit, 0);
    });
  });

  describe('_validateCertificate()', () => {
    let clientCertificate;
    beforeEach(() => {
      clientCertificate = {
        cert: [{ data: 'test' }],
        key: [{ data: 'test' }],
        type: 'pem',
      };
    });

    it('Adds warning for missing type', () => {
      delete clientCertificate.type;
      const options = new RequestOptions({
        clientCertificate,
      });
      assert.lengthOf(options.validationWarnings, 1);
    });

    it('Removes configuration when missing type', () => {
      delete clientCertificate.type;
      const options = new RequestOptions({
        clientCertificate,
      });
      assert.isUndefined(options.clientCertificate);
    });

    it('Adds warning for missing cert', () => {
      delete clientCertificate.cert;
      const options = new RequestOptions({
        clientCertificate,
      });
      assert.lengthOf(options.validationWarnings, 1);
    });

    it('Removes configuration when missing type', () => {
      delete clientCertificate.cert;
      const options = new RequestOptions({
        clientCertificate,
      });
      assert.isUndefined(options.clientCertificate);
    });
  });

  describe('_setDefaults()', () => {
    let options;

    before(() => {
      options = new RequestOptions();
    });

    it('validateCertificates is false', () => {
      assert.isFalse(options.validateCertificates);
    });

    it('followRedirects is true', () => {
      assert.isTrue(options.followRedirects);
    });

    it('sentMessageLimit is set', () => {
      assert.equal(options.sentMessageLimit, 2048);
    });

    it('defaultAccept is set', () => {
      assert.equal(options.defaultAccept, '*/*');
    });

    it('defaultUserAgent is set', () => {
      assert.equal(options.defaultUserAgent, 'advanced-rest-client');
    });
  });
});
