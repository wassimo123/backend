const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes');
const etablissementRoutes = require('./routes/etablissementRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const evenementRoutes = require('./routes/evenementRoutes');

const app = express();

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({ origin: 'http://localhost:4200' }));

// Servir les fichiers statiques (photos) depuis le dossier uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', userRoutes);
app.use('/api/etablissements', etablissementRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/evenements', evenementRoutes);
// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connecté'))
  .catch(err => console.error('Erreur de connexion MongoDB', err));

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));