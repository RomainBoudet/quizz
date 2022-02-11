const {
    Quiz
} = require('../models');



const mainController = {
    home: async (_, res) => {
        try {
            //on récupère tous les quizzes en base
            const quizzes = await Quiz.findAll({
                //on ajoute les infos de l'auteur grâce aux relations qu'on a définies
                include: 'author'
            })
            res.render('index', {
                quizzes
            });
        } catch (error) {
            console.trace("Erreur dans le mainController dans la méthode home =====> ", error)
            return res.status(500).end();
        }

    },

    erreur: async (req, res) => {

        try {

            res.status(404).render('404');

        } catch (error) {
            console.trace("Erreur dans le mainController dans la méthode 404 =====> ", error)
            return res.status(500).end();
        }


    },



};



module.exports = mainController;