
const mongoose = require('mongoose');

const evenementSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  dateDebut: { type: Date, required: true },
  dateFin: { type: Date, required: true },
  heureDebut: { type: String, required: true },
  heureFin: { type: String },
  lieu: { type: String, required: true },
  ville: { type: String, required: true },
  capacite: { type: Number, required: true },
  categorie: { type: String, required: true },
  organisateur: { type: String },
  description: { type: String },
  estPublic: { type: Boolean, default: true },
  statut: { type: String, enum: ['À venir', 'En cours', 'Terminé'], required: true },
  etablissementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Etablissement', required: true },
  photo: { type: String },
  prix: {
    estGratuit: { type: Boolean, required: true, default: false },
    montant: { type: Number, required: function() { return !this.prix.estGratuit; } }
  }
}, { timestamps: true });

module.exports = mongoose.model('Evenement', evenementSchema);