const mongoose = require('mongoose');

const privacySchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Privacy', privacySchema, 'privacies' );