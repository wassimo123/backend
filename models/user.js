
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  matriculeFiscale: { type: String, required: true, unique: true },
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  confirmPassword: { type: String, required: true },
  telephone: { type: String, required: true },
  adresse: { type: String, required: true },
  dateCreation: { type: String, required: true },
  isArchived: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  termsAccepted: { type: Boolean, default: false },
  termsAcceptedAt: { type: Date },
  termsVersion: { type: String, default: '1.0' },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});


module.exports = mongoose.model('User', userSchema);

// Suppression du middleware qui hache le mot de passe
// userSchema.pre('save', async function (next) {
//   if (this.isModified('password')) {
//     this.password = await bcrypt.hash(this.password, 10);
//     this.confirmPassword = this.password;
//   }
//   next();
// });
