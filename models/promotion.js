const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  etablissementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Etablissement', required: true },
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
    enum: ['active', 'expired', 'pending'],
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
  photo: { type: String },
  prixAvant: {
    type: Number,
    default: null
  },
  prixApres: {
    type: Number,
    default: null
  },
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
      type: [String],
      default: []
    },
    specificDays: {
      type: [String],
      default: []
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