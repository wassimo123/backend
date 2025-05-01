const mongoose = require('mongoose'); // Add this line to import mongoose

const notificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Veuillez entrer un email valide'],
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evenement',
    required: true,
  },
  eventName: {
    type: String,
    required: true,
  },
  eventDate: {
    type: Date,
    required: true,
  },
  isSent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add a unique index on email and eventId to prevent duplicates
notificationSchema.index({ email: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Notification', notificationSchema);