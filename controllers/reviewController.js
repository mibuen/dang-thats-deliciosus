const mongoose = require('mongoose');

const Review = mongoose.model('Review');

const addReview = async (req, res) => {
  req.body.author = req.user._id;
  req.body.store = req.params.id;
  await new Review(req.body).save();
  req.flash('success', 'Review was saved');
  res.redirect('back');
};

module.exports = {
  addReview,
};
