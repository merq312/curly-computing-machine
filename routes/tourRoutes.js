const express = require('express')
const tourController = require('../controllers/tourController')
const authController = require('../controllers/authController')
const reviewRouter = require('./reviewRoutes')

const router = express.Router()

// Nested route tour(review())
// const reviewController = require("../controllers/reviewController");
// router
//     .route("/:tourId/reviews")
//     .post(
//         authController.protect,
//         authController.restrictTo("user"),
//         reviewController.createReview
//     );

// Mount the reviewRouter onto this path,
// instead of calling the reviewController from this router (see above)
router.use('/:tourId/reviews', reviewRouter)

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours)

router.route('/tour-stats').get(tourController.getTourStats)
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  )

// Alternatively using query strings instead of query params
// /tours-within?distance=zz&center=xx,yy&unit=mi
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin)

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances)

// General routes
router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  )

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  )

module.exports = router
