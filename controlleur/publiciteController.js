const Etablissement = require('../models/etablissement');
const Publicite = require('../models/publicite');
const User = require('../models/user'); // Make sure this exists
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

// ➕ Créer une publicité
exports.createPublicite = async (req, res) => {
  try {
    const { etablissement: etabData, publicite: pubData } = req.body;

    // 1. Enregistrer l'établissement
    etabData.statut = 'En attente';
    //etabDat.userId = req.user._id;
    const etablissement = new Etablissement(etabData);
    await etablissement.save();
    // 2. Créer la publicité avec l'ID de l'établissement
    const publicite = new Publicite({
    ...pubData,
    etablissementId: etablissement._id,
    nom: etablissement.nom,
    typeEtablissement: etablissement.type
    });

    await publicite.save();


    res.status(201).json({ message: 'Publicité créée avec succès', publicite });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la création', error: err.message });
  }
};

// GET /api/publicites
exports.getAllPublicites = async (req, res) => {
    try {
      const publicites = await Publicite.find()
        .populate('etablissementId') // ✅ Populate établissement data
        .sort({ createdAt: -1 });
  
      // Optional: Rename populated field to `etablissement` for clarity
      const result = publicites.map(pub => {
        const pubObj = pub.toObject();
        pubObj.etablissement = pubObj.etablissementId;
        delete pubObj.etablissementId;
        return pubObj;
      });
  
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ message: 'Erreur lors de la récupération', error: err.message });
    }
  };
  

// 🔍 Récupérer une publicité par ID
exports.getPubliciteById = async (req, res) => {
    try {
      const pub = await Publicite.findById(req.params.id)
        .populate('etablissementId');
  
      if (!pub) {
        return res.status(404).json({ message: 'Publicité non trouvée' });
      }
  
      const pubObj = pub.toObject();
      pubObj.etablissement = pubObj.etablissementId;
      delete pubObj.etablissementId;
  
      res.status(200).json(pubObj);
    } catch (err) {
      res.status(500).json({ message: 'Erreur lors de la récupération', error: err.message });
    }
  };

// ✏️ Modifier le statut (acceptée / refusée)
exports.updateStatut = async (req, res) => {
  try {
    const { statut } = req.body;
    if (!['Acceptée', 'Refusée'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const updated = await Publicite.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Publicité non trouvée' });
    }

    res.status(200).json({ message: 'Statut mis à jour', publicite: updated });
  } catch (err) {
    res.status(500).json({ message: 'Erreur de mise à jour', error: err.message });
  }
};
// Refus Admin
exports.deletePublicite = async (req, res) => {
    try {
      const publicite = await Publicite.findById(req.params.id);
  
      if (!publicite) {
        return res.status(404).json({ message: 'Publicité non trouvée' });
      }
  
      const etablissementId = publicite.etablissementId;
  
      // Récupérer l'utilisateur pour envoi email
      const user = await User.findById(publicite.utilisateurId);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé pour cette publicité.' });
      }
  
      // Supprimer l’établissement s’il existe
      if (etablissementId) {
        await Etablissement.findByIdAndDelete(etablissementId);
      }
  
      // Supprimer la publicité
      await Publicite.findByIdAndDelete(req.params.id);
  
      // Envoyer un email de refus
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
  
      await transporter.sendMail({
        from: `"Sfax App" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Refus de votre publicité',
        text: `Bonjour ${user.nom},\n\nNous vous informons que votre demande de publicité pour l'établissement "${publicite.nom}" a été refusée.\n\nVeuillez nous contacter pour plus d'informations.\n\nMerci de votre compréhension.\n\n— L'équipe Sfax App`
      });
  
      res.status(200).json({ message: 'Publicité et établissement supprimés. Email de refus envoyé.' });
  
    } catch (err) {
      console.error('Erreur lors du refus de publicité:', err);
      res.status(500).json({ message: 'Erreur lors de la suppression', error: err.message });
    }
  };
  

  // Validation Admin
  exports.deletePubliciteValider = async (req, res) => {
    try {
      const publicite = await Publicite.findById(req.params.id);
      if (!publicite) {
        return res.status(404).json({ message: 'Publicité non trouvée' });
      }
  
      const etablissement = await Etablissement.findById(publicite.etablissementId);
      const user = await User.findById(publicite.utilisateurId);
  
      if (!etablissement || !user) {
        return res.status(404).json({ message: 'Établissement ou utilisateur non trouvé' });
      }
  
      // 1. Générer le PDF en mémoire
      const doc = new PDFDocument();
      const buffers = [];
  
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(buffers);
  
        // 2. Envoyer l'email avec pièce jointe (en mémoire)
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false, // Désactiver la vérification stricte des certificats
          },
        });
  
        await transporter.sendMail({
          from: `"Sfax App" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Confirmation de votre publicité',
          text: `Bonjour ${user.nom},\n\nVotre publicité pour "${publicite.nom}" a été acceptée.\nVotre établissement est maintenant actif.\nVeuillez trouver la facture en pièce jointe.`,
          attachments: [
            {
              filename: `facture_${publicite._id}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        });
  
        // 3. Mise à jour de l’établissement
        await Etablissement.findByIdAndUpdate(publicite.etablissementId, { statut: 'Actif' });
  
        // 4. Suppression de la publicité
        await Publicite.findByIdAndDelete(req.params.id);
  
        res.status(200).json({ message: 'Publicité validée, établissement activé, mail envoyé.' });
      });
      const packPrices = {
        Basique: 50,
        Standard: 120,
        Premium: 200
      };
      const selectedPrice = packPrices[publicite.pack] || 0;
      // Écrire le contenu PDF
      doc.rect(0, 0, 600, 40).fill('#1e1b4b'); // Bande bleue foncée
      doc.fillColor('white').fontSize(18).text('Sfax - Facture Publicitaire', 200, 13, { align: 'center' });
      
      doc.moveDown(2);
      
      // 🗂️ Bloc d'informations
      doc.fillColor('black').fontSize(12);
      doc.rect(50, 70, 500, 100).stroke();
      doc.text(`Date : ${new Date().toLocaleDateString()}`, 60, 80);
      doc.text(`Établissement : ${publicite.nom}`, 60, 100);
      doc.text(`Adresse : ${etablissement.adresse}, ${etablissement.codePostal || ''}, ${etablissement.ville || ''}, ${etablissement.pays || ''}`, 60, 120);
      doc.text(`Téléphone : ${etablissement.telephone || '---'}`, 60, 140);
      doc.text(`Email : ${user.email}`, 300, 140);
      
      // 🧾 Détails du pack
      doc.moveDown(3);
      doc.fontSize(14).fillColor('black').text('Détails du Pack Choisi', { underline: true });
      
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Pack : ${publicite.pack}`);
      doc.text(`Durée : ${publicite.pack === 'Basique' ? '1 Mois' : publicite.pack === 'Standard' ? '3 Mois' : '6 Mois'}`);
      doc.text(`Prix : ${selectedPrice} TND`);
      
      // 📝 Description
      doc.moveDown();
      doc.fontSize(12).text(`Description : ${publicite.description || 'Aucune'}`);
      
      doc.end();
  
    } catch (err) {
      console.error('Erreur:', err);
      res.status(500).json({ message: 'Erreur lors de la validation', error: err.message });
    }
  };
  










// 🔍 Récupérer les publicités d’un partenaire
exports.getPublicitesByUser = async (req, res) => {
  try {
    const publicites = await Publicite.find({ utilisateurId: req.params.utilisateurId }).sort({ createdAt: -1 });
    res.status(200).json(publicites);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: err.message });
  }
};
