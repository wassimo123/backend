const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: String,
    prenom: String,
    email: String,
    statut: String,
    date_de_creation: String,
});

module.exports = mongoose.model('User', UserSchema);