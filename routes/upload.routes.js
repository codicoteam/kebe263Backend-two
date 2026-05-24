const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const authenticate = require('../middleware/authenticate');

router.post('/sign', authenticate, uploadController.signUploadUrl);

module.exports = router;
