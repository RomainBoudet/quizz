const express = require('express');
const router = express.Router();

const mainController = require('./controllers/mainController');
const userController = require('./controllers/userController');
const quizController = require('./controllers/quizController');
const tagController = require('./controllers/tagController');

const {
    cleanPassword,
    clean,
  } = require('./middlewares/sanitiz'); //cleanPassword => moins restrictif, pour laisser passer les caractéres spéciaux des password. 
  // clean => pour toutes les routes sans password (ou on n'a pas besoin de caractéres spéciaux..)
  


router.get('/', mainController.home);

//afficher le formulaire de login
router.get('/login', userController.loginForm);
router.post('/login', cleanPassword, userController.handleLoginForm);

//aficher le formulaire d'inscription
router.get('/signup', userController.signupForm);
router.post('/signup', cleanPassword, userController.handleSignupForm);

router.get('/disconnect', userController.logout);

router.get('/profile', userController.profilePage);

//deconnexion
router.get('/logout', userController.logout);

//afficher les détails d'un quiz
router.get('/quiz/:id(\\d+)', quizController.quizzPage);
router.post('/quiz/:id(\\d+)', clean, quizController.quizzAnswer);

//afficher tous les tags
router.get('/tags', tagController.tagsPage);

//Afficher les quizzes liés à un tag
router.get('/tag/:id(\\d+)', tagController.quizzesByTag );


//on exporte le routeur pour l'utiliser dans index.js
module.exports = router;