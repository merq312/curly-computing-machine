const crypto = require('crypto')
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')

// name, email, photo, password, passowrdConfirm
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
  },
  email: {
    type: String,
    required: [true, 'A user must have an e-mail'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid e-mail'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    // will not show up when queried for
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on "create" and "save" (not findOne, etc)
      validator: function (el) {
        return el === this.password
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
})

userSchema.pre('save', async function (next) {
  // Exit this function if password was not modified
  if (!this.isModified('password')) {
    return next()
  }

  // Salt and hash the password. 12 is the "salt length"
  this.password = await bcrypt.hash(this.password, 12)

  // Remove the passwordConfirm since it is not needed (and not hashed).
  // This will prevent it from being added to the database.
  this.passwordConfirm = undefined
})

userSchema.pre('save', function (next) {
  // Exit this function if password was not modified OR if document is new
  if (!this.isModified('password') || this.isNew) {
    return next()
  }

  // "- 1000" to prevent passwordChangedAt to ensure the JWT is always dated
  // after it because database entry can lag
  this.passwordChangedAt = Date.now() - 1000
  next()
})

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } })
  next()
})

// Instance method
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    )

    return JWTTimestamp < changedTimestamp
  }

  // False means password has not been changed
  return false
}

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex')

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000

  return resetToken
}

const User = mongoose.model('User', userSchema)

module.exports = User
