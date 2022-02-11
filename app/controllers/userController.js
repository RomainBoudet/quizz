const {
  User,
} = require('../models');
const bcrypt = require('bcrypt');

const {
  email2fa,
} = require('../service/2fa');
const {
  scores
} = require('../service/scores');

const validator = require('validator');


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


}


module.exports = userController;