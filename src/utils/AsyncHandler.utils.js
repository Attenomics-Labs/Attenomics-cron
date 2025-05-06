const AsyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
}

const promisefunction = async (execution) => {
    return await new Promise(async (resolve, reject) => {
        try {
            console.log("Execution started");
            await execution
            console.log("Execution Ended");
            resolve(true);
        } catch (error) {
            reject(true);
            console.log("Error", error);
        }
    })
};


export { AsyncHandler, promisefunction };