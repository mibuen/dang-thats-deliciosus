const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      trim: true,
      required: 'Please enter a Store Name!',
    },
    slug: String, // generated before saving
    description: {
      type: String,
      trim: true,
    },
    tags: [String],
    storeCreated: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: {
        type: String,
        default: 'Point',
      },
      coordinates: [
        {
          type: Number,
          required: 'You must supply coordinates',
        },
      ],
      storeAddress: {
        type: String,
        required: 'You must enter Address!',
      },
    },
    photo: String,
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: 'You must supply an author',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Define Indexes
storeSchema.index({
  storeName: 'text',
  description: 'text',
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function(next) {
  if (!this.isModified('storeName')) {
    next();
    return;
  }
  this.slug = slug(this.storeName);
  // find other stores with same or similar slug
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');

  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};
storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    // 1 lookup for stores and populate thei reviews
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'store',
        as: 'reviews',
      },
    },
    // 2 filter for only items that have 2 or more reviews
    { $match: { 'reviews.1': { $exists: true } } },
    // 3 add the average reviews field
    {
      $project: {
        photo: '$$ROOT.photo',
        storeName: '$$ROOT.storeName',
        slug: '$$ROOT.slug',
        reviews: '$$ROOT.reviews',
        averageRating: { $avg: '$reviews.rating' },
      },
    },
    // 4 sort it by average  field, highest to lowest
    { $sort: { averageRating: -1 } },
    // 5 limit to 10
    { $limit: 10 },
  ]);
};

// find rthe reviews for the store stores -id === reviews store property

storeSchema.virtual('reviews', {
  ref: 'Review', // model to link
  localField: '_id', // field in the store
  foreignField: 'store',
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
