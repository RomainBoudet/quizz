
BEGIN;

-- je supprime les tables si elles existent déja
DROP TABLE IF EXISTS "level",
"answer",
"user",
"score",
"quiz",
"question",
"tag",
"quiz_has_tag",
"quiz_has_scores";


-- -----------------------------------------------------
-- Table "level"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "level" (

  -- une clé primaire est automatiquement NOT NULL. Pas besoin de le préciser.
  -- 
  -- afin d'utiliser la génération automatique d'un identifiant on utilise une colonne de type serial (Attention désormais on utilisera plutôt GENERATED ALWAYS AS IDENTITY)
  -- https://wiki.postgresql.org/wiki/Don't_Do_This#Don.27t_use_serial
  -- Mais dans notre projet on utilise serial car sequelize utilise encore serial…
  -- 

  --
  "id" serial PRIMARY KEY,
  "name" text NOT NULL
);

-- -----------------------------------------------------
-- Table "answer"
-- -----------------------------------------------------
-- On ne peut pas référencé le champ id de la table question ici, car la table n'existe pas encore. On fera une modification à la fin du script pour ajouter la référence.
CREATE TABLE IF NOT EXISTS "answer" (
  "id" serial PRIMARY KEY,
  "description" text NOT NULL,
  "question_id" integer NOT NULL
);

-- -----------------------------------------------------
-- Table "app_user"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "user" (
  "id" serial PRIMARY KEY,
  "email" text NOT NULL,
  "password" text NOT NULL,
  "firstname" text NULL,
  "lastname" text NULL,
  "role" text NOT NULL DEFAULT 'user',
  "twofa" boolean NOT NULL DEFAULT false,
  "createddate" timestamptz NOT NULL DEFAULT now()
);


-- -----------------------------------------------------
-- Table "quiz"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "quiz" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "description" text NULL,
  "user_id" integer NOT NULL REFERENCES "user" ("id")
);

-- -----------------------------------------------------
-- Table "score"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "score" (
  "id" serial PRIMARY KEY,
  "quizz" text NOT NULL,
  "score" integer NOT NULL,
  "essai" integer NOT NULL,
  "user_id" integer NOT NULL REFERENCES "user" ("id")
-- relation N - N avec la table quiz dans la table quiz_has_scores !
);

-- -----------------------------------------------------
-- Table "question"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "question" (
  "id" serial PRIMARY KEY,
  "question" text NOT NULL,
  "anecdote" text NULL,
  "wiki" text NULL,
  "level_id" integer NOT NULL REFERENCES "level" ("id"),
  -- 'Good answer',
  "answer_id" integer NOT NULL REFERENCES "answer" ("id"),
  "quiz_id" integer NOT NULL REFERENCES "quiz" ("id")
);

-- -----------------------------------------------------
-- Table "tag"
CREATE TABLE IF NOT EXISTS "tag" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL
);

-- -----------------------------------------------------
-- Table "quiz_has_tag"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "quiz_has_tag" (
  --"id" SERIAL PRIMARY KEY,
  "quiz_id" integer REFERENCES "quiz"("id") ON DELETE CASCADE,
  "tag_id" integer REFERENCES "tag" ("id") ON DELETE CASCADE,
  PRIMARY KEY ("quiz_id", "tag_id")
);

-- -----------------------------------------------------
-- Table "quiz_has_scores"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "quiz_has_scores" (
  --"id" SERIAL PRIMARY KEY,
  "quiz_id" integer REFERENCES "quiz"("id") ON DELETE CASCADE,
  "score_id" integer REFERENCES "score" ("id") ON DELETE CASCADE,
  PRIMARY KEY ("quiz_id", "score_id")
);

-- Lors de la création d'une table ce détail est implicite
ALTER TABLE "answer"
  ADD FOREIGN KEY ("question_id") REFERENCES "question" ("id");

-- Pour mettre fin à au bloc de transaction et l'exécuter
COMMIT;