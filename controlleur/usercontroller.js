const User = require('../models/user');
exports.createUser = async (req, res) => {
    try {
      const user = new User(req.body); // le "status" sera 'active' par défaut
      await user.save();
      res.status(201).json({ message: 'Utilisateur créé', user });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error });
    }
  };
  
  exports.archiveUser = async (req, res) => {
    try {
      // Mise à jour de la propriété isArchived
      const updatedUser = await User.findOneAndUpdate(
        { matriculeFiscale: req.params.matricule },  // Assurez-vous que le paramètre correspond à ce que vous utilisez
        { isArchived: true },  // Changer status en isArchived
        { new: true }  // Retourne l'utilisateur mis à jour
      );
  
      // Si l'utilisateur n'est pas trouvé
      if (!updatedUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
  
      // Retourner un message de succès avec les détails de l'utilisateur mis à jour
      res.json({ message: 'Utilisateur archivé avec succès', user: updatedUser });
    } catch (error) {
      // Gérer l'erreur serveur
      res.status(500).json({ message: 'Erreur serveur', error });
    }
  };
  