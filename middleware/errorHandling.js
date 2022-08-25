require('dotenv').config();
function errorHandling(err, req, res, next) {
    if(err){
        let status = err.status || 200;
        res.status(status).json(
            {
                msg: "An error occurred. Please try again later."
            }
        )
    }
    next();
}
module.exports = errorHandling;