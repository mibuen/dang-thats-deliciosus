const passport = require('passport');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login! 👎',
  successRedirect: '/',
  successFlash: 'You are Logged in 👍',
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'Good By, You logged out!');
  res.redirect('/');
};

// module.exports = {
//   login,
//   logout,
// };
