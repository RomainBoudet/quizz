const {
    User,
  } = require('../models');

const {
    sendEmail
} = require('../service/sendMail');

const {
    makeQrCode,
    sendTOTPCode,
    secret,
} = require('../service/2fa');

const {
    scores
} = require('../service/scores');

const {
    formatLong
} = require('../service/date');

const validator = require('validator');
const speakeasy = require('speakeasy');


const twoFAController = {

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
            console.log("Erreur dans la méthode generateSecret dans le twoFAController ==>> ", error);
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
            console.log("Erreur dans la méthode validate du twoFAController : ", error);
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
            console.log("Erreur dans la méthode validateAfterLogin du twoFAController : ", error);
            return res.status(500).end();
        }

    },


};

module.exports = twoFAController;