const {
	Quiz,
	Score
} = require('../models');

const quizzController = {

	quizzPage: async (req, res) => {
		try {
			console.log("on passe dans la méthode quizzPage du Quizzz controller !")
			const quizId = parseInt(req.params.id);
			const quiz = await Quiz.findByPk(quizId, {
				include: [{
						association: 'author'
					},
					{
						association: 'questions',
						include: ['answers', 'level']
					},
					{
						association: 'tags'
					}
				]
			});

			// Je me refais un tableau de tableaux d'ojets {id://, description://, question_id://, question://, level://}, dans le quel je pourrai piocher aléatoirement pour randomiser la position des réponses
			// structre recherché => [[{id://, description://, question_id://, question://, level://} X4 ] X10]
			let arrayGlobale = [];
			let arrayDetail = [];

			for (const question of quiz.questions) { // questions est un tableau de tableaux

				arrayDetail.push(question.question);
				arrayDetail.push(question.level.name);

				for (const answer of question.answers) {
					//answer comprend un lot de 4 réponses
					arrayDetail.push(answer.dataValues);
				}

				arrayGlobale.push(arrayDetail);
				arrayDetail = [];

			};

			// J'nsére dans mes objets les valeurs question et level qui sont a l'index 0 etr 1 de mon tableau.
			for (const array of arrayGlobale) {

				array[2].question = array[0];
				array[2].level = array[1];

				array[3].question = array[0];
				array[3].level = array[1];

				array[4].question = array[0];
				array[4].level = array[1];

				array[5].question = array[0];
				array[5].level = array[1];

			}

			//console.log("arrayGlobale =====>>> ", arrayGlobale);

			// je reconstruit un tableau avec seulement mes objets dans chaque sous tableaux sans les index 0 et 1
			let array2 = [];
			for (const array of arrayGlobale) {
				array2.push(array.slice(-4));
			}


			//console.log("array2 =====>> ", array2);


			// une fonction qui mélange un tableau
			function shuffle(a) {
				for (let i = a.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[a[i], a[j]] = [a[j], a[i]];
				}
				return a;
			}
			// On mélange l'ordre des réponses a chaque solicitation (mélange l'ordre des objects dans chaque sous tableau)
			// Pour rappel :
			/* const random = (min, max) => {
				return Math.floor(Math.random() * (max - min)) + min;
			}; */
			const shuffleAnswers = array2.map(item => shuffle(item));

			//console.log("shuffleAnswers =====>>> ", shuffleAnswers);


			//on utilise les données en session pour savoir si un user est connecté
			/*
				version longue :
				if (req.session.user) {
					res.render('play_quiz', {quiz});
				} else {
					res.render('quiz', {quiz});
				}
			*/
			//version courte avec une condition ternaire
			// https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Op%C3%A9rateurs/L_op%C3%A9rateur_conditionnel


			res.render(req.session.user ? 'play_quiz' : 'quizz', {
				quiz,
				shuffleAnswers
			});
		} catch (err) {
			console.trace(err);
			res.status(500).send(err);
		}
	}


};

module.exports = quizzController;