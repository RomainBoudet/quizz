function addClass() {

    const allDiv = document.querySelectorAll("div.bandeau");

    for (const item of allDiv) {
        item.className = "hide";
    };

};
// on déinit un temps de 5 secondes avant la disparition du bandeau !
setTimeout(addClass, 10000);