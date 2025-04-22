const express = require('express');
const router = express.Router();
const Evenement = require('../models/evenement');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images (JPEG, PNG, GIF) sont autorisées !'));
    }
  }
});

router.post('/', upload.array('photos', 5), async (req, res) => {
  try {
    const photos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    const evenement = new Evenement({ ...req.body, photos });
    await evenement.save();
    res.status(201).json(evenement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const evenements = await Evenement.find();
    res.json(evenements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    const evenement = await Evenement.findById(req.params.id);
    if (!evenement) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    res.json(evenement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', upload.array('photos', 5), async (req, res) => {
    try {
      const evenement = await Evenement.findById(req.params.id);
      if (!evenement) {
        return res.status(404).json({ message: 'Événement non trouvé' });
      }
      const photos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : evenement.photos;
      Object.assign(evenement, { ...req.body, photos });
      await evenement.save();
      res.json(evenement);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  router.patch('/:id/archive', async (req, res) => {
    try {
      const evenement = await Evenement.findById(req.params.id);
      if (!evenement) {
        return res.status(404).json({ message: 'Événement non trouvé' });
      }
      evenement.statut = 'Terminé';
      await evenement.save();
      res.json(evenement); // Return only the event
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

module.exports = router;