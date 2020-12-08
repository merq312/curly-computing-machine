// We are using this function to get rid of the duplicate try/catch blocks
// in every route. The rejected promise is simply passed into next, from which
// it goes into the global error handler
module.exports = (fn) => {
    return (req, res, next) => {
        // Javascript passes the err to next automatically
        // fn(req, res, next).catch((err) => next(err));
        fn(req, res, next).catch(next);
    };
};
