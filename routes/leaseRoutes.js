const express = require('express');
const {
  createLease,
  getLeases,
  getLeaseById,
  updateLeaseById,
  deleteLease,
  downloadLeaseDocument,
} = require('../controllers/leaseController');
const multer = require('multer');
const router = express.Router();
const path = require('path');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Change this path as needed
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage }).array('documents', 5); // Limit to 5 documents

// Routes
router.post('/', upload, createLease); // Create a lease
router.get('/', getLeases); // Get all leases
router.get('/:id', getLeaseById); // Get a single lease
router.put('/:id', upload, updateLeaseById); // Update a lease
router.delete('/:id', deleteLease); // Delete a lease
router.get('/download/:file', downloadLeaseDocument); // Download a lease document

module.exports = router;
