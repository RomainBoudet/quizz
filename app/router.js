const express = require('express');
const router = express.Router();
const app = express();
const path = require('path');

const mainController = require('./controllers/mainController');
const userController = require('./controllers/userController');
const quizController = require('./controllers/quizController');
const tagController = require('./controllers/tagController');
const twoFAController = require('./controllers/twoFAController');
const resetPassController = require('./controllers/resetPassController');



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

//! RÉINITIALISATION DU MOT DE PASSE 
// afficher le formulaire d'envoi d'un email ETAPE 1
router.get('/reset_email', resetPassController.resetEmail);// envoie le formulaire de l'email
router.post('/reset_email',clean, resetPassController.handleEmail); // envoie un email avec un lien
// Recoit le lien de l'email, vérifie la validité de la demande et enregistre le nouveau mot de passe ETAPE 2
router.get('/reset_pwd', resetPassController.resetPwd); // page de renvoit du lien qui recoit le token et l'user id en query et valide ainsi l'identité de l'utilisateur
router.post('/reset_pwd', cleanPassword, resetPassController.handleResetPwd); // traitement du nouveau password, enregistrement en BDD.

// faire un MW d'autorisation pour autoriser la route uniquement un user connecté !
//! 2FA
router.post('/profile', clean, twoFAController.generateSecret);
router.post('/2fa/validate', clean, twoFAController.validateSecret);
router.post('/2fa/validateAfterLogin', clean, twoFAController.validateSecretAfterLogin);

//on exporte le routeur pour l'utiliser dans index.js
module.exports = router;