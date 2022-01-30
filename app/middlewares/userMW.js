//on utilise un middleware maison pour initialiser la propriété user à false dans la session
//on rend la propriété user disponible dans toutes les vues en l'ajoutant dans l'object locals attaché à la response
const userMW = (request, response, next) => {
    if (!request.session.user) {
        request.session.user = false;
    }
    response.locals.user = request.session.user;
    next();
};

module.exports = userMW;