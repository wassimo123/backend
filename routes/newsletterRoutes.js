const express = require('express');
  const router = express.Router();
  const Newsletter = require('../models/newsletter');

  // POST route to subscribe to the newsletter
  router.post('/subscribe', async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Email is required' });
    }

    try {
      // Check if the email already exists
      const existingSubscription = await Newsletter.findOne({ email });
      if (existingSubscription) {
        return res.status(400).json({ status: 'error', message: 'Cet email est déjà inscrit à la newsletter.' });
      }

      // Create a new subscription
      const subscription = new Newsletter({ email });
      await subscription.save();

      res.status(201).json({ status: 'success', message: 'Inscription réussie à la newsletter !' });
    } catch (error) {
      console.error('Erreur lors de l\'inscription à la newsletter:', error);
      res.status(500).json({ status: 'error', message: 'Erreur serveur lors de l\'inscription.' });
    }
  });

  // GET route to retrieve all subscribed emails
router.get('/subscribers', async (req, res) => {
  try {
    const subscribers = await Newsletter.find({}, 'email');
    res.json(subscribers.map(sub => sub.email));
  } catch (error) {
    console.error('Erreur lors de la récupération des abonnés:', error);
    res.status(500).json({ status: 'error', message: 'Erreur serveur lors de la récupération des abonnés.' });
  }
});

  module.exports = router;