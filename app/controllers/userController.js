const {
  User,
  Score
} = require('../models');
const bcrypt = require('bcrypt');

const validator = require("email-validator");

const userController = {

  loginForm: (request, response) => {
    response.render('login');
  },

  handleLoginForm: async (request, response) => {
    try {
      //on cherche à identifier le user à partir de son email
      const email = request.body.email;
      const user = await User.findOne({
        where: {
          email
        }
      })
    
      //si aucun user touvé avec cet email => message d'erreur
      if (!user) {
        return response.render('login', {
          error: 'Email ou mot de passe incorrect'
        });
      }
      

      //le user avec cet email existe, on vérifie son mot de passe en comparant :
      //- la version en clair saisie dans le formulaire
      //- la version hachée stockée en BDD
      //bcrypt est capable de déterminer si les 2 version du mot de passe correcpondent
      const validPwd = bcrypt.compareSync(request.body.password, user.password);

      if (!validPwd) {
        //la vérification a échoué, on envoie un message d'erreur
        return response.render('login', {
          error: 'Email ou mot de passe incorrect'
        });
      }


      //le user existe et s'est correctement identifié, on stocke les infos qui vont bien dans la session

      request.session.user = {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role
      };

      if (request.body.remember) {
        //l'utilisateur a coché la case 'se souvenir de moi'
        //on ajoute une heiure de validité à sa session
        //il peut ainsi quitter son navigateur et revenir sur la page, il devrait rester connecté
        //on indique en date d'expiration la date courante + une heure (en millisecondes)
        request.session.cookie.expires = new Date(Date.now() + 3600000);
      }

      response.redirect('/');
    } catch (error) {
      console.log(error);
    }

  },

  logout: (request, response) => {
    //on reset des infos du user en session
    request.session.user = false;
    //on redirige sur la page d'accueil
    response.redirect('/');
  },

  //on envoie le formulaire d'inscription ejs en get a la bonne route définie dans le router
  signupForm: (request, response) => {

    response.render('signup')

  },

  //! on traite le formulaire et on ajoute un user en BDD


  handleSignupForm: async (request, response) => {
    try {

      //on checke si un utilisateur existe déjà avec cet email
      const user = await User.findOne({
        where: {
          email: request.body.email
        }
      });
      if (user) {
        //il y a déjà un utilisateur avec cet email, on envoie une erreur
        return response.render('signup', {
          error: 'Un utilisateur avec cet email existe déjà'
        });
      }
      //on rechecke que l'email a un format valide
      if (!validator.validate(request.body.email)) {
        //le format de l'email est incorrect
        return response.render('signup', {
          error: 'Le format de l\'email est incorrect'
        });
      }
      //on checke si le password et la vérif sont bien identiques
      if (request.body.password !== request.body.passwordConfirm) {
        return response.render('signup', {
          errorMdp: 'La confirmation du mot de passe est incorrecte'
        });
      }

      // test mot de passe sup sécurisé.
      const regex = /^(?=.*[\d])(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*])[\w!@#$%^&*]{8,}$/;
      if (!regex.test(request.body.password)) {
        return response.render('signup', {
          errorMdpLength: 'Le format de votre mot de passe est incorrect : Il doit contenir au minimum 8 caractéres avec minimum, un chiffre, une lettre majuscule, une lettre minuscule et un carctére spécial parmis : ! @ # $% ^ & *'
        });
      }


      //on hache le password
      const hashedPwd = bcrypt.hashSync(request.body.password, 10)
      console.log(request.body.password, 'est devenu', hashedPwd);
      //on inscrit le nouveau user en BDD



      //on inscrit le nouveau user en BDD
      await User.create({
        email: request.body.email,
        password: hashedPwd,
        lastname: request.body.lastname,
        firstname: request.body.firstname
      });
      response.redirect('/login');
    } catch (error) {

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
      console.trace(err);
    }

  }


}


module.exports = userController;