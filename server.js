const mongoose = require('mongoose')
const dotenv = require('dotenv')

// Safety net for uncaught exceptions (errors in synchronous code)
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION. Shutting down...')
  console.log(err.name, err.message)

  // Note: no need to exit gracefully for uncaught exceptions
  process.exit(1)
})

dotenv.config({ path: './config.env' })

const app = require('./app')

// console.log(process.env);
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
)

mongoose
  //  .connect(process.env.DATABASE_LOCAL, {
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection sucessful'))

// Mandatory for app to work on Heroku
const port = process.env.PORT || 3000
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`)
})

// Last safety net to handle uncaught rejected promises
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION. Shutting down...')
  console.log(err.name, err.message)

  // We call server.close so that the app shuts down gracefully by handling
  // other ongoing requests first
  server.close(() => {
    process.exit(1)
  })
})
