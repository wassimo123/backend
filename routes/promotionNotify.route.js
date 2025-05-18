const express = require('express');
const router = express.Router();
const Promotion = require('../models/promotion');
const PromoNotification = require('../models/promoNotification');
const sendEmail = require('../utils/sendEmail');

router.post('/promotion-notify', async (req, res) => {
  const { email, promotionId } = req.body;

  // Validation de l'e-mail
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Adresse e-mail invalide' });
  }

  if (!promotionId) {
    return res.status(400).json({ message: 'ID de promotion requis' });
  }

  try {
    const promotion = await Promotion.findById(promotionId);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion introuvable' });
    }

    // Vérifier si l'utilisateur est déjà inscrit
    const existing = await PromoNotification.findOne({ email, promotionId });
    if (existing) {
      return res.status(400).json({ message: 'Vous êtes déjà inscrit pour cette promotion' });
    }

    // Créer la notification
    const notification = new PromoNotification({
      email,
      promotionId,
      promotionName: promotion.name,
      endDate: promotion.endDate,
    });

    await notification.save();

    // Envoyer un e-mail de confirmation immédiat
    const subject = `Confirmation d'inscription pour la promotion "${promotion.name}"`;
    const html = `
      <h2>Inscription confirmée</h2>
      <p>Bonjour,</p>
      <p>Vous êtes inscrit pour recevoir un rappel pour la promotion <strong>${promotion.name}</strong>.</p>
      <p>Un e-mail de rappel vous sera envoyé un jour avant l'expiration de la promotion, prévue pour le <strong>${new Date(promotion.endDate).toLocaleDateString('fr-FR')}</strong>.</p>
      <p>Code promo : ${promotion.code || 'Aucun'}</p>
      <br>
      <p>À bientôt !<br>L’équipe du portail de Sfax</p>
    `;

    try {
      await sendEmail(email, subject, html);
      console.log(`E-mail de confirmation envoyé à ${email} pour ${promotion.name}`);
    } catch (emailError) {
      console.error(`Erreur lors de l'envoi de l'e-mail de confirmation à ${email} :`, emailError);
      // Ne pas bloquer la réponse si l'e-mail échoue
    }

    res.status(201).json({ message: 'Inscription à la notification enregistrée avec succès. Un e-mail de confirmation a été envoyé.' });
  } catch (error) {
    console.error('Erreur lors de l’inscription à la notification :', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;