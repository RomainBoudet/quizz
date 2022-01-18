//on charge les variables d'environnement
require('dotenv').config();

const express = require('express');
const router = require('./app/router');
const session = require('express-session');

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
app.use(session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false, //si true, la navigateur n'envoit que des cookie sur du HTTPS
        maxAge: 1000 * 60 * 60 * 24 * 15, // ça fait une heure * 24h * 15 jours
        httpOnly: false, // Garantit que le cookie n’est envoyé que sur HTTP(S), pas au JavaScript du client, ce qui renforce la protection contre les attaques de type cross-site scripting.
        sameSite: 'Strict', //le mode Strict empêche l’envoi d’un cookie de session dans le cas d’un accès au site via un lien externe//https://blog.dareboost.com/fr/2017/06/securisation-cookies-attribut-samesite/
        //!il faudra définir les options de sécurité pour accroitre la sécurité. (https://expressjs.com/fr/advanced/best-practice-security.html)
        //domain: '<yourdomainname>', // Indique le domaine du cookie ; utilisez cette option pour une comparaison avec le domaine du serveur dans lequel l’URL est demandée. S’ils correspondent, vérifiez ensuite l’attribut de chemin.
        //path: 'foo/bar', Indique le chemin du cookie ; utilisez cette option pour une comparaison avec le chemin demandé. Si le chemin et le domaine correspondent, envoyez le cookie dans la demande.
        //expires: expiryDate, Utilisez cette option pour définir la date d’expiration des cookies persistants.
    },
}));

// quelques configuration de headers...
app.use((req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), fullscreen=(), autoplay=(), camera=(), display-capture=(), document-domain=(), fullscreen=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), sync-xhr=(), usb=(), screen-wake-lock=(), xr-spatial-tracking=()"
    );
      res.setHeader("X-XSS-Protection", "1; mode=block");
      next();
    });
  
  app.set('x-powered-by', false);


//on va devoir gérer des données en POST
//on ajoute le middleware urlencoded pour récupérer les infos dans request.body
app.use(express.urlencoded({extended: true}));

app.use(router);


//on lance le serveur
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});