const express = require('express');
const { createProperty, getProperties, getPropertyById, updatePropertyById, deleteProperty } = require('../controllers/propertyController');
const multer = require('multer');
const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Change this path as needed
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage }).array('photos', 5); // Limit to 5 photos

// Routes
router.post('/', upload, createProperty); // Create a property
router.get('/', getProperties); // Get all properties
router.get('/:id', getPropertyById); // Get a single property
router.put('/:id', upload, updatePropertyById); // Update a property
router.delete('/:id', deleteProperty); // Delete a property

module.exports = router;
