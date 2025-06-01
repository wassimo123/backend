const express = require('express');
const router = express.Router();
const Promotion = require('../models/promotion');
const Etablissement = require('../models/etablissement');
const Evenement = require('../models/evenement');
const fs = require('fs').promises;
const path = require('path');

const baseUrl = process.env.BASE_URL || 'http://localhost:5000'; // Use environment variable for production
const uploadsDir = path.join(__dirname, '../Uploads'); // Adjust if folder name is 'uploads' (lowercase)

// Helper function to get image URL
const getImageUrl = async (item, type) => {
  const extensions = ['.jpg', '.png', '.jpeg'];

  try {
    if (type === 'promotion' || type === 'evenement') {
      if (typeof item.photo === 'string' && item.photo.toLowerCase().includes('uploads')) {
        const imagePath = item.photo.replace(/^\/?uploads[\\/]/i, '');
        const fullPath = path.join(uploadsDir, imagePath);
        await fs.access(fullPath);
        return `${baseUrl}/uploads/${imagePath}`;
      } else {
        console.log(`Champ photo invalide pour ${type} ID ${item._id}:`, item.photo);
      }
    } else if (type === 'etablissement') {
      if (Array.isArray(item.photos) && item.photos.length > 0 && typeof item.photos[0] === 'string' && item.photos[0].toLowerCase().includes('uploads')) {
        const imagePath = item.photos[0].replace(/^\/?uploads[\\/]/i, '');
        const fullPath = path.join(uploadsDir, imagePath);
        await fs.access(fullPath);
        return `${baseUrl}/uploads/${imagePath}`;
      } else {
        console.log(`Champ photos invalide pour ${type} ID ${item._id}:`, item.photos);
      }
    }
  } catch (err) {
    console.error(`Erreur d'accès au fichier image pour ${type} ID ${item._id}:`, err.message);
  }

  // Image par défaut
  const defaultImages = {
    promotion: 'default-promotion.jpg',
    etablissement: 'default-etablissement.jpg',
    evenement: 'default-evenement.jpg',
  };
  const defaultImage = defaultImages[type] || 'default.jpg';
  console.log(`Image par défaut utilisée pour ${type} ID ${item._id}: ${defaultImage}`);
  return `${baseUrl}/uploads/${defaultImage}`;
};

router.get('/', async (req, res) => {
  const query = req.query.q ? req.query.q.toString().trim() : '';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const type = req.query.type ? req.query.type.toString().toLowerCase() : 'all';
  const sort = req.query.sort || 'relevance';
  const skip = (page - 1) * limit;

  if (!query) {
    return res.status(400).json({ status: 'error', message: 'Query parameter is required' });
  }

  try {
    // Verify uploads directory exists
    try {
      await fs.access(uploadsDir);
    } catch (err) {
      console.error('Uploads directory not found:', err.message);
      return res.status(500).json({ status: 'error', message: 'Server configuration error: uploads directory not found' });
    }

    const searchRegex = new RegExp(query, 'i');
    let promotions = [];
    let etablissements = [];
    let evenements = [];

    const promotionQuery = {
      $and: [
        { status: { $regex: /^active$/i } },
        {
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { code: searchRegex }
          ]
        }
      ]
    };
    
    
    const etablissementQuery = {
      $and: [
        { statut: { $regex: /^actif$/i } },  // Insensible à la casse
        {
          $or: [
            { nom: searchRegex },
            { description: searchRegex }
          ]
        }
      ]
    };
    
    const evenementQuery = {
      $and: [
        { statut: { $regex: /^À venir$/i } },  // Match exact (insensible à la casse)
        {
          $or: [
            { titre: searchRegex },
            { description: searchRegex }
          ]
        }
      ]
    };
    
    
    let sortOption = {};
    if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }

    if (type === 'all' || type === 'promotion') {
      promotions = await Promotion.find(promotionQuery)
        .sort(sortOption)
        .skip(skip)
        .limit(limit);
    }
    if (type === 'all' || type === 'établissement') {
      etablissements = await Etablissement.find(etablissementQuery)
        .sort(sortOption)
        .skip(skip)
        .limit(limit);
    }
    if (type === 'all' || type === 'événement') {
      evenements = await Evenement.find(evenementQuery)
        .sort(sort === 'newest' ? { date: -1 } : sort === 'oldest' ? { date: 1 } : {})
        .skip(skip)
        .limit(limit);
    }

    const totalPromotions = await Promotion.countDocuments(promotionQuery);
    const totalEtablissements = await Etablissement.countDocuments(
      etablissementQuery,
    );
    const totalEvenements = await Evenement.countDocuments(evenementQuery);
    const totalResults =
      type === 'all'
        ? totalPromotions + totalEtablissements + totalEvenements
        : type === 'promotion'
        ? totalPromotions
        : type === 'établissement'
        ? totalEtablissements
        : totalEvenements;

    // Map results with async image URL generation
    const promotionResults = await Promise.all(
      promotions.map(async (p) => {
        try {
          return {
            title: p.name,
            description: p.description || 'Aucune description',
            type: 'Promotion',
            link: `/promotion/${p._id}`,
            createdAt: p.createdAt,
            image: await getImageUrl(p, 'promotion'),
          };
        } catch (err) {
          console.error(`Error processing promotion ID ${p._id}:`, err.message);
          return null; // Skip failed items
        }
      }),
    );

    const etablissementResults = await Promise.all(
      etablissements.map(async (e) => {
        try {
          return {
            
            title: e.nom,
            description: e.description || 'Aucune description',
            type: e.type.charAt(0).toUpperCase() + e.type.slice(1),
            link: `/etablissements/${e._id}`,
            createdAt: e.createdAt,
            image: await getImageUrl(e, 'etablissement'),
          };
        } catch (err) {
          console.error(`Error processing etablissement ID ${e._id}:`, err.message);
          return null; // Skip failed items
        }
      }),
    );

    const evenementResults = await Promise.all(
      evenements.map(async (e) => {
        try {
          return {
            
            title: e.nom || e.titre || 'Événement',
            description: e.description || 'Aucune description',
            type: 'Événement',
            link: `/evenements/${e._id}`, 
            createdAt: e.date || e.createdAt,
            image: await getImageUrl(e, 'evenement'),
          };
        } catch (err) {
          console.error(`Error processing evenement ID ${e._id}:`, err.message);
          return null; // Skip failed items
        }
      }),
    );

    // Filter out null results
    const results = [
      ...promotionResults,
      ...etablissementResults,
      ...evenementResults,
    ].filter((result) => result !== null);

    res.json({
      status: 'success',
      results,
      totalResults,
      currentPage: page,
      totalPages: Math.ceil(totalResults / limit),
    });
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({ status: 'error', message: 'Server error during search' });
  }
});

module.exports = router;