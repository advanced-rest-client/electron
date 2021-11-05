const express = require('express');
const testsRoute = require('./tests-api.js');
const queryPramsRoute = require('./query-params-api.js');
const headersRoute = require('./headers-api.js');
const getRoute = require('./get-api.js');
const postRoute = require('./post-api.js');
const redirectRoute = require('./redirects-api.js');
const imageRoute = require('./images-api.js');
const responsesRoute = require('./responses-api.js');
const compressionRoute = require('./compress-api.js');
const delayRoute = require('./DelayRoute.js');

const router = express.Router();
module.exports = router;

router.use('/tests', testsRoute);
router.use('/query-params', queryPramsRoute);
router.use('/headers', headersRoute);
router.use('/get', getRoute);
router.use('/post', postRoute);
router.use('/redirect', redirectRoute);
router.use('/image', imageRoute);
router.use('/response', responsesRoute);
router.use('/compression', compressionRoute);
router.use('/delay', delayRoute);
