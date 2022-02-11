const connected = (req, res, next) => {

    try {

        if (!req.session.user) {
            return res.status(403).render('login');
        }

        next();

    } catch (error) {
        console.log("Erreur dans le MW connected => ", error)
        return res.status(403).render('login');


    }


};

module.exports = {
    connected
};