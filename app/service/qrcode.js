const speakeasy = require('speakeasy');
const {
  toDataURL,
} = require('qrcode');


const makeQrCode = async (req, res) => {

    try {

        const mysecret = await speakeasy.generateSecret({
            name: process.env.TWO_FACTOR_AUTHENTICATION_APP_NAME,
            length: 200, //par défault 32
        });
        //console.log('mysecret ====>> ', mysecret);
    
        // Création d'un lien que l'on passera a notre qrcode
        //par défault on a du SHA1 => aucune robustesse... => on passe en SHA512 ! Mais pas certain qu'il soit bien pris en compte... 
        const secret = await speakeasy.otpauthURL({
            secret: mysecret.base32,
            label: process.env.TWO_FACTOR_AUTHENTICATION_APP_NAME,
            algorithm: 'sha512',
            encoding: 'base32'
        });
    
        req.session.user.two_factor_secret = mysecret.base32;
        console.log("req.session.user.two_factor_secret ==>>> ", req.session.user.two_factor_secret);
    
        let theQrcode;
        try {
    
            theQrcode = await toDataURL(secret, {
                errorCorrectionLevel: 'H'
            }, );
    
            // un apercu du qrcode en console.
            /*  console.log("Rhoo le beau Qrcode ==>> ", await toString(secret, {
              type: 'terminal',
            }, {
              errorCorrectionLevel: 'H'
            }));  */
    
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

module.exports = {
    makeQrCode
};