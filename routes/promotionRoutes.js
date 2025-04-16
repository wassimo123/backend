const express = require('express');
const router = express.Router();
const Promotion = require('../models/promotion');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration de Multer pour l'upload des photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Dossier où les photos seront stockées
  },
  filename: (req, file, cb) => {
    // Générer un nom unique pour éviter les conflits
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB par fichier
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

// Créer une nouvelle promotion
router.post('/', upload.array('photos', 5), async (req, res) => {
  try {
    const { name, establishmentId, discount, startDate, endDate, status, type, code, limit, description, conditions } = req.body;

    // Récupérer les chemins des photos uploadées
    const photos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const promotion = new Promotion({
      name,
      establishmentId: parseInt(establishmentId),
      discount,
      startDate,
      endDate,
      status: status || 'pending', // Changé de 'draft' à 'pending'
      type,
      code: code || undefined,
      limit: limit ? parseInt(limit) : undefined,
      description: description || undefined,
      photos,
      conditions: JSON.parse(conditions) // Les conditions sont envoyées sous forme de chaîne JSON
    });

    await promotion.save();
    res.status(201).json(promotion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Obtenir toutes les promotions
router.get('/', async (req, res) => {
  try {
    const promotions = await Promotion.find();
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtenir une promotion par ID
router.get('/:id', async (req, res) => {
  try {
    // Vérifier si l'ID est un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }
    res.json(promotion);
  } catch (error) {
    // Si une autre erreur se produit, renvoyer un message générique
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de la promotion' });
  }
});

// Mettre à jour une promotion
router.put('/:id', upload.array('photos', 5), async (req, res) => {
  try {
    const { name, establishmentId, discount, startDate, endDate, status, type, code, limit, description, conditions, existingPhotos } = req.body;

    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
    }

    // Ajouter les nouvelles photos aux photos existantes
    const parsedExistingPhotos = existingPhotos ? JSON.parse(existingPhotos) : [];
    const newPhotos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    const updatedPhotos = [...parsedExistingPhotos, ...newPhotos];

    // Mettre à jour les champs
    promotion.name = name;
    promotion.establishmentId = parseInt(establishmentId);
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

// Archiver une promotion (changer le statut à "expired")
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