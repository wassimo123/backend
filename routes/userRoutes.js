const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Terms = require('../models/terms');
const Privacy = require('../models/privacy');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto'); // Pour générer un token sécurisé
const sendEmail = require('../utils/sendEmail'); // Importer la fonction d'envoi d'email
require('dotenv').config();

// Route pour l'inscription (inchangée)
router.post('/register', async (req, res) => {
  const { matriculeFiscale, nom, prenom, email, password, confirmPassword, telephone, adresse, dateCreation, terms } = req.body;

  if (!matriculeFiscale || !nom || !prenom || !email || !password || !confirmPassword || !telephone || !adresse || !dateCreation) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
  }

  if (!terms) {
    return res.status(400).json({ message: 'Vous devez accepter les conditions d\'utilisation.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { matriculeFiscale }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email ou matricule fiscale est déjà utilisé.' });
    }

    const userCount = await User.countDocuments();
    let termsVersionToUse = '1.0';

    if (userCount > 0) {
      const latestTerms = await Terms.findOne().sort({ lastUpdated: -1 });
      if (!latestTerms) {
        return res.status(500).json({ message: 'Erreur: Aucune version des conditions d\'utilisation trouvée.' });
      }
      termsVersionToUse = latestTerms.version;
    }

    const newUser = new User({
      matriculeFiscale,
      nom,
      prenom,
      email,
      password,
      confirmPassword,
      telephone,
      adresse,
      dateCreation,
      isArchived: false,
      status: 'active',
      termsAccepted: terms,
      termsAcceptedAt: new Date(),
      termsVersion: termsVersionToUse,
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      message: 'Utilisateur inscrit avec succès.',
      user: { id: newUser._id, email: newUser.email, nom: newUser.nom, prenom: newUser.prenom },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Route pour demander un lien de réinitialisation de mot de passe
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Veuillez fournir un email.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 3600000; // Expire dans 1 heure

    // Mettre à jour l'utilisateur avec le token et la date d'expiration
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Créer le lien de réinitialisation
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Contenu de l'email
    const subject = 'Réinitialisation de votre mot de passe';
    const html = `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Vous avez demandé une réinitialisation de mot de passe pour votre compte.</p>
      <p>Cliquez sur le lien suivant pour réinitialiser votre mot de passe :</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Ce lien est valide pendant 1 heure.</p>
      <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    `;

    // Envoyer l'email
    await sendEmail(user.email, subject, html);

    res.status(200).json({ message: 'Un email de réinitialisation a été envoyé à votre adresse email.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Route pour réinitialiser le mot de passe
router.post('/reset-password', async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Veuillez fournir le token, le nouveau mot de passe et la confirmation.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Vérifier que le token n'a pas expiré
    });

    if (!user) {
      return res.status(400).json({ message: 'Token invalide ou expiré.' });
    }

    // Mettre à jour le mot de passe (en texte brut, comme demandé)
    user.password = newPassword;
    user.confirmPassword = confirmPassword;
    user.resetPasswordToken = undefined; // Supprimer le token
    user.resetPasswordExpires = undefined; // Supprimer la date d'expiration
    await user.save();

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Autres routes (inchangées)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Veuillez fournir un email et un mot de passe.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    if (password !== user.password) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Compte inactif. Veuillez contacter l\'administrateur.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('Token généré dans /api/login :', token);

    const latestTerms = await Terms.findOne().sort({ lastUpdated: -1 });
    if (!latestTerms) {
      return res.status(500).json({ message: 'Erreur: Aucune version des conditions d\'utilisation trouvée.' });
    }

    if (user.termsVersion !== latestTerms.version) {
      return res.status(403).json({
        message: 'Nouvelles conditions d\'utilisation à accepter.',
        user: { id: user._id, email: user.email, nom: user.nom, prenom: user.prenom },
        latestTerms: {
          version: latestTerms.version,
          content: latestTerms.content,
          lastUpdated: latestTerms.lastUpdated,
        },
        token,
      });
    }

    res.status(200).json({
      message: 'Connexion réussie.',
      user: { id: user._id, email: user.email, nom: user.nom, prenom: user.prenom },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

router.post('/accept-terms', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const latestTerms = await Terms.findOne().sort({ lastUpdated: -1 });
    if (!latestTerms) {
      return res.status(500).json({ message: 'Erreur: Aucune version des conditions d\'utilisation trouvée.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        termsVersion: latestTerms.version,
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const token = jwt.sign(
      { id: updatedUser._id, email: updatedUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Conditions acceptées avec succès.',
      user: { id: updatedUser._id, email: updatedUser.email, nom: updatedUser.nom, prenom: updatedUser.prenom },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

router.get('/terms', async (req, res) => {
  try {
    const latestTerms = await Terms.findOne().sort({ lastUpdated: -1 });
    if (!latestTerms) {
      return res.status(404).json({ message: 'Conditions non trouvées.' });
    }
    res.json({
      title: 'Conditions d\'utilisation',
      content: latestTerms.content,
      version: latestTerms.version,
      lastUpdated: latestTerms.lastUpdated,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

router.get('/privacy', async (req, res) => {
  try {
    const latestPrivacy = await Privacy.findOne().sort({ lastUpdated: -1 });
    if (!latestPrivacy) {
      return res.status(404).json({ message: 'Politique de confidentialité non trouvée.' });
    }
    res.json({
      title: 'Politique de confidentialité',
      content: latestPrivacy.content,
      version: latestPrivacy.version,
      lastUpdated: latestPrivacy.lastUpdated,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

router.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

router.post('/users', async (req, res) => {
  const { password, confirmPassword, ...userData } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
  }

  try {
    const newUser = new User({
      ...userData,
      password,
      confirmPassword,
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
});

router.put('/users/matricule/:matricule', async (req, res) => {
  try {
    const { password, confirmPassword, ...userData } = req.body;

    if (password && confirmPassword) {
      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
      }
      userData.password = password;
      userData.confirmPassword = confirmPassword;
    }

    const updatedUser = await User.findOneAndUpdate(
      { matriculeFiscale: req.params.matricule },
      userData,
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
});

router.patch('/users/matricule/:matricule', async (req, res) => {
  try {
    const archivedUser = await User.findOneAndUpdate(
      { matriculeFiscale: req.params.matricule },
      { 
        status: 'inactive',
        isArchived: true
      },
      { new: true }
    );

    if (!archivedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    res.json({ message: 'Utilisateur archivé avec succès.', user: archivedUser });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

module.exports = router;