const express = require('express');
const router = express.Router();
const Promotion = require('../models/promotion');
const Etablissement = require('../models/etablissement');
const Evenement = require('../models/evenement');

router.get('/', async (req, res) => {
  const query = req.query.q ? req.query.q.toString().trim() : '';

  try {
    const searchRegex = new RegExp(query, 'i');
    let suggestions = [];

    // Fetch suggestions from promotions
    const promotionSuggestions = await Promotion.find({
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { code: searchRegex }
      ]
    })
      .limit(3)
      .distinct('name');

    // Fetch suggestions from etablissements
    const etablissementSuggestions = await Etablissement.find({
      $or: [
        { nom: searchRegex },
        { description: searchRegex }
      ]
    })
      .limit(3)
      .distinct('nom');

    // Fetch suggestions from evenements
    const evenementSuggestions = await Evenement.find({
      $or: [
        { titre: searchRegex },
        { description: searchRegex }
      ]
    })
      .limit(3)
      .distinct('titre');

    // Combine and deduplicate suggestions
    suggestions = [...new Set([
      ...promotionSuggestions,
      ...etablissementSuggestions,
      ...evenementSuggestions
    ])].slice(0, 5); // Limit to 5 suggestions

    res.json({ status: 'success', suggestions });
  } catch (error) {
    console.error('Error in suggestions:', error);
    res.status(500).json({ status: 'error', message: 'Server error during suggestions' });
  }
});

module.exports = router;