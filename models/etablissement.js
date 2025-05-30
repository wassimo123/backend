const mongoose = require('mongoose');

const jourHoraireSchema = new mongoose.Schema({
  open: { type: String, default: '' },
  close: { type: String, default: '' },
  closed: { type: Boolean, default: false }
}, { _id: false });

const horairesSchema = new mongoose.Schema({
  lundi: jourHoraireSchema,
  mardi: jourHoraireSchema,
  mercredi: jourHoraireSchema,
  jeudi: jourHoraireSchema,
  vendredi: jourHoraireSchema,
  samedi: jourHoraireSchema,
  dimanche: jourHoraireSchema,
  is24_7: { type: Boolean, default: false },
  specialHours: { type: String, default: '' }
}, { _id: false });

const reseauxSociauxSchema = new mongoose.Schema({
  facebook: { type: String, default: '' },
  instagram: { type: String, default: '' },
  twitter: { type: String, default: '' },
  linkedin: { type: String, default: '' }
}, { _id: false });


const etablissementSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  adresse: { type: String, required: true },
  type: { type: String, required: true, enum: ['Restaurant', 'Hôtel',  'Café', ] },
  statut: { type: String, required: true, enum: ['Actif', 'En attente', 'Inactif', 'Archivé'], default: 'Actif' },
  visibility: { type: String, default: 'public', enum: ['public'] },
  codePostal: { type: String },
  ville: { type: String },
  pays: { type: String, default: 'Tunisie' },
  showMap: { type: Boolean, default: false },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  },
  telephone: { type: String, default: '' },
  email: { type: String, default: '' },
  siteWeb: { type: String, default: '' },
  reseauxSociaux: { type: reseauxSociauxSchema, default: () => ({}) },
  description: { type: String, default: '' },
  services: { type: [String], default: [] },
  horaires: { type: horairesSchema, default: () => ({}) },
  photos: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Etablissement', etablissementSchema);