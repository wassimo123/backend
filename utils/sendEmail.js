// utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Désactiver la vérification stricte des certificats
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès à', to);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error.message);
    console.error('Détails de l\'erreur:', error);
    throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
  }
};

module.exports = sendEmail;