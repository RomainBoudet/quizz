
const {
    Score
  } = require('../models');


const scores = async (req, res) => {

    try {
        const scores = await Score.findAll({
            where: {
                user_id: req.session.user.id,
            },
            order: ['quizz'],
            include: {
                association: 'quizzes'
            }
        });

        return scores;
    } catch (error) {
        console.log("Erreur dans le service Scores !");
        res.status(500).end();

    }
};

module.exports = {scores};
