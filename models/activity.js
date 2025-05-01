const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['new', 'activated', 'updated', 'archived'] },
  email: { type: String, required: true },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Activity', activitySchema);