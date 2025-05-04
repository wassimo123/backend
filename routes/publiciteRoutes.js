const express = require('express');
const router = express.Router();
const controller = require('../controlleur/publiciteController');

// POST - Ajouter une publicité
router.post('/', controller.createPublicite);

// GET - Liste toutes les publicités
router.get('/',controller.getAllPublicites);

// GET - Une publicité par ID
router.get('/:id', controller.getPubliciteById);

// PATCH - Mise à jour du statut
router.patch('/:id/statut', controller.updateStatut);

// DELETE - Supprimer une publicité aprés Rejet Admin
router.delete('/adminRefuser/:id', controller.deletePublicite);

// DELETE - Supprimer une publicité aprés Validation Admin
router.delete('/adminValider/:id', controller.deletePubliciteValider);

// GET - Publicités d’un utilisateur
router.get('/utilisateur/:utilisateurId', controller.getPublicitesByUser);

module.exports = router;
