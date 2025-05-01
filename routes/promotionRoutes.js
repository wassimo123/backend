const express = require('express');
const router = express.Router();
const Promotion = require('../models/promotion');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
      return cb(null, true);
    } else {
      cb(new Error('Seules les images (JPEG, PNG, GIF) sont autorisées !'));
    }
  }
});

router.post('/', upload.array('photos', 5), async (req, res) => {
  try {
    const { name, establishmentId, discount, startDate, endDate, status, type, code, limit, description, conditions } = req.body;
    const photos = req.files ? req.files.map(file => `/Uploads/${file.filename}`) : [];

    const promotion = new Promotion({
      name,
      establishmentId, // Pas de parseInt, reste une string
      discount,
      startDate,
      endDate,
      status: status || 'pending',
      type,
      code: code || undefined,
      limit: limit ? parseInt(limit) : undefined,
      description: description || undefined,
      photos,
      conditions: JSON.parse(conditions)
    });

    await promotion.save();
    res.status(201).json(promotion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const promotions = await Promotion.find();
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }
    res.json(promotion);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la promotion' });
  }
});

router.put('/:id', upload.array('photos', 5), async (req, res) => {
  try {
    const { name, establishmentId, discount, startDate, endDate, status, type, code, limit, description, conditions, existingPhotos } = req.body;

    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    const parsedExistingPhotos = existingPhotos ? JSON.parse(existingPhotos) : [];
    const newPhotos = req.files ? req.files.map(file => `/Uploads/${file.filename}`) : [];
    const updatedPhotos = [...parsedExistingPhotos, ...newPhotos];

    promotion.name = name;
    promotion.establishmentId = establishmentId; // Pas de parseInt, reste une string
    promotion.discount = discount;
    promotion.startDate = startDate;
    promotion.endDate = endDate;
    promotion.status = status;
    promotion.type = type;
    promotion.code = code || undefined;
    promotion.limit = limit ? parseInt(limit) : undefined;
    promotion.description = description || undefined;
    promotion.photos = updatedPhotos;
    promotion.conditions = JSON.parse(conditions);

    await promotion.save();
    res.json(promotion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/:id/archive', async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    promotion.status = 'expired';
    await promotion.save();
    res.json({ message: 'Promotion archivée avec succès', promotion });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;