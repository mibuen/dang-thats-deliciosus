const mongoose = require('mongoose');

const Store = mongoose.model('Store');
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
  const stores = await Store.find();
  res.render('stores', { title: 'Stores', stores });
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
    'author'
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
};
