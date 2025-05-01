const express = require('express');
const router = express.Router();
const Etablissement = require('../models/etablissement');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Initialize multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Récupérer tous les établissements
router.get('/', async (req, res) => {
  try {
    const etablissements = await Etablissement.find();
    res.json(etablissements);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});


// Récupérer tous les établissements actifs par type
router.get('/type/:type', async (req, res) => {
  try {
    const etablissements = await Etablissement.find({ 
      type: req.params.type, 
      statut: "Actif" 
    });

    if (!etablissements || etablissements.length === 0) {
      return res.status(404).json({ message: 'Aucun établissement actif trouvé pour ce type' });
    }

    res.json(etablissements);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.get('/hotels', async (req, res) => {
try{
  const hotels = await Etablissement.find({type: 'Hôtel' , statut: 'Actif'});
  res.json(hotels);
}catch(err){
  res.status(500).json({message: 'Erreur serveur', error: err.message});
}

});
  //// Récupérer tous les établissements actif
/*router.get('/lazmek tibidel route par exemple (router.get(/getstatusactive'), async (req, res) => {
  try {
    const etablissements = await Etablissement.find({ statut: "Actif" });
    res.json(etablissements);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});*/

// Récupérer un établissement par ID
router.get('/id/:id', async (req, res) => {
  try {
    const etablissement = await Etablissement.findById(req.params.id);
    if(etablissement.statut !="Actif"){
      return res.status(400).json({ message: 'Etablissement non actif' });
    }
    if (!etablissement) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    res.json(etablissement);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Récupérer un établissement par ID (version complète, pour compatibilité)
router.get('/:id', async (req, res) => {
  try {
    const etablissement = await Etablissement.findById(req.params.id);
    if (!etablissement) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    if (etablissement.statut !== "Actif") {
      return res.status(400).json({ message: 'Établissement non actif' });
    }
    res.json(etablissement);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

router.post('/', upload.array('photos', 10), async (req, res) => {
  try {
    // Get uploaded file paths
    const photoPaths = req.files ? req.files.map(file => file.path) : [];
    
    // Create new etablissement with form data and photo paths
    const etablissementData = {
      ...req.body,
      photos: photoPaths
    };
    
    const etablissement = new Etablissement(etablissementData);
    const savedEtablissement = await etablissement.save();
    
    res.status(201).json(savedEtablissement);
  } catch (err) {
    // Clean up uploaded files if there was an error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, () => {});
      });
    }
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }
    
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Mettre à jour un établissement (mise à jour complète)
router.put('/:id', async (req, res) => {
  try {
    const etablissement = await Etablissement.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!etablissement) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    res.json(etablissement);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

// Archiver un établissement (mise à jour partielle avec PATCH)
router.patch('/:id', async (req, res) => {
  try {
    const etablissement = await Etablissement.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!etablissement) {
      return res.status(404).json({ message: 'Établissement non trouvé' });
    }
    res.json(etablissement);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: 'Erreur de validation', errors });
    }
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;