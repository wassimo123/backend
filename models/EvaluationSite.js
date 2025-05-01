const mongoose = require('mongoose');

// Schéma pour un avis individuel
const avisSchema = new mongoose.Schema({
  utilisateur: { type: String, default: 'Anonyme' }, // Non requis, défaut à 'Anonyme'
  note: { type: Number, required: true, min: 1, max: 5 },
  commentaire: { type: String, required: true }
});

// Schéma pour l'évaluation globale
const evaluationSchema = new mongoose.Schema({
  score: { type: Number, default: 0 }, // Changé en Number pour les calculs
  scoreTotal: { type: Number, default: 0 },
  nombreVotes: { type: Number, default: 0 },
  avis: [avisSchema]
});

module.exports = mongoose.model('EvaluationSite', evaluationSchema, 'evaluationsites');