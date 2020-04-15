const passport = require('passport');

const login = passport.authenticate('local', {
  successRedirect: '/',
  successFlash: 'You are Logged in 👍',
  failureRedirect: '/login',
  failureFlash: 'Failed Login! 👎',
});

module.exports = login;
