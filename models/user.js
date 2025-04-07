const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  matriculeFiscale: { type: String, required: true, unique: true },
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  confirmPassword: { type: String }, // En clair, pour correspondre à votre structure actuelle
  telephone: { type: String, required: true },
  adresse: { type: String, required: true },
  dateCreation: { type: String, required: true },
  isArchived: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  termsAccepted: { type: Boolean, required: true, default: false }, // Acceptation des conditions
  termsAcceptedAt: { type: Date, default: Date.now },
  termsVersion: { type: String, required: true },
});

module.exports = mongoose.model('User', userSchema);