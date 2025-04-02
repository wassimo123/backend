const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.get('/users', async (req, res) => {
    const users = await User.find();
    res.json(users);
});

router.post('/users', async (req, res) => {
    const newUser = new User(req.body);
    await newUser.save();
    res.json(newUser);
});

router.put('/users/matricule/:matricule', async (req, res) => {
    try {
        const updatedUser = await User.findOneAndUpdate(
            { matriculeFiscale: req.params.matricule }, // Condition de recherche
            req.body, // Données à mettre à jour
            { new: true } // Retourner l'objet mis à jour
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
});

router.delete('/users/matricule/:matricule', async (req, res) => {
    try {
        const deletedUser = await User.findOneAndDelete({ matriculeFiscale: req.params.matricule });

        if (!deletedUser) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json({ message: "Utilisateur supprimé avec succès", user: deletedUser });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
});

module.exports = router;