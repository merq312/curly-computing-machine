const path = require('path')
const express = require('express')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const cors = require('cors')
// const helmet = require("helmet");
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp')
const cookieParser = require('cookie-parser')
const compression = require('compression')

const AppError = require('./utils/appError')
const globalErrorHandler = require('./controllers/errorController')
const tourRouter = require('./routes/tourRoutes')
const userRouter = require('./routes/userRoutes')
const reviewRouter = require('./routes/reviewRoutes')
const bookingRouter = require('./routes/bookingRoutes')
const viewRouter = require('./routes/viewRoutes')

const app = express()

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

// GLOBAL MIDDLEWARES
// Serving static files: all static assets will be servered automatically
// Note: by using path.join we avoid errors like not having a '/' in the path
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')))

// Set security HTTP headers
// helmet() will return a function. It is a collection of security middlewares
// Note- best to use Helmet early in the middleware stack
// app.use(helmet())

app.use(cors({ credentials: true, origin: 'http://localhost:3000' }))

// Development logging
// console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Limit number of requests to 100 per hour for an IP
// Note- if the app is restarted the limit will be reset
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again later',
})
// Apply limiter only to the api routes
app.use('/api', limiter)

// Body parser, reading data from the body into req.body
// We limit the size of the body to 10kb for security
app.use(
  express.json({
    limit: '10kb',
  })
)

// Handle url-encoded form requests
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// Cookie parser
app.use(cookieParser())

// Data sanitization against NoSQL query injection
// It looks at the request body, request query string and request.params and
// filter out query operators like "$" signs
app.use(mongoSanitize())

// Data sanitization against cross-site scripting attacks (XSS)
// Cleans any user input from malicious html code (html with javascript in it)
// This kind of attack is also protected by using mongoose schemas with good validators
app.use(xss())

// Prevent parameter pollution (ie- clear up the query string of duplications, etc)
// We may whitelist some params that we want to allow
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
)

// Compresses all text responses
app.use(compression())

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString()
  // console.log(req.headers);
  // console.log(req.cookies)

  // res.cookie('hello', 'world', {
  //   maxAge: 900000,
  //   httpOnly: false,
  // })

  next()
})

// app.use((req, res, next) => {
//     console.log("Hello from the middleware");
//     next();
// });

// ROUTES
app.use('/', viewRouter)
app.use('/api/v1/tours', tourRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/reviews', reviewRouter)
app.use('/api/v1/bookings', bookingRouter)

// Catch any unhandled routes
app.all('*', (req, res, next) => {
  // const err = new Error(`Can't find ${req.originalUrl} on this server`);
  // err.status = "fail";
  // err.statusCode = 404;

  // Skip all middleware and go to error handler (when are arg is provided to next())
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404))
})

// Global error handling middleware
app.use(globalErrorHandler)

module.exports = app

// app.get('/', (req, res) => {
//     res.status(200).json({
//         message: 'Hello from the server side!',
//         app: 'Natours',
//     });
// });
//
// app.post('/', (req, res) => {
//     res.send('You can post to this endpoint...');
// });

// app.get("/api/v1/tours", getAllTours);
// app.post("/api/v1/tours", createTour);
// app.get("/api/v1/tours/:id", getTour);
// app.patch("/api/v1/tours/:id", updateTour);
// app.delete("/api/v1/tours/:id", deleteTour);
//
// app.route("/api/v1/tours").get(getAllTours).post(createTour);
// app.route("/api/v1/tours/:id")
//     .get(getTour)
//     .patch(updateTour)
//     .delete(deleteTour);
