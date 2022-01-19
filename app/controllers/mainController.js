const {Quiz} = require('../models');



const mainController = {
    home: async (_, res) => {
        try {
            //on récupère tous les quizzes en base
            const quizzes = await Quiz.findAll({
                //on ajoute les infos de l'auteur grâce aux relations qu'on a définies
                include: 'author'
            })
            res.render('index', {quizzes});        
        } catch (error) {
            if (error instanceof Error)
                throw error;
            else
                console.log('Error in mainController', error);
        }

    }
};



module.exports = mainController;