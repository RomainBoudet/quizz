# The Quizz
A nice quizz website about different subject ;)  
You must log in to play.  
Your scores and essay are accessible in your profile.
The MCD used for the design is also available in the "conception" file.  
Your password can be reset.

## Stack

  * **Front**

        * EJS
        * Boostrap

* **Back**

        * Node.js
        * Express
        * Postgres
        * Sequelize (ORM)
        * validator
        * JWT
        * nodemailer (template with handlebars)
        * Bcrypt

## Install

You must have [postgreSQL](https://www.postgresql.org/download/) installed on your machine.  
Advices here will be given with  psql syntax [(standard command line interface for interacting with a PostgreSQL)](https://docs.postgresql.fr/10/app-psql.html).  
After cloning the repo, installing dependencies (```npm i```),  create your database ```createdb quiz```.  
At the root of the repo, create the tables and seed directly with the command ```npm run seed``` (or ```psql yourDatabase -f data/import_data.sql``` and ```psql yourDatabase -f data/import_table.sql```).  
Create an .env file on the example of the .env.example file, choose your port, your postgres connection information (often in the format "postgres://YourUserName:YourPassword@YourHost:5432/YourDatabase" ), your secret for cookie session and your nodemailer configuration.  
And then start the app : ```npm start```  
If you want to test, this app is online : [The Quizz](https://quiz.romainboudet.fr)  
Enjoy !
