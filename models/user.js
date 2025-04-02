const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  matriculeFiscale:  String,
   nom:  String ,
  prenom: String ,
  email:  String ,
  password: String ,
  confirmPassword: String,
  telephone:  String ,
  adresse:  String,
  dateCreation: String,
});

module.exports = mongoose.model('User', userSchema);