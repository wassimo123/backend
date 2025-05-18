const mongoose = require('mongoose');
const Privacy = require('./models/privacy');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const already = await Privacy.findOne();
    if (!already) {
      await Privacy.create({
        version: '1.0',
        content: 'Voici notre politique de confidentialité.',
        lastUpdated: new Date()
      });
      console.log(' Politique de confidentialité insérée.');
    } else {
      console.log(' Une politique existe déjà.');
    }
    mongoose.disconnect();
  })
  .catch(console.error);
