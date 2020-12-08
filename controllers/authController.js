const crypto = require('crypto')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const Email = require('../utils/email')

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
}

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id)
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'Strict',
  }
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true
  }

  res.cookie('jwt', token, cookieOptions)

  // Remove password from the output
  user.password = undefined

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  })
}

exports.signup = catchAsync(async (req, res, next) => {
  // This is BAD: anyone can specific their own user priviledges
  // const newUser = await User.create(req.body);

  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  })

  const url = `${req.protocol}://${req.get('host')}/me`
  // console.log(url)
  await new Email(newUser, url).sendWelcome()

  createSendToken(newUser, 201, res)
})

exports.login = catchAsync(async (req, res, next) => {
  // ES6 destructuring (matches email and password keys)
  const { email, password } = req.body

  // Check if email and password exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400))
  }

  // Check if user exists & password is correct
  // Note that the password field is set to "select: false" in the schema, so
  // we need to specifically select it using "+".
  const user = await User.findOne({ email }).select('+password')

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401))
  }

  // Send JWT to client
  createSendToken(user, 200, res)
})

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: 'Strict',
  })
  res.status(200).json({ status: 'success' })
}

exports.protect = catchAsync(async (req, res, next) => {
  // Getting token and check if it's there
  let token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    ;[, token] = req.headers.authorization.split(' ')
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt
  }

  if (!token) {
    return next(new AppError('You are not logged in', 401))
  }

  // Verify the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

  // Check if user still exists
  const currentUser = await User.findById(decoded.id)
  if (!currentUser) {
    return next(new AppError('This user does no longer exist'))
  }

  // Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('Password has been changed. Please log in again'))
  }

  // Grant access to protected route
  req.user = currentUser
  res.locals.user = currentUser
  next()
})

// Check if there is a logged in user
// Only for rendered pages, no errors produced
// Very similar to "protect" ^see above
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // Verify the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      )

      // Check if user still exists
      const currentUser = await User.findById(decoded.id)
      if (!currentUser) {
        return next()
      }

      // Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next()
      }

      // If we get to this point there is a logged in user
      // Every pug template will have access to res.locals
      res.locals.user = currentUser
      return next()
    } catch (err) {
      return next()
    }
  }
  // If there is no cookie, there is no logged in user
  next()
}

// This function returns the actual middleware function
// We pass the roles into the function by wrapping it in a closure.
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      )
    }
    next()
  }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email })
  if (!user) {
    return next(new AppError('There is no user with that email address', 404))
  }

  // Generate the random reset token
  const resetToken = user.createPasswordResetToken()

  // Save to database without checking validators
  await user.save({ validateBeforeSave: false })

  // Send it back as an email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`

  try {
    await new Email(user, resetURL).sendPasswordReset()

    res.status(200).json({
      status: 'success',
      message: 'Token send to email',
    })
  } catch (err) {
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined

    // Save to database without checking validators
    await user.save({ validateBeforeSave: false })

    return next(
      new AppError('There was an error sending the email. Try again later', 500)
    )
  }
})

exports.resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  })

  // If token has not expired, and there is a user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400))
  }
  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  await user.save()

  // Update changedPasswordAt property for the user

  // Log the user in, send JWT to client
  createSendToken(user, 200, res)
})

exports.updatePassword = catchAsync(async (req, res, next) => {
  // Get user from the collection
  const user = await User.findById(req.user.id).select('+password')

  // Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401))
  }

  // If so, update password
  user.password = req.body.password
  user.passwordConfirm = req.body.passwordConfirm
  await user.save()

  // Log user in, send JWT
  createSendToken(user, 200, res)
})
