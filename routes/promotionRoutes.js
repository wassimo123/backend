const express = require('express');
const router = express.Router();
const Promotion = require('../models/promotion');
const Etablissement = require('../models/etablissement');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Newsletter = require('../models/newsletter');
const sendEmail = require('../utils/sendEmail'); 


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

router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { name, etablissementId, discount, startDate, endDate, status, type, code, limit, description, conditions, prixAvant, prixApres } = req.body;
    const photo = req.file ? `/Uploads/${req.file.filename}` : undefined;
    // Validate etablissementId
    const etablissement = await Etablissement.findById(etablissementId);
    if (!etablissement) {
      return res.status(400).json({ message: 'Établissement non trouvé' });
    }
    let parsedConditions;
    try {
      parsedConditions = conditions ? JSON.parse(conditions) : {};
    } catch (parseError) {
      return res.status(400).json({ message: 'Invalid conditions format' });
    }
     // ✅ Fallback pour "days"
     if (!parsedConditions.days) {
      parsedConditions.days = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      };
    }

    const promotion = new Promotion({
      name,
      etablissementId,
      discount,
      startDate,
      endDate,
      status,
      type,
      code: code || undefined,
      limit: limit ? parseInt(limit) : undefined,
      description: description || undefined,
      photo,
      prixAvant: prixAvant ? parseFloat(prixAvant) : undefined,
      prixApres: prixApres ? parseFloat(prixApres) : undefined,
      conditions: parsedConditions // ✅ pas de reparse
    });

    await promotion.save();

 // Send email to all newsletter subscribers
    try {
      const subscribers = await Newsletter.find({}, 'email');
      const subject = `🎉 Nouvelle promotion sur notre site : ${name}`;
      const html = `
        <h2>Nouvelle promotion disponible !</h2>
        <p>Bonjour,</p>
        <p>Une nouvelle promotion vient d'être ajoutée sur le portail de Sfax :</p>
        <p><strong>${name}</strong></p>
        <p>${description || 'Découvrez cette offre exclusive !'}</p>
        <p><strong>Code promo :</strong> ${code || 'Aucun'}</p>
        <p><strong>Valable jusqu'au :</strong> ${new Date(endDate).toLocaleDateString('fr-FR')}</p>
        <p><a href="http://localhost:4200/promotion" style="display: inline-block; padding: 10px 20px; background-color: #5B5BD6; color: white; text-decoration: none; border-radius: 5px;">Voir la promotion</a></p>
        <br>
        <p>À bientôt !<br>L’équipe du portail de Sfax</p>
      `;

      for (const subscriber of subscribers) {
        try {
          await sendEmail(subscriber.email, subject, html);
          console.log(`E-mail envoyé à ${subscriber.email} pour la nouvelle promotion ${name}`);
        } catch (emailError) {
          console.error(`Erreur lors de l'envoi de l'e-mail à ${subscriber.email} :`, emailError);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi des e-mails de notification de promotion :', error);
    }




    res.status(201).json(promotion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


router.get('/', async (req, res) => {
  try {
    const promotions = await Promotion.find().sort({ createdAt: -1 });
    const today = new Date();

    const updatedPromotions = await Promise.all(
      promotions.map(async (promo) => {
        const etablissement = await Etablissement.findById(promo.etablissementId).select('nom type');
        const promoObj = promo.toObject();

        // Mise à jour du statut si expiré
        if (promo.status === 'active' && new Date(promo.endDate) < today) {
          promo.status = 'expired';
          await promo.save(); //  met à jour MongoDB
          promoObj.status = 'expired';
        }

        promoObj.etablissementName = etablissement ? etablissement.nom : null;
        promoObj.etablissementType = etablissement ? etablissement.type : null;

        return promoObj;
      })
    );

    res.json(updatedPromotions);
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

router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const { name, etablissementId, discount, startDate, endDate, status, type, code, limit, description, conditions, prixAvant, prixApres } = req.body;

    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion non trouvée' });
      // Validate etablissementId
    const etablissement = await Etablissement.findById(etablissementId);
    if (!etablissement) {
      return res.status(400).json({ message: 'Établissement non trouvé' });
    }
    }

    const updatedPhoto = req.file ? `/Uploads/${req.file.filename}` : promotion.photo;
    let parsedConditions;
    try {
      parsedConditions = conditions ? JSON.parse(conditions) : promotion.conditions;
    } catch (parseError) {
      return res.status(400).json({ message: 'Invalid conditions format' });
    }

    promotion.name = name;
    promotion.etablissementId = etablissementId;
    promotion.discount = discount;
    promotion.startDate = startDate;
    promotion.endDate = endDate;
    promotion.status = status;
    promotion.type = type;
    promotion.code = code || undefined;
    promotion.limit = limit ? parseInt(limit) : undefined;
    promotion.description = description || undefined;
    promotion.photo = updatedPhoto;
    promotion.prixAvant = prixAvant ? parseFloat(prixAvant) : undefined;
    promotion.prixApres = prixApres ? parseFloat(prixApres) : undefined;
    promotion.conditions = typeof conditions === 'string' ? JSON.parse(conditions) : conditions;


    await promotion.save();
    res.json(promotion);
  } catch (error) {
    console.error('Erreur PUT /promotions/:id:', error);
    res.status(500).json({ message: 'Erreur interne', error: error.message });
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
