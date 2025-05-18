const cron = require('node-cron');
const PromoNotification = require('../models/promoNotification');
const Promotion = require('../models/promotion');
const sendEmail = require('./sendEmail');

const formatDate = (date) => {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const checkAndSendPromoNotifications = async () => {
  console.log('Vérification des notifications de promotion à envoyer...');
  const now = new Date();
  
  // Calculer la date pour "un jour avant expiration"
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const startOfTargetDay = new Date(oneDayFromNow.setHours(0, 0, 0, 0));
  const endOfTargetDay = new Date(oneDayFromNow.setHours(23, 59, 59, 999));

  try {
    const notifications = await PromoNotification.find({
      isSent: false,
      endDate: { $gte: startOfTargetDay, $lte: endOfTargetDay },
    });

    console.log(`Nombre de notifications à envoyer : ${notifications.length}`);

    for (const notif of notifications) {
      const promotion = await Promotion.findById(notif.promotionId);
      if (!promotion) {
        console.log(`Promotion ${notif.promotionId} introuvable, suppression de la notification.`);
        await PromoNotification.deleteOne({ _id: notif._id });
        continue;
      }

      const subject = `🎉 Rappel : La promotion "${notif.promotionName}" expire demain !`;
      const html = `
        <h2>Rappel de promotion</h2>
        <p>Bonjour,</p>
        <p>La promotion <strong>${notif.promotionName}</strong> expire demain.</p>
        <p>Profitez-en avant qu'il ne soit trop tard !</p>
        <p>Fin prévue : ${formatDate(promotion.endDate)}</p>
        <p>Code promo : ${promotion.code || 'Aucun'}</p>
        <br>
        <p>À bientôt !<br>L’équipe du portail de Sfax</p>
      `;

      try {
        await sendEmail(notif.email, subject, html);
        notif.isSent = true;
        await notif.save();
        console.log(`E-mail de rappel envoyé à ${notif.email} pour ${notif.promotionName}`);
      } catch (emailError) {
        console.error(`Erreur lors de l'envoi de l'e-mail à ${notif.email} :`, emailError);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des notifications de promotion :', error);
  }
};

const schedulePromoNotifications = () => {
  // Planifier l'exécution toutes les heures pour plus de fiabilité
  cron.schedule('* * * * *', checkAndSendPromoNotifications, {
    timezone: 'Africa/Tunis',
  });

  console.log('Tâche de notification des promotions programmée.');
//   checkAndSendPromoNotifications();
};

module.exports = schedulePromoNotifications;