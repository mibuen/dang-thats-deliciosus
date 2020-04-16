const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const promisify = require('es6-promisify');

const User = mongoose.model('User');

const login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login! 👎',
  successRedirect: '/',
  successFlash: 'You are Logged in 👍',
});

const logout = (req, res) => {
  req.logout();
  req.flash('success', 'Good By, You logged out! 👋');
  res.redirect('/');
};
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', '🤯 Please log in');
  res.redirect('/login');
};

const forgot = async (req, res) => {
  // 1 check if email user exists
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash('error', 'No account exists.');
    return res.redirect('/login');
  }
  // 2 if user exists then Set reset tokens with expiration
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save();

  // 3 send email with the token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  // 4 after user responds to email redirect to login page
  req.flash('success', `check email with password reset ${resetURL}`);
  res.redirect('/login');
  // if user does not exist flash message
};
const reset = async (req, res) => {
  // 1 find iftoken exists
  // 2 check expiration
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }
  res.render('reset', { title: 'Reset your Password' });
};
const confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    return next();
  }
  req.flash('error', 'Passwords do not match!');
  res.redirect('back');
};
const update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash(
    'success',
    '👏 Password reset completed!, You are now logged in! 👍'
  );
  res.redirect('/');
};

module.exports = {
  login,
  logout,
  isLoggedIn,
  forgot,
  reset,
  confirmedPasswords,
  update,
};
