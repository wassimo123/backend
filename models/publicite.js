const mongoose = require('mongoose');

const publiciteSchema = new mongoose.Schema({
  etablissementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Etablissement' },
  utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  nom: { type: String, required: true },
  typeEtablissement: { type: String, required: true },
  description: { type: String },
  pack: { type: String, required: true },
  statut: { type: String, default: 'En attente', enum: ['En attente', 'Acceptée', 'Refusée'] },
}, { timestamps: true });

module.exports = mongoose.model('Publicite', publiciteSchema);