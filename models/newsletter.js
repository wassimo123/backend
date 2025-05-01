const mongoose = require('mongoose');

  const newsletterSchema = new mongoose.Schema({
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
  }, { timestamps: true });

  module.exports = mongoose.model('Newsletter', newsletterSchema);