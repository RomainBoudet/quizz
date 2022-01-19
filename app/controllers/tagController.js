const {
    Tag
} = require('../models');


const tagController = {

    tagsPage: async (req, res) => {
        try {
            const tags = await Tag.findAll({})
            res.render('tags', {tags});
        } catch (error) {
            console.error(err);
        }
    },

    quizzesByTag: async (req, res, next) => {

        // on récupère l'id dans les paramètres d'url
        const tagId = req.params.id;

        // on va chercher le tag correspondant
        // on demande le Tag, en incluant les quizzes qui sont associés, ET pour chacun de ces quizzes, en incluant aussi l'auteur
        try {
             const tag = await Tag.findByPk(tagId, {
            include: [{
                association: "quizzes",
                include: [{
                    association: "author"
                }]
            }]
        });

        res.render('quizzesByTag', {
                    tag
                });
        } catch (error) {
            console.trace(err);
			res.status(500).send(err);
        }

    }
  
};

module.exports = tagController;

