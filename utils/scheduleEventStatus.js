// const cron = require('node-cron');
// const Evenement = require('../models/evenement');

// const updateEventStatus = async () => {
//   console.log('Vérification des statuts des événements...');
//   try {
//     const now = new Date();
//     console.log('Heure actuelle du serveur:', now.toString());

//     // Find events that are "À venir" or "En cours" and have a dateFin in the past
//     const eventsToUpdate = await Evenement.find({
//       statut: { $in: ['À venir', 'En cours'] },
//       dateFin: { $lt: now },
//     });

//     console.log(`Événements à mettre à jour: ${eventsToUpdate.length}`);

//     for (const event of eventsToUpdate) {
//       event.statut = 'Terminé';
//       await event.save();
//       console.log(`Événement ${event.nom} (ID: ${event._id}) mis à jour avec le statut "Terminé"`);
//     }
//   } catch (error) {
//     console.error('Erreur lors de la mise à jour des statuts des événements:', error);
//   }
// };

// // Schedule the task to run daily at midnight
// const scheduleEventStatusUpdates = () => {
//   cron.schedule('* * * * *', updateEventStatus, {
//     timezone: 'Africa/Tunis',
//   });
// };

// module.exports = scheduleEventStatusUpdates;
const cron = require('node-cron');
const Evenement = require('../models/evenement');

const updateEventStatus = async () => {
  console.log('Vérification des statuts des événements...');
  try {
    const now = new Date();
    console.log('Heure actuelle du serveur:', now.toString());

    // Trouver les événements encore actifs mais dont la date de fin est dépassée
    const eventsToUpdate = await Evenement.find({
      statut: { $in: ['À venir', 'En cours'] },
      dateFin: { $lt: now },
    });

    console.log(`Événements à mettre à jour: ${eventsToUpdate.length}`);

    for (const event of eventsToUpdate) {
      // ✅ Vérifie si etablissementId est bien présent
      if (!event.etablissementId) {
        console.warn(`⚠️ Événement "${event.nom}" (ID: ${event._id}) ignoré : etablissementId manquant.`);
        continue; // Passe au suivant
      }

      // ✅ Mise à jour
      event.statut = 'Terminé';
      await event.save();
      console.log(`✅ Événement "${event.nom}" (ID: ${event._id}) mis à jour avec le statut "Terminé"`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des statuts des événements:', error);
  }
};

// Tâche planifiée (toutes les minutes ici pour test — change en '0 0 * * *' pour minuit)
const scheduleEventStatusUpdates = () => {
  cron.schedule('* * * * *', updateEventStatus, {
    timezone: 'Africa/Tunis',
  });
};

module.exports = scheduleEventStatusUpdates;
