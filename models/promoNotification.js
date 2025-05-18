const mongoose = require('mongoose');

const promoNotificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Veuillez entrer un email valide'],
  },
  promotionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Promotion',
    required: true,
  },
  promotionName: {
    type: String,
    required: true,
  },
  endDate: {
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

promoNotificationSchema.index({ email: 1, promotionId: 1 }, { unique: true });

module.exports = mongoose.model('PromoNotification', promoNotificationSchema);
