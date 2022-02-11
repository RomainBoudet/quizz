const {
  User,
} = require('../models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jsonwebtoken = require('jsonwebtoken');
const {
  sendEmail
} = require('../service/sendMail');

const {
  makeQrCode,
  sendTOTPCode,
  secret,
  email2fa,
} = require('../service/2fa');
const {
  scores
} = require('../service/scores');

const {
  formatLong
} = require('../service/date');

const validator = require('validator');
const speakeasy = require('speakeasy');

const userController = {

  loginForm: (req, res) => {
    return res.render('login');
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
      const validPwd = await bcrypt.compare(req.body.password, user.password);

      if (!validPwd) {
        //la vérification a échoué, on envoie un message d'erreur
        return res.render('login', {
          error: 'Email ou mot de passe incorrect'
        });
      };

      if (req.body.remember) {
        //l'utilisateur a coché la case 'se souvenir de moi'
        //on ajoute une heiure de validité à sa session
        //il peut ainsi quitter son navigateur et revenir sur la page, il devrait rester connecté
        //on indique en date d'expiration la date courante + une heure (en millisecondes)
        req.session.cookie.expires = new Date(Date.now() + 3600000);
      };

      console.log("user dans la méthode login ===> ", user);


      // Si le compte nécéssite une authentification a deux facteurs :
      if (validPwd && user.twofa === true) {

        // J'insère en session une info pour retrouver mon utilisateur aprés sa double authentification.
        req.session.theid = user.id;
        req.session.twofachoice = user.twofachoice;

        //Si l'authentification choisie passe par email => j'envoie l'email
        if (user.twofachoice === 2) {

          await email2fa(req, res, user.secret, user.email, user.firstname, user.lastname);
        }

        let isByMail;
        let isByApp;
        if (user.twofachoice === 1) {
          isByApp = true;
          isByMail = false;
        } else if (user.twofachoice === 2) {
          console.log("on passe ! ligne 96");
          isByApp = false;
          isByMail = true;
        }

        // on envoie la view pour saisir le code de l'app d'authentification
        return res.status(200).render('login_step2', {
          isByApp,
          isByMail,
        });

      };

      // J'insére en session les infos nécéssaires
      let twofaSession;
      if (user.twofa === true) {

        if (user.twofachoice === 2) {
          twofaSession = "Activée (via votre email)";
        }
        if (user.twofachoice === 1) {
          twofaSession = "Activée (via une application d'authentification)";
        }
        //on ne devrait jamais passer ici..

      } else if (user.twofa === false) {
        twofaSession = "Désactivée";
      };
      req.session.user = {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        statutTwoFA: twofaSession,
        twofachoice: user.twofachoice, // vaut null si pas de choix..

      };

      // si pas de2FA nécéssaire, on renvoie le menu principal
      return res.status(200).redirect('/');

    } catch (error) {
      console.log(error);
      return res.status(500).end();
    }

  },

  logout: (req, res) => {
    //on reset des infos du user en session
    req.session.user = false;
    //on redirige sur la page d'accueil
    return res.redirect('/');
  },

  //on envoie le formulaire d'inscription ejs en get a la bonne route définie dans le router
  signupForm: (req, res) => {

    return res.render('signup')

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
      console.trace(error);
      return res.status(500).end();
    }
  },

  profilePage: async (req, res) => {

    try {
      if (!req.session.user) {
        return res.redirect('/login');
      };

      //https://sequelize.org/master/manual/model-querying-basics.html

      res.render('profile', {
        user: req.session.user,
        scores: await scores(req, res),
      });
    } catch (error) {
      console.trace(err);
      return res.status(500).end();
    }

  },

  resetEmail: (req, res) => {
    return res.render('reset_email');
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

      let link;
      if (process.env.NODE_ENV === 'production') { // Si la variable n'est pas spécifié dans le .env, Express retourne 'development' par défault !
        const host = process.env.DOMAIN;
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
      console.trace(error);
      return res.status(500).end();

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
      return res.status(500).end();
    }


  },


  handleResetPwd: async (req, res) => {
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
      return res.status(500).end();
    }

  },

  generateSecret: async (req, res) => {
    try {
      // l'utilisateur doit pouvoir recevoir le code soit par mail, soit via l'app ! 
      // reçoit la valeur, 1 = scanner un qrcode via une application d'authentification, 2 = recevoir un code d'authentification par email
      console.log(parseInt(req.body.twofa, 10));
      // on vérifie que req.body est bien un booleén entre un et deux !
      if (req.body.twofa === undefined || !validator.isNumeric(req.body.twofa) || (parseInt(req.body.twofa, 10) > 3 && parseInt(req.body.twofa, 10) < 0)) {

        return res.render('profile', {
          error: 'Vous avez saisi une valeur incorrect dans le formulaire.',
          scores: await scores(req, res),
          user: req.session.user,
        });
      };

      req.body.twofa = parseInt(req.body.twofa, 10);

      //je met a jour en BDD le choix d'authentification
      await User.update({
        twofachoice: req.body.twofa,
      }, {
        where: {
          id: req.session.user.id,
        }
      });

      // je le stock également en session
      req.session.user.twofachoice = req.body.twofa;

      // Pour définir si dans ma vue je propose d'envoyer un nouveau qrcode ou un nouveau email...
      let isByMail;
      let isByApp;
      if (req.body.twofa === 1) {
        isByApp = true;
        isByMail = false;
      } else if (req.body.twofa === 2) {
        isByApp = false;
        isByMail = true;
      }
      //Je récupére les données de mon user qui s'est normalement au préalable identifié...
      const userInDb = await User.findByPk(req.session.user.id);

      //si aucun user touvé  => demande d'authentification

      if (!userInDb) { // ne devrait jamais exister car la page profile nécéssite déja d'être connecté !

        return res.render('login', {
          error: 'Merci de vous connecter pour activer l\'authentification a deux facteurs !',
        });
      }

      // on vérifit l'état dans la db et si true on la passe a false, et on renvoie une vue au user !
      const twofaFromUser = parseInt(req.body.twofa, 10);

      if (twofaFromUser === 3) {

        //Si l'utilisateur l'a déja activé et veut la supprimer...
        if (userInDb.twofa === false) {

          return res.render('profile', {
            error: 'Votre authentification à deux facteurs est déja désactivée.',
            scores: await scores(req, res),
            user: req.session.user,

          });
        } else if (userInDb.twofa === true) {

          //J'update a false la valeur de la colonne 2FA et je supprime le secret en bdd
          await User.update({
            twofa: false,
            secret: null,
          }, {
            where: {
              id: req.session.user.id,
            }
          });

          // j'update également la valeur en session
          req.session.user.statutTwoFA = "Désactivée";

          return res.render('profile', {
            error: 'Votre authentification à deux facteurs a bien été désactivée.',
            scores: await scores(req, res),
            user: req.session.user,
          });
        }

      } else if (twofaFromUser === 1) {

        if (userInDb.twofa === true) {

          return res.render('profile', {
            error: 'Votre authentification à deux facteurs a déja été activée !',
            scores: await scores(req, res),
            user: req.session.user,

          });
        } else if (userInDb.twofa === false) {

          //je renvoie ma vue avec mon nouveau qrcode intégrée via le chemin de l'image !
          return res.status(200).render("code", {
            theQrcode: await makeQrCode(req, res, await secret(req, res)),
            isByApp,
            isByMail
          });
        }
      } else if (twofaFromUser === 2) {

        const code = await sendTOTPCode(req, res, await secret(req, res));

        contexte = {
          nom: userInDb.lastname,
          prenom: userInDb.firstname,
          code,
          tempsRestant: await formatLong(new Date()), // renvoit une date en format long avec le temps ajouté correspondant a la durée de validité du code (définit dans le service)
        };
        const text = `Bonjour ${userInDb.firstname} ${userInDb.lastname}, Vous souhaitez installer une autehentification a double facteur pour votre compte du site The quiz. Merci de renseigner le code fournit pour terminer la mise en place de l'autehtification à double facteurs :
        ${code}.`;
        const template = '2FAsetting';
        const subject = "The Quizz : Mise en place de l'authentification à deux facteurs.";
        const infoEmail = await sendEmail(userInDb.email, subject, contexte, text, template);


        if (typeof infoEmail === undefined) {
          return res.status(200).render('profile', {
            error: "Une érreur est survenue lors de l'envoie du mail pour une authentification à deux facteurs, merci de réessayer."
          });
        } else {
          return res.status(200).render('code', {
            theQrcode: undefined,
            isByApp,
            isByMail,
          });
        }

      };

    } catch (error) {
      console.log("Erreur dans la méthode generateSecret dans le userController ==>> ", error);
      return res.status(500).end();
    }
  },

  validateSecret: async (req, res) => {
    try {

      // Pour l'envoi d'un nouveau email ou qrcode dans ma vue
      let isByMail;
      let isByApp;
      if (req.session.user.twofachoice === 1) {
        isByApp = true;
        isByMail = false;
      } else if (req.session.user.twofachoice === 2) {
        isByApp = false;
        isByMail = true;
      }

      // je vérifit qu'il s'agit bien d'un nombre a 6 chiffres !

      if (!validator.isNumeric(req.body.code) || req.body.code.length !== 6) {

        return res.render('code', {
          error: 'Le format du code est incorrect !',
          theQrcode: undefined,
          isByApp,
          isByMail
        });
      }

      // si le code caché est qrcode ou app, pas le même traitement.
      let isTokenValide;
      if (req.body.source === 'qrcode') {

        console.log("req.body.source === 'qrcode'");

        isTokenValide = speakeasy.totp.verify({
          secret: req.session.user.two_factor_secret,
          encoding: 'ascii',
          token: req.body.code,
          //algorithm:'sha512' //=> plante si définit...
        });

      } else if (req.body.source === 'email') {

        console.log("req.body.source === email");
        console.log("req.body.source === ", req.session.user);


        isTokenValide = speakeasy.totp.verify({
          secret: req.session.user.two_factor_secret,
          encoding: 'ascii',
          token: req.body.code,
          algorithm: 'sha512',
          step: 300,
        });

      } else {

        return res.status(200).render('code', {
          theQrcode: undefined,
          error: 'Votre authentification à deux facteurs n\'a pas pu être validée. Vous pouvez essayer de ressaisir un code.',
          isByApp,
          isByMail,
        });

      };


      console.log("isTokenValide et notre authentification 2FA a le statut ====>>> ", isTokenValide);

      if (isTokenValide === true) {

        // passer a true la valeur en bdd pour twofa, 
        await User.update({
          twofa: true,
        }, {
          where: {
            id: req.session.user.id,
          }
        });

        // socker le secret du user
        await User.update({
          secret: req.session.user.two_factor_secret,
        }, {
          where: {
            id: req.session.user.id,
          }
        });

        //envoyer en session le statut de la 2FA
        if (req.session.user.twofachoice === 2) {
          req.session.user.statutTwoFA = "Activée (via votre email)";
        }
        if (req.session.user.twofachoice === 1) {
          req.session.user.statutTwoFA = "Activée (via une application d'authentification)";

        }
        //je supprime la valeur du secret en session, maintenant qu'elle est en base !
        req.session.user.two_factor_secret = undefined;

        //Renvoyer une vue indiquant que tout c'est bien passé !
        return res.status(200).render('profile', {
          info: 'Votre authentification à deux facteurs a été activée avec succés  😃!',
          scores: await scores(req, res),
        });

      } else if (isTokenValide === false) {

        //Renvoyer une vue indiquant le probléme !
        return res.status(200).render('code', {
          error: 'Votre authentification à deux facteurs n\'a pas pu être activée. Vous pouvez essayer de ressaisir un code.',
          theQrcode: undefined, // je ne veux pas réaficher le qrcode 
          isByMail,
          isByApp,
        });
      };

    } catch (error) {
      console.log("Erreur dans la méthode validate du userController : ", error);
      return res.status(500).end();
    }

  },


  validateSecretAfterLogin: async (req, res) => {
    try {

      let isByMail;
      let isByApp;
      if (req.session.twofachoice === 1) {
        isByApp = true;
        isByMail = false;
      } else if (req.session.twofachoice === 2) {
        isByApp = false;
        isByMail = true;
      }

      // je vérifit qu'il s'agit bien d'un nombre a 6 chiffres !
      if (!validator.isNumeric(req.body.code) || req.body.code.length !== 6) {

        return res.render('login_step2', {
          error: 'Le format du code est incorrect ! Vous pouvez essayer de ressaisir un code en provenance de votre application.',
          isByMail,
          isByApp,
        });
      }

      console.log("req.session.theid ligne 787  ===>>> ", req.session.theid);

      // je récupére les données de mon user via ce que j'ai passé en session avant la double authentification
      const userInDb = await User.findByPk(req.session.theid);

      console.log("userInDb ligne 787 dans la méthode validateSecretAfterLogin")

      // petite sécurité si jamais aucun user en BDD
      if (!userInDb) { // ne devrait jamais exister car la page en cours nécéssite déja d'être connecté !

        return res.render('login', {
          error: 'Merci de vous connecter avant toute double authentification',
        });
      }

      // si le code caché est qrcode ou app, pas le même traitement.
      let isTokenValide;
      if (req.body.source === 'qrcode') {

        console.log("req.body.source ligne 804 === 'qrcode'")

        isTokenValide = speakeasy.totp.verify({
          secret: userInDb.secret,
          encoding: 'ascii',
          token: req.body.code,
          //algorithm:'sha512' //=> plante si définit...
        });

      } else if (req.body.source === 'email') {

        console.log("req.body.source ligne 815 === 'email'")

        isTokenValide = speakeasy.totp.verify({
          secret: userInDb.secret,
          encoding: 'ascii',
          token: req.body.code,
          algorithm: 'sha512',
          step: 300,
        });

      } else {
        // ici req.body.source n'a pas le format souhaité...
        return res.status(200).render('login_step2', {
          error: 'Votre authentification à deux facteurs n\'a pas pu être validée. Vous pouvez essayer de ressaisir un code.',
          isByMail,
          isByApp,
        });

      };

      console.log("Authentification 2FA avec le statut ====>>> ", isTokenValide);

      if (isTokenValide === true) {

        // J'insére en session les infos nécéssaires
        let twofaSession;
        if (userInDb.twofa === true) {

          if (userInDb.twofachoice === 2) {
            twofaSession = "Activée (via votre email)";
          }
          if (userInDb.twofachoice === 1) {
            twofaSession = "Activée (via une application d'authentification)";

          }

        } else if (userInDb.twofa === false) {


          twofaSession = "Désactivée";
        };
        req.session.user = {
          id: userInDb.id,
          firstname: userInDb.firstname,
          lastname: userInDb.lastname,
          email: userInDb.email,
          role: userInDb.role,
          statutTwoFA: twofaSession,
          twofachoice: userInDb.twofachoice, // vaut null si pas de choix..

        };

        //on supprime la valeur temp en session pour le twofachoice et l'id (défini lors de la connexion)
        req.session.theid = undefined;
        req.session.twofachoice = undefined;

        //Fin de la procédure d'authentification, on renvoie le menu principal
        return res.status(200).redirect('/');

      } else if (isTokenValide === false) {

        //Renvoyer une vue indiquant le probléme !
        return res.status(200).render('login_step2', {
          error: 'Votre authentification à deux facteurs n\'a pas pu être validée. Vous pouvez essayer de ressaisir un code en provenance de votre application.',
          isByApp,
          isByMail,
        });
      };


    } catch (error) {
      console.log("Erreur dans la méthode validateAfterLogin du userController : ", error);
      return res.status(500).end();
    }

  },



}


module.exports = userController;