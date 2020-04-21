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

// find rthe reviews for the store stores -id === reviews store property

storeSchema.virtual('reviews', {
  ref: 'Review', // model to link
  localField: '_id', // field in the store
  foreignField: 'store',
});

module.exports = mongoose.model('Store', storeSchema);
