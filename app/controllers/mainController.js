const mainController = {
    home: async (_, res) => {
        try {
            
            res.send("Hello World");  
                  
        } catch (error) {
            if (error instanceof Error)
                throw error;
            else
                console.log('Error in mainController', error);
        }

    }
};

module.exports = mainController;