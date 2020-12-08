const mongoose = require("mongoose");
const slugify = require("slugify");
// const User = require("./userModel");
// const validator = require("validator");

const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "A tour must have a name"],
            unique: true,
            trim: true,
            maxlength: [40, "A tour name must have 40 or less chars"],
            minlength: [10, "A tour name must have 10 or more chars"],
            // validate: [
            //     validator.isAlpha,
            //     "A tour name must not contain numbers",
            // ],
        },
        slug: String,
        duration: {
            type: Number,
            required: [true, "A tour must have a duration"],
        },
        maxGroupSize: {
            type: Number,
            required: [true, "A tour must have a group size"],
        },
        difficulty: {
            type: String,
            required: [true, "A tour must have a difficulty"],
            enum: {
                values: ["easy", "medium", "difficult"],
                message: "Difficulty is one of: easy, medium or difficult",
            },
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            min: [1, "Rating must be above 1.0"],
            max: [5, "Rating must be below 5.0"],
            set: (val) => Math.round(val * 10) / 10, // round to one decimal
        },
        ratingsQuantity: {
            type: Number,
            default: 0,
        },
        price: {
            type: Number,
            required: [true, "A tour must have a price"],
        },
        priceDiscount: {
            type: Number,
            validate: {
                validator: function (val) {
                    // "this" only points to current doc on new document creation
                    // ie- validator does not work on the update function
                    return val < this.price;
                },
                message:
                    "Discount price ({VALUE}) should be less than regular price",
            },
        },
        summary: {
            type: String,
            trim: true,
            required: [true, "A tour must have a description"],
        },
        description: {
            type: String,
            trim: true,
        },
        imageCover: {
            type: String,
            required: [true, "A tour must have a cover image"],
        },
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
            select: false,
        },
        startDates: [Date],
        secretTour: {
            type: Boolean,
            default: false,
        },
        startLocation: {
            // GeoJSON
            type: {
                type: String,
                default: "Point",
                enum: ["Point"],
            },
            coordinates: [Number],
            address: String,
            description: String,
        },
        locations: [
            {
                type: {
                    type: String,
                    default: "Point",
                    enum: ["Point"],
                },
                coordinates: [Number],
                address: String,
                description: String,
                day: Number,
            },
        ],
        // guides: Array, // (used in the embedding example)
        guides: [
            {
                type: mongoose.Schema.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Database indexing (to imporve query performance)
// Only index fields that will be queried frequently. Having too many indices
// casues the database to bloat and slows write performance.
// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
// required for geospatial querying
tourSchema.index({ startLocation: "2dsphere" });

// VIRTUAL PROPERTIES
tourSchema.virtual("durationWeeks").get(function () {
    return this.duration / 7;
});

// VIRTUAL POPULATE : mongoose will populate the parent document with it's
// children without having to reference them in the schema.
// This means this data will not persist in the database.
tourSchema.virtual("reviews", {
    ref: "Review",
    foreignField: "tour",
    localField: "_id",
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre("save", function (next) {
    this.slug = slugify(this.name, { lowerr: true });
    next();
});

// Example: if we were to embed guides instead of referencing
// tourSchema.pre("save", async function (next) {
//     const guidesPromises = this.guides.map(async (id) => User.findById(id));
//     this.guides = await Promise.all(guidesPromises);

//     next();
// });

// tourSchema.pre("save", function (next) {
//     console.log("Will save document...");
//     next();
// });

// tourSchema.post("save", function (doc, next) {
//     console.log(doc);
//     next();
// });

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
    this.find({ secretTour: { $ne: true } });

    this.start = Date.now();
    next();
});

tourSchema.pre(/^find/, function (next) {
    // populate fills any referenced documents to seem as if they were embedded
    // also lets you remove anything you don't want to return
    this.populate({
        path: "guides",
        select: "-__v -passwordChangedAt",
    });

    next();
});

tourSchema.post(/^find/, function (docs, next) {
    console.log(`Query took ${Date.now() - this.start} milliseconds`);
    // console.log(docs);
    next();
});

// AGGREGATION MIDDLEWARE
// tourSchema.pre("aggregate", function (next) {
//     // add this stage before all the other stages
//     this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//     console.log(this.pipeline());
//     next();
// });

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
