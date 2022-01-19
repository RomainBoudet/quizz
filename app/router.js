const express = require('express');
const router = express.Router();

const mainController = require('./controllers/mainController');
const userController = require('./controllers/userController');
const quizController = require('./controllers/quizController');




router.get('/', mainController.home);

//afficher le formulaire de login
router.get('/login', userController.loginForm);
router.post('/login', userController.handleLoginForm);

//aficher le formulaire d'inscription
router.get('/signup', userController.signupForm);
router.post('/signup', userController.handleSignupForm);

router.get('/disconnect', userController.logout);

router.get('/profile', userController.profilePage);

//deconnexion
router.get('/logout', userController.logout);

//afficher les détails d'un quiz
router.get('/quiz/:id', quizController.quizzPage);



//on exporte le routeur pour l'utiliser dans index.js
module.exports = router;