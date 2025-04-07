const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Terms = require('../models/terms'); // Importer le modèle Terms
const Privacy = require('../models/privacy'); // Importer le modèle Privacy
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
require('dotenv').config();
const userController = require('../controlleur/usercontroller');

// Route pour l'inscription
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

    const latestTerms = await Terms.findOne().sort({ lastUpdated: -1 });
    if (!latestTerms) {
      return res.status(500).json({ message: 'Erreur: Aucune version des conditions d\'utilisation trouvée.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      matriculeFiscale,
      nom,
      prenom,
      email,
      password: hashedPassword,
      confirmPassword,
      telephone,
      adresse,
      dateCreation,
      isArchived: false,
      status: 'active',
      termsAccepted: terms,
      termsAcceptedAt: new Date(),
      termsVersion: latestTerms.version
    });

    await newUser.save();

    // Générer un token JWT
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Le token expire dans 1 heure
    );

    res.status(201).json({
      message: 'Utilisateur inscrit avec succès.',
      user: { id: newUser._id, email: newUser.email, nom: newUser.nom, prenom: newUser.prenom },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Route pour la connexion
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Compte inactif. Veuillez contacter l\'administrateur.' });
    }

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
          lastUpdated: latestTerms.lastUpdated
        }
      });
    }

    // Générer un token JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Connexion réussie.',
      user: { id: user._id, email: user.email, nom: user.nom, prenom: user.prenom },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Route pour accepter les nouvelles conditions (protégée par le middleware)
router.post('/accept-terms', authMiddleware, async (req, res) => {
  const userId = req.user.id; // Récupérer l'ID de l'utilisateur depuis le token

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
        termsVersion: latestTerms.version
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Générer un nouveau token JWT
    const token = jwt.sign(
      { id: updatedUser._id, email: updatedUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Conditions acceptées avec succès.',
      user: { id: updatedUser._id, email: updatedUser.email, nom: updatedUser.nom, prenom: updatedUser.prenom },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Autres routes (terms, privacy, etc.) restent inchangées...
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
      lastUpdated: latestTerms.lastUpdated
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
      lastUpdated: latestPrivacy.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});


// Routes existantes (pour la gestion des utilisateurs)
router.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

router.post('/users', async (req, res) => {
  const { password, confirmPassword, ...userData } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ ...userData, password: hashedPassword, confirmPassword });
  await newUser.save();
  res.status(201).json(newUser);
});

router.put('/users/matricule/:matricule', async (req, res) => {
  try {
    const { password, confirmPassword, ...userData } = req.body;
    if (password && confirmPassword) {
      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      userData.password = hashedPassword;
      userData.confirmPassword = confirmPassword;
    }

    const updatedUser = await User.findOneAndUpdate(
      { matriculeFiscale: req.params.matricule },
      userData,
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
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