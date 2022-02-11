const speakeasy = require('speakeasy');
const {
    toDataURL,
    toString,
} = require('qrcode');

const {
    formatLong
} = require('./date');

const {
    sendEmail
} = require('./sendMail');


const secret = async (req, res) => {
        try {

            const mysecret = await speakeasy.generateSecret({
                name: process.env.TWO_FACTOR_AUTHENTICATION_APP_NAME,
                length: 150, //par défault 32
            });

            // je stock le secret en session
            req.session.user.two_factor_secret = mysecret.ascii;


            console.log("mysecret ====> ", mysecret);

            return mysecret.ascii;

        } catch (error) {
            console.error("Erreur dans le service secret ! ==>> ", err);
            return res.status(500).end();
        }


    };

    const makeQrCode = async (req, res, secretBase32) => {

        try {

            console.log("secretbase32 dans le service ligne 40 ====>>> ", secretBase32);

            // Création d'un lien que l'on passera a notre qrcode
            //par défault on a du SHA1 => aucune robustesse... => on passe en SHA512 ! Mais pas certain qu'il soit bien pris en compte... 
            const thesecret = await speakeasy.otpauthURL({
                secret: secretBase32,
                label: process.env.TWO_FACTOR_AUTHENTICATION_APP_NAME,
                //algorithm: 'sha512', // plante si activé 
                encoding: 'ascii',
            });

            console.log("thesecret dans la méthode makeQrCode du service 2fa ===>", thesecret)

            let theQrcode;
            try {

                theQrcode = await toDataURL(thesecret, {
                    errorCorrectionLevel: 'H'
                }, );

                // un apercu du qrcode en console.
                /*  console.log("Rhoo le beau Qrcode ==>> ", await toString(thesecret, {
                  type: 'terminal', 
                }, {
                  errorCorrectionLevel: 'H'
                }));   */

            } catch (err) {
                console.error("Erreur lors de la création du QrCode dans le servicemakeQrCode ! ==>> ", err);
                return res.status(500).end();
            }

            return theQrcode;


        } catch (err) {
            console.error("Erreur dans le service makeQrCode ! ==>> ", err);
            return res.status(500).end();
        }


    };


const sendTOTPCode = async (req, res, secretBase32) => {

    try {
        // Je génére un code totp avec mon secret
        const code = speakeasy.totp({
            secret: secretBase32,
            encoding: 'ascii',
            algorithm: 'sha512',
            step: 300 // validité du code en seconds (5 minutes ici)

        });

        console.log("code dans le service  == > ", code);

        return code;

    } catch (error) {
        console.logd("Erreur dans le service qrcode, dans la méthode sendTOTPCode ===>> ", error);
        return res.status(500).end();
    }


};


const email2fa = async (req, res, secret, email, nom, prenom) => {
    try {
        console.log("secret dans la méthode email2fa du service 2fa ==>> ", secret);
        const code = await sendTOTPCode(req, res, secret);

        contexte = {
            nom,
            prenom,
            code,
            tempsRestant: await formatLong(new Date()), // renvoit une date en format long avec le temps ajouté correspondant a la durée de validité du code (définit dans le service)
        };
        const text = `Bonjour ${nom} ${prenom}, votre code pour votre authentification a double facteur sur le site The Quiz : 
        ${code}.`;
        const template = '2FAcode';
        const subject = "The Quizz : votre code d'authentification à deux facteurs.";
        const infoEmail = await sendEmail(email, subject, contexte, text, template);


        if (typeof infoEmail === undefined) {
            console.log("Une érreur est survenue lors de l'envoie du mail pour une authentification à deux facteurs, merci de réessayer.")
        }

    } catch (error) {

        console.log("Erreur dans le service email2fa = ", error)
    }

};

module.exports = {
    makeQrCode,
    sendTOTPCode,
    secret,
    email2fa,
};