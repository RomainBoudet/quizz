//on charge les variables d'environnement
require('dotenv').config();

const express = require('express');
const router = require('./app/router');
const session = require('express-session');
const helmet= require('helmet');

//Config pour session dans REDIS
const redisSession = require('redis'); //old V3.1.2 ici...
//connect-redis permet d'utiliser Redis avec express-session pour stocker les cookies de la session sur Redis et non en mémoire (pas bien en prod!)
let RedisStore = require('connect-redis')(session);
let redisClient = redisSession.createClient();
const crypto = require('crypto');


const userMW = require('./app/middlewares/userMW');

const app = express();
//on utilise la variable d'environnement PORT pour attribuer un port à notre appli express
//En cas de pépin, on se rabat sur une valeur par défaut
const PORT = process.env.PORT || 4000;

//configuration pour utiliser EJS comme moteur de templates
app.set('view engine', 'ejs');
app.set('views', './app/views');

//on ajoute les ressources statiques du projet
app.use(express.static('./integration'));

//mise en place du système de sessions pour stocker les infos utilisateur
const sessionOptions = {
  store: new RedisStore({
    client: redisClient,
    prefix:process.env.PREFIX,
}), // et nos cookies sont stockés sur REDIS !
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false, //si true, la navigateur n'envoit que des cookie sur du HTTPS
        maxAge: 1000 * 60 * 60 * 24 * 15, // ça fait une heure * 24h * 15 jours
        httpOnly: true, // Garantit que le cookie n’est envoyé que sur HTTP(S), pas au JavaScript du client, ce qui renforce la protection contre les attaques de type cross-site scripting.
        sameSite: 'Strict', //le mode Strict empêche l’envoi d’un cookie de session dans le cas d’un accès au site via un lien externe//https://blog.dareboost.com/fr/2017/06/securisation-cookies-attribut-samesite/
        //!il faudra définir les options de sécurité pour accroitre la sécurité. (https://expressjs.com/fr/advanced/best-practice-security.html)
        //path: 'foo/bar', Indique le chemin du cookie ; utilisez cette option pour une comparaison avec le chemin demandé. Si le chemin et le domaine correspondent, envoyez le cookie dans la demande.
        //expires: expiryDate, Utilisez cette option pour définir la date d’expiration des cookies persistants.
    },
};

if (app.get('env') === 'production') { // Si la variable n'est pas spécifié dans le .env, Express retourne 'development' par défault !
  app.set('trust proxy', 1) // faire confiance au proxy nginx
  sessionOptions.cookie.secure = false; // servir des cookies sécurisés sur https //! Pose probléme en prod...
};

//on lance les sessions aprés config
app.use(session(sessionOptions));

//app.use(helmet()); //! Géré par NGINX désormais...


// Config for sub-resources integrity 
app.use((_, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("hex");
  next();
});

// CSP configuration and headers security
app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [`'self'`,], 
      "script-src": [(_, res) => `'nonce-${res.locals.nonce}'`],
      "img-src": [`'self'`, "https://filedn.eu/lD5jpSv048KLfgLMlwC2cLz/RB.png", "data:" ], // nonce ne fonctionne pas avec les img car pas d'attribut nonce 
      
      "style-src": [ `'self'`,"'unsafe-inline'", "https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css"], //
      "base-uri": ["'none'"],
      "object-src":["'none'"],
    
      upgradeInsecureRequests: [] 
    }
  }));

  //on veut utiliser notre middleware maison pour initialiser user en session à chaque requête
app.use(userMW);

//on va devoir gérer des données en POST
//on ajoute le middleware urlencoded pour récupérer les infos dans request.body
app.use(express.urlencoded({extended: true}));

app.use(router);


//on lance le serveur
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
