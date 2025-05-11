const express = require('express');
const router = express.Router();
const Evenement = require('../models/evenement');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Notification = require('../models/notification');
const Newsletter = require('../models/newsletter'); // Importer le modèle Newsletter
const sendEmail = require('../utils/sendEmail');

// Multer storage configuration
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
}).single('photo');

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Erreur Multer : ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// POST: Add a new event
router.post('/', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  try {
    const photo = req.file ? `/uploads/${req.file.filename}` : '';
    const { prix, ...otherFields } = req.body;
    const prixData = JSON.parse(prix || '{}');

    // Validate etablissementId exists and is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(otherFields.etablissementId)) {
      return res.status(400).json({ message: 'L\'ID de l\'établissement n\'est pas valide.' });
    }

    const evenement = new Evenement({
      ...otherFields,
      photo,
      prix: {
        estGratuit: prixData.estGratuit || false,
        montant: prixData.estGratuit ? 0 : (prixData.montant || 0)
      }
    });
    await evenement.save();

    // Populate etablissementId before sending response
    const populatedEvenement = await Evenement.findById(evenement._id).populate('etablissementId', 'nom type');
    if (!populatedEvenement) {
      return res.status(500).json({ message: 'Échec de la récupération des détails de l\'établissement.' });
    }

    // Notify all newsletter subscribers about the new event
    const subscribers = await Newsletter.find({});
    const emailPromises = subscribers.map(async (subscriber) => {
      const subject = 'Nouveau événement ajouté !';
      const html = `
        <h2>Nouveau événement sur notre site</h2>
        <p>Bonjour,</p>
        <p>Un nouvel événement a été ajouté : <strong>${evenement.nom}</strong>.</p>
        <p><strong>Date:</strong> ${new Date(evenement.dateDebut).toLocaleDateString('fr-FR')}</p>
        <p><strong>Lieu:</strong> ${evenement.lieu}</p>
        <p>Tu peux le vérifier sur notre site : <a href="http://localhost:4200/evenement">Voir les événements</a></p>
        <p>Cordialement,<br>L'équipe de gestion des événements</p>
      `;

      try {
        await sendEmail(subscriber.email, subject, html);
        console.log(`Email envoyé à ${subscriber.email} pour le nouvel événement ${evenement.nom}`);
      } catch (error) {
        console.error(`Erreur lors de l'envoi de l'email à ${subscriber.email}:`, error.message);
      }
    });

    await Promise.all(emailPromises);

    res.status(201).json(populatedEvenement);
  } catch (error) {
    console.error('Erreur détaillée lors de l\'ajout de l\'événement:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// GET: Retrieve all events
router.get('/', async (req, res) => {
  try {
    const evenements = await Evenement.find().populate('etablissementId', 'nom type');
    if (!evenements || evenements.length === 0) {
      return res.status(404).json({ message: 'Aucun événement trouvé.' });
    }
    res.json(evenements);
  } catch (error) {
    console.error('Erreur détaillée lors de la récupération des événements:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// GET: Retrieve a single event by ID
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    const evenement = await Evenement.findById(req.params.id).populate('etablissementId', 'nom type');
    if (!evenement) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    res.json(evenement);
  } catch (error) {
    console.error('Erreur détaillée lors de la récupération de l\'événement:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// PUT: Update an event
router.put('/:id', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  try {
    const evenement = await Evenement.findById(req.params.id);
    if (!evenement) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    const photo = req.file ? `/uploads/${req.file.filename}` : evenement.photo;
    const { prix, ...otherFields } = req.body;
    const prixData = JSON.parse(prix || '{}');

    // Validate etablissementId exists and is a valid ObjectId
    if (otherFields.etablissementId && !mongoose.Types.ObjectId.isValid(otherFields.etablissementId)) {
      return res.status(400).json({ message: 'L\'ID de l\'établissement n\'est pas valide.' });
    }

    Object.assign(evenement, {
      ...otherFields,
      photo,
      prix: {
        estGratuit: prixData.estGratuit || false,
        montant: prixData.estGratuit ? 0 : (prixData.montant || 0)
      }
    });
    await evenement.save();

    // Populate etablissementId before sending response
    const populatedEvenement = await Evenement.findById(evenement._id).populate('etablissementId', 'nom type');
    if (!populatedEvenement) {
      return res.status(500).json({ message: 'Échec de la récupération des détails de l\'établissement.' });
    }

    res.json(populatedEvenement);
  } catch (error) {
    console.error('Erreur détaillée lors de la mise à jour de l\'événement:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// PATCH: Archive an event
router.patch('/:id/archive', async (req, res) => {
  try {
    const evenement = await Evenement.findById(req.params.id);
    if (!evenement) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    evenement.statut = 'Terminé';
    await evenement.save();
    res.json(evenement);
  } catch (error) {
    console.error('Erreur détaillée lors de l\'archivage de l\'événement:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// POST: Register for event notification
router.post('/:id/notify', async (req, res) => {
  try {
    const { email } = req.body;
    const eventId = req.params.id;
    console.log('Received notification request:', { email, eventId });

    // Vérifier si l'événement existe
    const evenement = await Evenement.findById(eventId).populate('etablissementId', 'nom type');
    if (!evenement) {
      console.log('Event not found for ID:', eventId);
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Vérifier si une notification existe déjà
    const existingNotification = await Notification.findOne({ email, eventId });
    if (existingNotification) {
      return res.status(400).json({ message: 'Vous êtes déjà inscrit pour recevoir une notification pour cet événement.' });
    }

    // Créer une nouvelle notification
    const notification = new Notification({
      email,
      eventId,
      eventName: evenement.nom,
      eventDate: new Date(evenement.dateDebut),
    });

    await notification.save();
    console.log('Notification saved:', notification);
    res.status(201).json({ message: 'Notification enregistrée avec succès' });
  } catch (error) {
    console.error('Erreur détaillée lors de l\'enregistrement de la notification:', error);
    if (error.code === 11000) { // Duplicate key error
      res.status(400).json({ message: 'Vous êtes déjà inscrit pour recevoir une notification pour cet événement.' });
    } else {
      res.status(500).json({ message: error.message, stack: error.stack });
    }
  }
});

module.exports = router;