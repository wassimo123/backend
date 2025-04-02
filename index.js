const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes');
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log(' MongoDB Connecté'))
  .catch(err => console.error(' Erreur de connexion MongoDB', err));

app.listen(PORT, () => console.log(` Serveur lancé sur le port ${PORT}`));

app.use('/api', userRoutes); 