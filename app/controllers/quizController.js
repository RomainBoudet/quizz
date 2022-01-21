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
			res.status(500).end();
		}
	},

	quizzAnswer: async (req, res) => {

		try {


			const quizId = parseInt(req.params.id);

			//si les 10 réponses n'ont pas été fournies => message d'erreur
			if ((Object.keys(req.body).length) < 10) {

				//const quiz uniquement dispo dans cette scope ! On pourra renomer identique dans contexte générale..
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

				const shuffleAnswers = array2.map(item => shuffle(item));

				return res.render('play_quiz', {
					error: 'Merci de répondre aux 10 questions avant de valider votre quizz.',
					quiz,
					shuffleAnswers
				});
			}

			// on resélectionne le quiz concerné en ajoutant la relation good_answer pour chaque question
			//Rappel : cette relation va inclure pour chaque question un object Answer contenant les infos de la bonne réponse
			const quiz = await Quiz.findByPk(quizId, {
				include: ['author', 'tags',
					{
						association: 'questions',
						include: ['good_answer', 'answers', 'level']
					}
				]
			});

			//on va stocker ici des informations sur chaque réponse de l'utilisateur afin de les passer à la vue
			const answers = [];
			//un compteur pour le nombre de points, chaque bonne réponse vaut 1
			let nbPoints = 0;
			//on boucle sur les questions du quiz et on compare
			for (const question of quiz.questions) {

				/*
				Rappel : req.body va être de la forme
					req.body.question_<id_question>: <id_reponse_user_string>

					req.body.question_1: '25',
					req.body.question_32: '12',
					req.body.question_45: '63',
					...
				*/
				//on détermine si l'id de la bonne réponse correpond à la sélection du user
				//les infos reçues d'un formulaire sont toujours sous forme de string, on utilise parseInt pour effectuer la comparaison
				const isGood = question.good_answer.id === parseInt(req.body[`question_${question.id}`]);
				if (isGood) {
					//le user a donné la bonne réponse, on lui donne 1 point de plus
					nbPoints++;
				} else {

				}
				//on ajoute pour cette question des infos dans le tableau answers
				//pour la question du quiz d'index X correspndra une entrée d'index X dans le tableau answers

				answers.push({
					//bonne réponse
					question_answer: question.good_answer.id,
					//réponse du user
					user_answer: parseInt(req.body[`question_${question.id}`]),
					//boolean indiquant si le user a trouvé la bonne réponse
					isGood
				});
			}

			console.log("answers =======>>>>> ", answers);

			// Je dois retrouver pour un user donné, un score pour un titre de quiz particulier.

			//! On n'inscrit que les meilleurs (ou nouveau) score ! 
			// Je récupére le score existant pour ce quizz en base. Si il n'existe pas, j'inscris ce nouveau titre de quiz et score en base.
			//  si il existe je le compare avec le score obtenue, si il est inférieur, je ne le marque pas, j'incrémente juste un essai. 
			// Si il est supérieur ou qu'aucun quiz avec ce titre n'est présent, alors je l'inscris en base

			const oldScore = await Score.findOne({
				where: {
					user_id: req.session.user.id,
					quizz: quiz.dataValues.title
				}
			});


			//console.log("oldScore ==>> ", oldScore);
			//console.log("oldScore.dataValues.score ==>> ", oldScore.dataValues.score); // si oldScore vaut null => error...
			//console.log("nbPoints ==>> ", nbPoints);


			let score;
			// Aucun score n'est présent en base 

			if (oldScore === null) {

				console.log("on passe dans le cas d'une absence de score ");

				score = await Score.create({
					quizz: quiz.dataValues.title,
					score: nbPoints,
					essai: 1,
					user_id: req.session.user.id
				});

				// instance du quiz et instance du score  nécéssaire pour mettre a jour la table de liaison !
				// on laisse faire la magie de Sequelize avec la méthode addQuiz !

				await score.addQuiz(quiz);

				//https://sequelize.org/master/manual/assocs.html 

			} else {

				// Ancien score inférieur au nouveau score, je met a jour l'enregistrement !
				if (oldScore !== null && oldScore.dataValues.score < nbPoints) {

					console.log("on passe dans le cas d'un ancien score inférieur au nouveau score ");

					score = await Score.update({
						score: nbPoints,
						essai: parseInt(oldScore.dataValues.essai, 10) + 1
					}, {
						where: {
							user_id: req.session.user.id,
							quizz: quiz.dataValues.title
						}
					});

				}

				// Ancien score supérieur au nouveau score : j'incrémente l'essai de 1 mais je ne touche pas au score ! 
				if (oldScore !== null && oldScore.dataValues.score > nbPoints) {

					console.log("on passe dans le cas d'un ancien score supérieur au nouveau score ");

					score = await Score.update({
						essai: parseInt(oldScore.dataValues.essai, 10) + 1
					}, {
						where: {
							user_id: req.session.user.id,
							quizz: quiz.dataValues.title
						}
					});

				};

			}

			//en sortie de boucle, on affiche la vue score avec comme data :
			//- le quiz récupéré de la BDD
			//- le tableau aswers avec des infos sur la réponse à chaque question
			//- le nombre de points
			//console.log("quiz.questions quizz controller ligne 79 ==>", quiz.questions);
			//console.log("nbPoints quizz controller ligne 79 ==>", nbPoints);
			//console.log("answers quizz controller ligne 79 ==>", answers);

			res.render('score', {
				quiz,
				answers,
				nbPoints
			});

		} catch (error) {
			console.trace(err);
			res.status(500).end();
		}


	}


};

module.exports = quizzController;