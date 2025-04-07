const mongoose = require('mongoose');

const termsSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true }, // Version des conditions (ex: "1.0")
  content: { type: String, required: true }, // Contenu des conditions
  lastUpdated: { type: Date, default: Date.now } // Date de la dernière mise à jour
});

module.exports = mongoose.model('Terms', termsSchema);