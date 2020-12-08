const mongoose = require("mongoose");
const Tour = require("./tourModel");

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, "Review cannot be empty"],
        },
        rating: {
            type: Number,
            max: 5,
            min: 1,
        },
        createdAt: {
            type: Date,
            default: Date.now(),
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: "Tour",
            required: [true, "Review must belong to a tour"],
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: [true, "Review must belong to a user"],
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes: This forces each combination of tour and user to be unique
// (No duplicate reviews)
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
    // Commenting this out so that we don't get a chain of referencing when
    // querying for a tour
    // this.populate({
    //     path: "tour",
    //     select: "name",
    // });
    this.populate({
        path: "user",
        select: "name photo",
    });

    next();
});

// The following functions calculate and update the ratings average when reviews
// are added, removed or modified.
// STATIC METHODS
reviewSchema.statics.calcAverageRatings = async function (tourId) {
    const stats = await this.aggregate([
        {
            $match: { tour: tourId },
        },
        {
            $group: {
                _id: "$tour",
                nRatings: { $sum: 1 },
                avgRating: { $avg: "$rating" },
            },
        },
    ]);
    // console.log(stats);

    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRatings,
            ratingsAverage: stats[0].avgRating,
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5,
        });
    }
};

// Use "post" instead of "pre" here because the document is not available to the
// collection during "pre"
reviewSchema.post("save", function () {
    // 'this' points to the current review

    // Want to use Review.calcAverageRatings but Review doesn't exist yet!
    this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate
// findByIdAndDelete
// findByIdAndX is simply a shorthand for findOneAndX with the current id
// Note: we can't use "post" here because the query will not be available anymore
reviewSchema.pre(/^findOneAnd/, async function (next) {
    // Neat trick to extract the review object from the query
    this.r = await this.findOne();
    // console.log(this.r);

    next();
});

// We are passing the review ("r") from the "pre" to the "post" middleware
reviewSchema.post(/^findOneAnd/, async function (next) {
    await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
