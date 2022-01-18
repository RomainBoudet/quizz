/**
 * On remplace le connecteur à la main pr une instance de sequelize
 * il faudra passer cette instance à chacun de nos modèles pour pouvoir les initialiser
 * 
 */

 const {Sequelize} = require('sequelize');

 const sequelize = new Sequelize(process.env.PG_URL,{
     define: {
       timestamps: false
     },
 });
 
 module.exports = sequelize;