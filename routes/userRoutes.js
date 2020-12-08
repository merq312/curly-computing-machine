const express = require('express')
const userController = require('../controllers/userController')
const authController = require('../controllers/authController')

const router = express.Router()

// Note the routing for the user is different from the rest of the architecture
// ie- not following REST phillosophy, post requests only, etc
router.post('/signup', authController.signup)
router.post('/login', authController.login)
router.get('/logout', authController.logout)

router.post('/forgotPassword', authController.forgotPassword)
router.patch('/resetPassword/:token', authController.resetPassword)

// this will apply to all of the following routes
router.use(authController.protect)

router.patch('/updateMyPassword', authController.updatePassword)

router.get('/me', userController.getMe, userController.getUser)
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
)
router.delete('/deleteMe', userController.deleteMe)

// REST style querying for admins, NOT clients
router.use(authController.restrictTo('admin'))
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser)

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser)

module.exports = router
