const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Tour = require('../models/tourModel')
const Booking = require('../models/bookingModel')
const catchAsync = require('../utils/catchAsync')
const factory = require('./handlerFactory')

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId)

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [],
          },
          unit_amount: tour.price * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    // Note: Not secure. When in production we use Stripe Webhooks to get access to
    // the session object and use it to create a new booking. This is a work-around for dev
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
  })

  // Send it to client as response
  res.status(200).json({
    status: 'success',
    session,
  })
})

// Dev only
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = req.query

  if (!tour && !user && !price) {
    return next()
  }

  await Booking.create({ tour, user, price })

  // Redirect to homepage
  res.redirect(req.originalUrl.split('?')[0])
})

exports.createBooking = factory.createOne(Booking)
exports.getBooking = factory.getOne(Booking)
exports.getAllBookings = factory.getAll(Booking)
exports.updateBooking = factory.updateOne(Booking)
exports.deleteBooking = factory.deleteOne(Booking)
