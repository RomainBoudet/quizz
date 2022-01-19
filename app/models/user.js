const Sequelize = require('sequelize');
const sequelize = require('../database');

class User extends Sequelize.Model {

  get fullname() {
    return this.firstname + ' ' + this.lastname;
  };

};

User.init({
  email: {
    type: Sequelize.STRING,
    validate: {
      isEmail: true
    }
  },

  // Uniquement le format d'un hash de Bcrypt. (Interdit en clair.)
  password: {
    type: Sequelize.STRING,
    validate: {
      is: /^\$2[ayb]\$.{50,61}$/
    }
  },
  firstname: Sequelize.STRING,
  lastname: Sequelize.STRING,
  role: Sequelize.STRING
}, {
  sequelize,
  tableName: "user"
});


module.exports = User;