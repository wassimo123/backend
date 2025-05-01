const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Activity = require('../models/activity');
const Terms = require('../models/terms');
const Privacy = require('../models/privacy');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
require('dotenv').config();
const EvaluationSite = require('../models/EvaluationSite');

// Fonction utilitaire pour vérifier le nombre d'admins
const checkAdminLimit = async () => {
  const adminCount = await User.countDocuments({ role: 'Admin' });
  return adminCount;
};

// Route pour changer le mot de passe
// router.post('/change-password', authMiddleware, async (req, res) => {
//   const { currentPassword, newPassword, confirmPassword } = req.body;
//   const userId = req.user.id; // Récupéré depuis le token via authMiddleware

//   if (!currentPassword || !newPassword || !confirmPassword) {
//     return res.status(400).json({ message: 'Veuillez fournir tous les champs requis.' });
//   }

//   if (newPassword !== confirmPassword) {
//     return res.status(400).json({ message: 'Les nouveaux mots de passe ne correspondent pas.' });
//   }

//   try {
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: 'Utilisateur non trouvé.' });
//     }

//     // Vérifier si l'ancien mot de passe est correct
//     if (currentPassword !== user.password) {
//       return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
//     }

//     // Mettre à jour le mot de passe
//     user.password = newPassword;
//     user.confirmPassword = newPassword;
//     await user.save();

//     res.status(200).json({ message: 'Mot de passe changé avec succès.' });
//   } catch (error) {
//     console.error('Erreur lors du changement de mot de passe:', error);
//     res.status(500).json({ message: 'Erreur serveur.', error });
//   }
// });
////evaliation
router.post('/avis', async (req, res) => {
  let { utilisateur, note, commentaire } = req.body;

  // Si l'utilisateur n'a pas fourni de nom, on le définit à "Anonyme"
  if (!utilisateur) {
    utilisateur = 'Anonyme';
  }

  // Vérification des données nécessaires
  if (!note || !commentaire) {
    return res.status(400).json({ error: 'Note et commentaire sont requis' });
  }

  try {
    let evaluation = await EvaluationSite.findOne();

    // Créer une première entrée si la collection est vide
    if (!evaluation) {
      evaluation = new EvaluationSite();
    }

    // Ajouter l'avis
    evaluation.avis.push({ utilisateur, note, commentaire });

    // Mettre à jour les scores
    evaluation.scoreTotal += note;
    evaluation.nombreVotes += 1;
    evaluation.score = (evaluation.scoreTotal / evaluation.nombreVotes).toFixed(1);

    // Sauvegarder l'évaluation mise à jour
    await evaluation.save();

    // Retourner la nouvelle évaluation avec l'avis ajouté
    res.status(201).json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get('/avis', async (req, res) => {
  try {
    let evaluation = await EvaluationSite.findOne();
    if (!evaluation) {
      evaluation = new EvaluationSite();
      await evaluation.save();
    }
    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Veuillez fournir tous les champs requis.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Les nouveaux mots de passe ne correspondent pas.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    if (currentPassword !== user.password) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
    }

    user.password = newPassword;
    user.confirmPassword = newPassword;
    await user.save();

    res.status(200).json({ message: 'Mot de passe changé avec succès.' });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});


// Route pour l'inscription
router.post('/register', async (req, res) => {
  const { matriculeFiscale, nom, prenom, email, password, confirmPassword, telephone, adresse, dateCreation, terms, role } = req.body;

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

    // Vérifier la limite d'admins si le rôle est "Admin"
    if (role === 'Admin') {
      const adminCount = await checkAdminLimit();
      if (adminCount >= 1) {
        return res.status(400).json({ message: 'Il ne peut y avoir qu\'un seul administrateur.' });
      }
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
      status: 'pending',
      role: role || 'Partenaire',
    });

    await newUser.save();
    console.log('Nouvel utilisateur créé:', newUser);

    // Enregistrer l'activité
    const activity = new Activity({
      type: 'new',
      email: newUser.email,
      time: new Date(),
    });
    await activity.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      message: 'Votre demande a été envoyée avec succès, en attente de l\'acceptation de l\'administrateur.',
      user: { id: newUser._id, email: newUser.email, nom: newUser.nom, prenom: newUser.prenom, role: newUser.role },
      token,
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Vérifier si un utilisateur existe par e-mail
router.get('/users/check-email/:email', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ exists: false });
    }
    res.json({ exists: true, status: user.status });
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'e-mail:', error);
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Nouvelle route pour récupérer un utilisateur par email
// router.get('/users/email/:email', authMiddleware, async (req, res) => {
//   try {
//     const user = await User.findOne({ email: req.params.email });
//     if (!user) {
//       return res.status(404).json({ message: 'Utilisateur non trouvé.' });
//     }
//     res.json({
//       id: user._id,
//       email: user.email,
//       nom: user.nom,
//       prenom: user.prenom,
//       role: user.role,
//       status: user.status
//     });
//   } catch (error) {
//     console.error('Erreur lors de la récupération de l\'utilisateur:', error);
//     res.status(500).json({ message: 'Erreur serveur.', error });
//   }
// });
router.get('/users/email/:email', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Mettre à jour le statut de l'utilisateur
router.patch('/users/status/:email', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }
    const updatedUser = await User.findOneAndUpdate(
      { email: req.params.email },
      { status },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Enregistrer l'activité si le statut passe à "active"
    if (status === 'active') {
      const activity = new Activity({
        type: 'activated',
        email: updatedUser.email,
        time: new Date(),
      });
      await activity.save();
    }

    res.json({ message: 'Statut mis à jour.', user: updatedUser });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Route pour supprimer un utilisateur par e-mail
router.delete('/users/:email', authMiddleware, async (req, res) => {
  try {
    // Supprimer les activités associées à l'utilisateur
    await Activity.deleteMany({ email: req.params.email });

    // Supprimer l'utilisateur
    const deletedUser = await User.findOneAndDelete({ email: req.params.email });
    if (!deletedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    res.json({ message: 'Utilisateur et ses activités supprimés avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur et de ses activités:', error);
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// E-mails de confirmation et d'annulation
router.post('/email/confirmation', authMiddleware, async (req, res) => {
  const { email } = req.body;
  try {
    const html = `
      <h1>Activation de votre compte</h1>
      <p>Votre compte a été activé avec succès !</p>
      <p>Vous pouvez maintenant vous connecter à notre plateforme à l'adresse suivante : <a href="${process.env.FRONTEND_URL}/connexion">${process.env.FRONTEND_URL}/connexion</a></p>
    `;
    await sendEmail(email, 'Activation de votre compte', html);
    res.status(200).send();
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'e-mail de confirmation:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'e-mail.', error });
  }
});

router.post('/email/cancellation', authMiddleware, async (req, res) => {
  const { email } = req.body;
  try {
    const html = `
      <h1>Annulation de création de compte</h1>
      <p>Votre demande de création de compte a été annulée.</p>
      <p>Si vous avez des questions, contactez notre support.</p>
    `;
    await sendEmail(email, 'Annulation de création de compte', html);
    res.status(200).send();
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'e-mail d\'annulation:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'e-mail.', error });
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

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 3600000;

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const subject = 'Réinitialisation de votre mot de passe';
    const html = `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Vous avez demandé une réinitialisation de mot de passe pour votre compte.</p>
      <p>Cliquez sur le lien suivant pour réinitialiser votre mot de passe :</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Ce lien est valide pendant 1 heure.</p>
      <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    `;

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
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token invalide ou expiré.' });
    }

    user.password = newPassword;
    user.confirmPassword = confirmPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Route pour récupérer les activités récentes
router.get('/activities', authMiddleware, async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ time: -1 })
      .limit(10);
    res.json(activities);
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Route pour supprimer une activité spécifique
router.delete('/activities/:id', authMiddleware, async (req, res) => {
  try {
    const deletedActivity = await Activity.findByIdAndDelete(req.params.id);
    if (!deletedActivity) {
      return res.status(404).json({ message: 'Activité non trouvée.' });
    }
    res.json({ message: 'Activité supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'activité:', error);
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

    // Log pour vérifier les données renvoyées
    console.log('Utilisateur renvoyé dans la réponse:', {
      id: user._id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      status: user.status
    });

    res.status(200).json({
      message: 'Connexion réussie.',
      user: {
        id: user._id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        status: user.status
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

// Autres routes
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
      user: { id: updatedUser._id, email: updatedUser.email, nom: updatedUser.nom, prenom: updatedUser.prenom, role: updatedUser.role },
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
  const { password, confirmPassword, role, ...userData } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
  }

  try {
    // Vérifier la limite d'admins si le rôle est "Admin"
    if (role === 'Admin') {
      const adminCount = await checkAdminLimit();
      if (adminCount >= 1) {
        return res.status(400).json({ message: 'Il ne peut y avoir qu\'un seul administrateur.' });
      }
    }

    const newUser = new User({
      ...userData,
      password,
      confirmPassword,
      role: role || 'Partenaire',
    });
    await newUser.save();

    // Enregistrer l'activité
    const activity = new Activity({
      type: 'new',
      email: newUser.email,
      time: new Date(),
    });
    await activity.save();

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
});

// router.put('/users/matricule/:matricule', async (req, res) => {
//   try {
//     const { password, confirmPassword, role, ...userData } = req.body;

//     if (password && confirmPassword) {
//       if (password !== confirmPassword) {
//         return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
//       }
//       userData.password = password;
//       userData.confirmPassword = confirmPassword;
//     }

//     // Vérifier la limite d'admins si le rôle est mis à jour en "Admin"
//     if (role === 'Admin') {
//       const adminCount = await checkAdminLimit();
//       if (adminCount >= 1) {
//         const existingUser = await User.findOne({ matriculeFiscale: req.params.matricule });
//         if (existingUser && existingUser.role !== 'Admin') {
//           return res.status(400).json({ message: 'Il ne peut y avoir qu\'un seul administrateur.' });
//         }
//       }
//     }

//     const updatedUser = await User.findOneAndUpdate(
//       { matriculeFiscale: req.params.matricule },
//       { ...userData, role: role || 'Partenaire' },
//       { new: true }
//     );
//     if (!updatedUser) return res.status(404).json({ message: 'Utilisateur non trouvé' });

//     // Enregistrer l'activité
//     const activity = new Activity({
//       type: 'updated',
//       email: updatedUser.email,
//       time: new Date(),
//     });
//     await activity.save();

//     res.json(updatedUser);
//   } catch (error) {
//     res.status(500).json({ message: 'Erreur serveur', error });
//   }
// });
router.put('/users/matricule/:matricule', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { matriculeFiscale: req.params.matricule },
      req.body,
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
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

    // Enregistrer l'activité
    const activity = new Activity({
      type: 'archived',
      email: archivedUser.email,
      time: new Date(),
    });
    await activity.save();

    res.json({ message: 'Utilisateur archivé avec succès.', user: archivedUser });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error });
  }
});

module.exports = router;


