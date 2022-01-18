const Sequelize = require('sequelize');
const sequelize = require('../database');

class Score extends Sequelize.Model {};


// Initialisation façon Sequelize (cf. Level pour plus de détails)
Score.init({
  quizz: Sequelize.STRING,
  score: Sequelize.INTEGER,
  essai: Sequelize.INTEGER
},{
  sequelize,
  tableName: "score"
});

module.exports = Score;