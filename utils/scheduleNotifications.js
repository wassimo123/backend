const cron = require('node-cron');
  const Notification = require('../models/notification');
  const Evenement = require('../models/evenement');
  const sendEmail = require('./sendEmail');

  // Fonction pour formater la date
  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Fonction principale pour vérifier et envoyer les notifications
  const checkAndSendNotifications = async () => {
    console.log('Vérification des notifications à envoyer...');
    try {
      const now = new Date();
      console.log('Heure actuelle du serveur:', now.toString());

      // Calculer la date de demain en UTC
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

      // Définir le début et la fin de demain en UTC
      const startOfTomorrow = new Date(Date.UTC(
        tomorrow.getUTCFullYear(),
        tomorrow.getUTCMonth(),
        tomorrow.getUTCDate(),
        0, 0, 0, 0
      ));
      const endOfTomorrow = new Date(Date.UTC(
        tomorrow.getUTCFullYear(),
        tomorrow.getUTCMonth(),
        tomorrow.getUTCDate(),
        23, 59, 59, 999
      ));

      console.log('Plage de dates pour demain (UTC):', {
        start: startOfTomorrow.toISOString(),
        end: endOfTomorrow.toISOString(),
      });

      // Trouver les notifications non envoyées pour les événements commençant demain
      const notifications = await Notification.find({
        isSent: false,
        eventDate: {
          $gte: startOfTomorrow,
          $lt: endOfTomorrow,
        },
      });

      console.log('Notifications found:', notifications);

      for (const notification of notifications) {
        try {
          const event = await Evenement.findById(notification.eventId);
          if (!event) {
            console.log(`Événement ${notification.eventId} non trouvé, suppression de la notification.`);
            await Notification.deleteOne({ _id: notification._id });
            continue;
          }

          console.log(`Event status for ${notification.eventId}: ${event.statut}`);
          if (event.statut === 'À venir') {
            const subject = `Rappel : ${notification.eventName} arrive bientôt !`;
            const html = `
              <h2>Rappel d'événement</h2>
              <p>Bonjour,</p>
              <p>Vous avez demandé une notification pour l'événement <strong>${notification.eventName}</strong>.</p>
              <p><strong>Date:</strong> ${formatDate(new Date(notification.eventDate))}</p>
              <p><strong>Lieu:</strong> ${event.lieu}</p>
              <p><strong>Heure:</strong> ${event.heureDebut || 'Non spécifiée'} - ${event.heureFin || 'Non spécifiée'}</p>
              <p>Préparez-vous à profiter de cet événement !</p>
              <p>Cordialement,<br>L'équipe de gestion des événements</p>
            `;

            await sendEmail(notification.email, subject, html);
            notification.isSent = true;
            await notification.save();
            console.log(`Notification mise à jour pour ${notification._id}: isSent = true`);
            console.log(`Email de rappel envoyé à ${notification.email} pour l'événement ${notification.eventName}`);
          } else {
            console.log(`Event ${notification.eventId} is not 'À venir', skipping email.`);
          }
        } catch (error) {
          console.error(`Erreur lors du traitement de la notification ${notification._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des notifications:', error);
    }
  };

  // Planifier une tâche quotidienne à minuit
  const scheduleNotifications = () => {
    cron.schedule('* * * * *', checkAndSendNotifications, {
      timezone: 'Africa/Tunis',
    });

    // // Appeler immédiatement pour tester (à des fins de débogage)
    // checkAndSendNotifications();
  };

  module.exports = scheduleNotifications;