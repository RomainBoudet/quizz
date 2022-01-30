const {
  User,
  Score
} = require('../models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jsonwebtoken = require('jsonwebtoken');
const {
  sendEmail
} = require('../service/sendMail');

const validator = require('validator');

const express = require('express');
const app = express();

const userController = {

  loginForm: (req, res) => {
    res.render('login');
  },


  handleLoginForm: async (req, res) => {
    try {
      //on cherche à identifier le user à partir de son email
      const email = req.body.email;
      const user = await User.findOne({
        where: {
          email
        }
      })

      //si aucun user touvé avec cet email => message d'erreur
      if (!user) {
        return res.render('login', {
          error: 'Email ou mot de passe incorrect'
        });
      }


      //le user avec cet email existe, on vérifie son mot de passe en comparant :
      //- la version en clair saisie dans le formulaire
      //- la version hachée stockée en BDD
      //bcrypt est capable de déterminer si les 2 version du mot de passe correcpondent
      const validPwd = bcrypt.compareSync(req.body.password, user.password);

      if (!validPwd) {
        //la vérification a échoué, on envoie un message d'erreur
        return res.render('login', {
          error: 'Email ou mot de passe incorrect'
        });
      }


      //le user existe et s'est correctement identifié, on stocke les infos qui vont bien dans la session

      req.session.user = {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role
      };

      if (req.body.remember) {
        //l'utilisateur a coché la case 'se souvenir de moi'
        //on ajoute une heiure de validité à sa session
        //il peut ainsi quitter son navigateur et revenir sur la page, il devrait rester connecté
        //on indique en date d'expiration la date courante + une heure (en millisecondes)
        req.session.cookie.expires = new Date(Date.now() + 3600000);
      }

      res.redirect('/');
    } catch (error) {
      res.status(500).end();
      console.log(error);
    }

  },

  logout: (req, res) => {
    //on reset des infos du user en session
    req.session.user = false;
    //on redirige sur la page d'accueil
    res.redirect('/');
  },

  //on envoie le formulaire d'inscription ejs en get a la bonne route définie dans le router
  signupForm: (req, res) => {

    res.render('signup')

  },

  //! on traite le formulaire et on ajoute un user en BDD


  handleSignupForm: async (req, res) => {
    try {

      //on checke si un utilisateur existe déjà avec cet email
      const user = await User.findOne({
        where: {
          email: req.body.email
        }
      });
      if (user) {
        //il y a déjà un utilisateur avec cet email, on envoie une erreur
        return res.render('signup', {
          error: 'Un utilisateur avec cet email existe déjà'
        });
      }
      //on rechecke que l'email a un format valide
      if (!validator.isEmail(req.body.email)) {
        //le format de l'email est incorrect
        return res.render('signup', {
          error: 'Le format de l\'email est incorrect'
        });
      }
      //on checke si le password et la vérif sont bien identiques
      if (req.body.password !== req.body.passwordConfirm) {
        return res.render('signup', {
          errorMdp: 'La confirmation du mot de passe est incorrecte'
        });
      }

      // test mot de passe sup sécurisé.
      const regex = /^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*])[\w!@#$%^&*]{8,}$/;
      if (!regex.test(req.body.password)) {
        return res.render('signup', {
          errorMdpLength: 'Le format de votre mot de passe est incorrect : Il doit contenir au minimum 8 caractéres avec minimum, un chiffre, une lettre majuscule, une lettre minuscule et un carctére spécial parmis : ! @ # $% ^ & *'
        });
      }


      //on hache le password
      const hashedPwd = bcrypt.hashSync(req.body.password, 10)
      console.log(req.body.password, 'est devenu', hashedPwd);
      //on inscrit le nouveau user en BDD



      //on inscrit le nouveau user en BDD
      await User.create({
        email: req.body.email,
        password: hashedPwd,
        lastname: req.body.lastname,
        firstname: req.body.firstname
      });
      res.redirect('/login');
    } catch (error) {
      res.status(500).end();
      console.trace(error);
    }
  },

  profilePage: async (req, res) => {

    try {
      if (!req.session.user) {
        return res.redirect('/login');
      }

      // On récupére les données de chaque utilisateur et nottament les éssai et quizz répondu avec leur SCORE.
      // On boucle dessus, et on les affiche !
      const scores = await Score.findAll({
        where: {
          user_id: req.session.user.id,
        },
        order: ['quizz'],
        include: {
          association: 'quizzes'
        }
      });


      //https://sequelize.org/master/manual/model-querying-basics.html

      res.render('profile', {
        user: req.session.user,
        scores
      });
    } catch (error) {
      res.status(500).end();
      console.trace(err);
    }

  },

  resetEmail: (req, res) => {
    res.render('reset_email');
  },


  handleEmail: async (req, res) => {
    try {

      const {
        email
      } = req.body;

      // Une premiére vérification de l'email envoyé
      if (!validator.isEmail(email)) {
        console.log("le format de l'email ne convient pas au validator")
        return res.render('reset_email', {
          error: "Le format de votre email est incorrect."
        });
      }


      // Une seconde pour s'assurer qu'il appartient bien a quelqu'un ! 
      const user = await User.findOne({
        where: {
          email
        }
      });
      // je dois réupérer le mot de passe, prénbom nom de famille et date de création 

      if (typeof user.id === undefined) {
        console.log(`l'email ${email} n'existe pas en BDD !`);
        return res.render('reset_email', {
          error: "Le format de votre email est incorrect."
        });
      }

      // Je construit un secret dynamique de déchiffrage du token !  => Pour rendre le lien unique est invalide a la seconde où l'utilisateur rentre un nouveau password, je prend son hash existant que je concaténe a sa date d'inscription pour en faire la clé secrete du token !
      // Ainsi lorsque l'utilisateur met à jour son mot de passe, nous remplacerons l'ancien hachage par le nouveau, et personne ne pourra plus accéder à la clé secrète qui aura disparu !!
      //Avec la combinaison du hachage du mot de passe de l'utilisateur et de la createdAtdate, le JWT devient un jeton à usage unique, car une fois que l'utilisateur a changé son mot de passe, les appels successifs à cette route généreront un nouveau hachage de mot de passe, et viendront ainsi invalider la clé secrète qui référence le mot de passe .

      // mais pourquoi doubler avec sa date d'inscription => cela permet de garantir que si le mot de passe de l'utilisateur était la cible d'une attaque précédente (sur un autre site web ou l'utilisateur a mis le même password), la date de création de l'utilisateur rendra la clé secrète unique à partir du mot de passe potentiellement divulgué. Même si l'attaquant a craké le code de notre utilisateur, comment pourra-t'il savoir la date, jusqu'a la seconde précise, de création du compte de notre l'utilisateur  ? Bon chance.... 😝 !! 

      const secret = `${user.password}_${user.createddate}`
      // on génére un new token aprés les vérif de base :

      const jwtOptions = {
        issuer: `${user.firstname} ${user.lastname} ${user.email}`,
        audience: 'envoiresetpwd',
        algorithm: 'HS512',
        expiresIn: '1h' // si l'utilisateur ne valide pas un new password dans l'heure, le token sera invalide.
      };

      const jwtContent = {
        userId: `${user.id}`,
        jti: user.id + "_" + crypto.randomBytes(9).toString('base64'),

      };

      const newToken = await jsonwebtoken.sign(jwtContent, secret, jwtOptions);
      console.log("newToken =>", newToken);
      console.log("app.get('env') ===========>>>> ",app.get('env'));

      let link;
      if (app.get('env') === 'production') { // Si la variable n'est pas spécifié dans le .env, Express retourne 'development' par défault !
        const host = `${process.env.HOSTSERVER}:${process.env.PORT}`;
        link = `https://${host}/reset_pwd?userId=${user.id}&token=${newToken}`;
      } else {
      const host = req.get('host');
       link = `http://${host}/reset_pwd?userId=${user.id}&token=${newToken}`;
      };

      contexte = {
        nom: user.lastname,
        prenom: user.firstname,
        email,
        link,
      }
      const emailSend = email;
      const text = `Bonjour ${user.firstname} ${user.lastname}, Vous souhaitez réinitialiser votre mot de passe du site The quiz. Merci de cliquer sur le lien pour changer votre mot de passe.
        ${link}.`;
      const template = 'resetEmail';
      const subject = "Renouvellement de votre mot de passe sur le site The Quiz.";
      const infoEmail = await sendEmail(emailSend, subject, contexte, text, template);

      //console.log("infoEmail ====== ", infoEmail);

      if (typeof infoEmail === undefined) {
        return res.render('reset_email', {
          error: "Une érreur est survenue, merci de réessayer."
        });
      } else {
        return res.render('reset_email', {
          info: "Un email vous a bien été envoyé pour renouveller vote mot de passe. Vous pouvez fermer cette page et cliquer sur le lien envoyé."
        });
      }


    } catch (error) {
      res.status(500).end();
      console.trace(error);

    }


  },

  resetPwd: async (req, res) => {

    try {
      // je récupére sur cette route les infos en query, le user id et le token ! Je m'assure de l'identité du user et de la validité du token !

      const {
        userId,
        token
      } = req.query;

      // je m'assure de l'identité de l'utilisateur en déchiffrant le token avec la clé dynamique crée dans la méthode new_pwd. 

      const userInDb = await User.findByPk(userId);

      // premiere vérif, je vérifis l'id dans la query
      if (typeof userInDb.id === 'undefined') {
        //console.log("Bonjour, c'est gentil d'être passé mais votre identité n'a pas été reconnu 🤨")
        return res.render('forbiden', {
          info: "Bonjour, c'est gentil d'être passé mais votre identité n'a pas été reconnu 🤨. Vous pouvez fermer cette page."
        })
      }

      // Je reconstitue ma clé secrete pour décoder le token.
      const secret = `${userInDb.password}_${userInDb.createddate}`

      await jsonwebtoken.verify(token, secret, {
        audience: 'envoiresetpwd',
        issuer: `${userInDb.firstname} ${userInDb.lastname} ${userInDb.email}`
      }, function (err, decoded) {

        if (err) {
          console.log("La validation de l'identité a échoué : le token émis ne correspond pas au token déchiffré !")
          return res.render('forbiden', {
            error: "Bonjour, c'est gentil d'être passé mais votre identité n'a pas été reconnu 🤨. Vous pouvez désormais fermer cette page."
          })
        }
        return decoded
      });

      // je recréer un JWT qui sera vérifier au retour du formulaire
      const jwtOptions = {
        issuer: `${userInDb.firstname} ${userInDb.lastname} ${userInDb.email}`,
        audience: 'handleResetPwd',
        algorithm: 'HS512',
        expiresIn: '1h' // si l'utilisateur ne valide pas un new password dans l'heure, le token sera invalide.
      };

      const jwtContent = {
        userId: `${userInDb.id}`,
        jti: userInDb.id + "_" + crypto.randomBytes(9).toString('base64'),

      };

      const newToken = await jsonwebtoken.sign(jwtContent, secret, jwtOptions);
      console.log("newToken =>", newToken);

      const link = `/reset_pwd?userId=${userInDb.id}&token=${newToken}`;

      return res.render('reset_pwd', {
        link
      });

    } catch (error) {
      console.trace("Erreur dans la methode resetPwd du userController === ", error);
      res.status(500).end();
    }


  },


  handleResetPwd: async (req, res, err) => {
    try {
      const {
        userId,
        token
      } = req.query;

      const {
        newPasswordConfirm,
        newPassword,
      } = req.body;

      // ETAPE 1 avant de d'insérer quoi que ce soit en BDD ou de verifier que les passwords soient identiques

      const userInDb = await User.findByPk(userId);

      // premiere vérif, je vérifis l'id dans la query
      if (userInDb === null) {
        return res.render('forbiden', {
          error: "Bonjour, c'est gentil d'être passé mais votre identité n'a pas été reconnu 🤨. Vous pouvez fermer cette page."
        })
      };
      if (typeof userInDb.id === 'undefined') {
        return res.render('forbiden', {
          error: "Bonjour, c'est gentil d'être passé mais votre identité n'a pas été reconnu 🤨. Vous pouvez fermer cette page."
        })
      };

      // test mot de passe sup sécurisé.
      const regex = /^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*])[\w!@#$%^&*]{8,}$/;
      if (!regex.test(newPassword)) {
        return res.render('reset_pwd', {
          link: `/reset_pwd?userId=${userInDb.id}&token=${token}`,
          error: 'Le format de votre mot de passe est incorrect : Il doit contenir au minimum 8 caractéres avec minimum, un chiffre, une lettre majuscule, une lettre minuscule et un carctére spécial parmis : ! @ # $% ^ & *'
        });
      }
      //on check si le password et la vérif sont bien identiques, sinon on renvoit la vue
      if (newPassword !== newPasswordConfirm) {
        console.log("confirmation du nouveau mot de passe incorect")
        return res.render('reset_pwd', {
          link: `/reset_pwd?userId=${userInDb.id}&token=${token}`,
          error: "Votre mot de passe et sa confirmation doivent être identique."
        })
      };

      // si tout est ok, ETAPE 1 on verify le token.

      // Je reconstitue ma clé secrete pour décoder le token.
      const secret = `${userInDb.password}_${userInDb.createddate}`

      await jsonwebtoken.verify(token, secret, {
        audience: 'handleResetPwd',
        issuer: `${userInDb.firstname} ${userInDb.lastname} ${userInDb.email}`
      }, function (err, decoded) {

        if (err) {
          console.log("La validation de l'identité a échoué : le token émis ne correspond pas au token déchiffré !")
          return res.render('forbiden', {
            error: "Bonjour, c'est gentil d'être passé mais votre identité n'a pas été reconnu 🤨. Vous pouvez désormais fermer cette page."
          })
        }
        return decoded
      });

      //ETAPE 2 => hash, mise en BDD et renvoie message + info au Front !

      // On hash le mot de passe avant la mise en BDD :
      const password = await bcrypt.hash(newPassword, 10);


      // Update du password avec sequelize !
      await User.update({
        password: password,
      }, {
        where: {
          id: userInDb.id,
        }
      })

      console.log(`Le password de ${userInDb.firstname} ${userInDb.lastname} à été modifié avec succés !`);

      // ETAPE 3 :
      // On renvoit un petit mail a l'utilisateur pour lui confirmer le changement de mot de passe ! Histoire de bien flooder sa boite mail ! ça fait plaisir... 😁
      contexte = {
        nom: userInDb.lastname,
        prenom: userInDb.firstname,
      };

      const emailSend = userInDb.email;
      const text = `Bonjour ${userInDb.firstname} ${userInDb.lastname}, votre mot de passe du site The Quiz a bien été réinitialissé avec succés !`;
      const template = 'resetEmailSuccess';
      const subject = "Votre mot de passe sur le site The Quiz a bien été réinitialisé avec succés !";
      const infoEmail = await sendEmail(emailSend, subject, contexte, text, template);


      // Envoie d'une confirmation au front selon si l'email a bien été envoyé !

      if (typeof infoEmail === undefined) {
        return res.render('reset_success', {
          info: `Bonjour ${userInDb.firstname} ${userInDb.lastname}, votre mot de passe a été modifié avec succés !`
        });
      } else {
        return res.render('reset_success', {
          info: `Bonjour ${userInDb.firstname} ${userInDb.lastname}, votre mot de passe a été modifié avec succés ! Un email de confirmation vous a été envoyé.`
        });
      }


    } catch (error) {
      console.trace(
        'Erreur dans la méthode reset_pwd du userController :',
        error);
      res.status(500).end();
    }

  },

}


module.exports = userController;