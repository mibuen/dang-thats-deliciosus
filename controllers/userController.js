const mongoose = require('mongoose');

const User = mongoose.model('User');
const promisify = require('es6-promisify');

const loginForm = (req, res) => {
  res.render('login', { title: 'login' });
};

const registerForm = (req, res) => {
  res.render('register', { title: 'Register' });
};

const validateRegister = (req, res, next) => {
  req.sanitizeBody('name');
  req.checkBody('name', 'You must enter your  name!').notEmpty();
  req.checkBody('email', 'Email is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false,
  });
  req.checkBody('password', 'Enter a password!!!').notEmpty();
  req.checkBody('password-confirm', 'Enter password confirmation').notEmpty();
  req
    .checkBody('password-confirm', 'passwords do not match!!')
    .equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    req.flash(
      'error',
      errors.map(err => err.msg)
    );
    res.render('register', {
      title: 'Register',
      body: req.body,
      flashes: req.flash(),
    });
    return; // to stop running
  }
  next(); // there were no errors
};

const registerUser = async (req, res, next) => {
  const user = new User({ email: req.body.email, name: req.body.name });
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  res.json(req.body.password);
  // next(); // pass to authController.login
};

module.exports = {
  loginForm,
  registerForm,
  validateRegister,
  registerUser,
};
