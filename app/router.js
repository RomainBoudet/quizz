const express = require('express');
const router = express.Router();

const mainController = require('./controllers/mainController');


router.get('/', mainController.home);


//on exporte le routeur pour l'utiliser dans index.js
module.exports = router;