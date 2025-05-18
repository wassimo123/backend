// seedTerms.js
const mongoose = require('mongoose');
const Terms = require('./models/terms'); // adapte le chemin si nécessaire
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const already = await Terms.findOne();
    if (!already) {
      await Terms.create({
        version: '1.0',
        content: 'Voici les conditions d\'utilisation initiales.',
        lastUpdated: new Date()
      });
      console.log(' Conditions d\'utilisation insérées.');
    } else {
      console.log(' Des conditions existent déjà.');
    }
    mongoose.disconnect();
  })
  .catch(console.error);
