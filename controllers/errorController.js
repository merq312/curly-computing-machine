const AppError = require('../utils/appError')

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`
  return new AppError(message, 400)
}

const handleDuplicateFieldsDB = (err) => {
  // const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const value = err.keyValue.name

  const message = `Duplicate field value: ${value}. Please use another value.`
  return new AppError(message, 400)
}

// const handleValidationErrorDB = (err) => {
//     const errors = Object.values(err.errors).map((el) => el.message);

//     const message = `Invalid input data. ${errors.join(". ")}`;
//     return new AppError(message, 400);
// };

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401)

const handleJWTExpired = () =>
  new AppError('Login token expired. Please log in again!', 401)

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    })
  }
  // B) RENDERED WEBSITE
  console.error('ERROR', err)
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    message: err.message,
  })
}

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // Operational error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      })
    }
    // Programming or other unknown error: don't leak error details
    // Log error to console
    console.error('ERROR', err)

    // Send generic message to client
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    })
  }
  // B) RENDERED WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong',
      message: err.message,
    })
  }
  // Programming or other unknown error: don't leak error details
  // Log error to console
  console.error('ERROR', err)

  // Send generic message to client
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong',
    message: 'Please try again later',
  })
}

module.exports = (err, req, res, next) => {
  // prints the call stack
  // console.log(err.stack);

  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res)
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err }
    error.message = err.message

    if (error.name === 'CastError') error = handleCastErrorDB(error)
    if (error.code === 11000) error = handleDuplicateFieldsDB(error)
    // if (error.name === 'ValidationError') error = handleValidationErrorDB(error)
    if (error.name === 'JsonWebTokenError') error = handleJWTError()
    if (error.name === 'TokenExpiredError') error = handleJWTExpired()

    sendErrorProd(error, req, res)
  }
}
