const {
    Quiz,
} = require('../models');


const allShuffleAnswers = async (quiz) => {

    try {

    
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

        const allshuffleAnswers = array2.map(item => shuffle(item));

        return allshuffleAnswers;

    } catch (error) {
        console.log("Erreur dans le service shuffleAnswers = ", error);
    }


};

module.exports = {
    allShuffleAnswers
};


			// Pour rappel :
			/*  const random = (min, max) => {
				return Math.floor(Math.random() * (max - min)) + min;*/