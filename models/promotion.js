const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  establishmentId: {
    type: String,
    required: true
  },
  discount: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'scheduled', 'expired', 'pending'], // Changé 'draft' en 'pending'
    required: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'freeitem', 'bundle', 'special'],
    required: true
  },
  code: {
    type: String,
    trim: true
  },
  limit: {
    type: Number,
    default: null
  },
  description: {
    type: String,
    trim: true
  },
  photos: [{
    type: String // Stocke les chemins ou URLs des photos (ex: /uploads/fichier.jpg)
  }],
  conditions: {
    minPurchase: {
      type: Boolean,
      default: false
    },
    minPurchaseAmount: {
      type: Number,
      default: null
    },
    newCustomers: {
      type: Boolean,
      default: false
    },
    specificItems: {
      type: Boolean,
      default: false
    },
    specificDays: {
      type: Boolean,
      default: false
    },
    days: {
      type: Map,
      of: Boolean,
      default: {}
    }
  }
}, {
  timestamps: true // Ajoute createdAt et updatedAt automatiquement
});

module.exports = mongoose.model('Promotion', promotionSchema);
