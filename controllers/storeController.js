const mongoose = require('mongoose');

const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'File type not allowed' }, false);
    }
  },
};

const homePage = (req, res) => {
  res.render('index');
};

const addStore = (req, res) => res.render('editStore', { title: 'Add Store' });

const upload = multer(multerOptions).single('photo');

const resize = async (req, res, next) => {
  if (!req.file) {
    next();
    return;
  }

  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  next();
};

const createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await new Store(req.body).save();
  req.flash(
    'success',
    `Succesfully created ${store.storeName}. Care to leave a review?`
  );
  res.redirect(`/store/${store.slug}`);
};

const getstores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = page * limit - limit;
  const storesPromise = Store.find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });
  const countPromise = Store.count();
  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  if (!stores.length && skip) {
    req.flash(
      'info',
      `Hey! page ${page} do not exists, here is the last page ${pages}`
    );
    res.redirect(`/stores/page/${pages}`);
  }
  res.render('stores', { title: 'Stores', stores, page, pages, count });
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You are not the Author of the store');
  }
};

const editStore = async (req, res) => {
  const store = await Store.findById(req.params.id);
  confirmOwner(store, req.user);
  res.render('editStore', { title: `Edit ${store.storeName}`, store });
};

const updateStore = async (req, res) => {
  req.body.location.type = 'Point';
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true,
    runValidators: true,
  }).exec();
  req.flash(
    'success',
    `Succesfully updated <strong>${store.storeName}</$trong>
    <a href="/stores/${store.slug}">View Store -> </a>`
  );
  res.redirect(`/stores/${store._id}/edit`);
};

const getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate(
    'author reviews'
  );
  if (!store) return next();
  // res.json(store);
  res.render('store', { store, title: store.storeName });
};

const getStoresByTags = async (req, res) => {
  const { tag } = req.params;
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  // res.json(result);
  res.render('tags', { tags, title: 'Tags', tag, stores });
};

const searchStores = async (req, res) => {
  const stores = await Store.find(
    {
      $text: {
        $search: req.query.q,
      },
    },
    {
      score: { $meta: 'textScore' },
    }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(5);
  res.json(stores);
};
const mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates,
        },
        $maxDistance: 16600,
      },
    },
  };
  const stores = await Store.find(q)
    .select('slug storeName description location photo')
    .limit(10);
  res.json(stores);
};
const mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

const heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { [operator]: { hearts: req.params.id } },
    { new: true }
  );
  res.json(user);
};

const getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts },
  });
  res.render('stores', { title: 'Hearted Stores', stores });
};

const getTopStores = async (req, res) => {
  const stores = await Store.getTopStores(); // this is a function at the Store model
  // res.json(stores);
  res.render('topStores', { stores, title: '★ Top stores!' });
};
module.exports = {
  homePage,
  addStore,
  createStore,
  getstores,
  editStore,
  updateStore,
  upload,
  resize,
  getStoreBySlug,
  getStoresByTags,
  searchStores,
  mapStores,
  mapPage,
  heartStore,
  getTopStores,
  getHearts,
};
