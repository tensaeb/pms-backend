const express = require('express');
const {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMaintenanceRequestById,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
} = require('../controllers/maintenanceController');
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

const upload = multer({ storage: storage }).array('photosOrVideos', 4); // Limit to 4 files

// Routes
router.post('/', upload, createMaintenanceRequest); // Create a maintenance request
router.get('/', getMaintenanceRequests); // Get all maintenance requests
router.get('/:id', getMaintenanceRequestById); // Get a single maintenance request
router.put('/:id', upload, updateMaintenanceRequest); // Update a maintenance request
router.delete('/:id', deleteMaintenanceRequest); // Delete a maintenance request

module.exports = router;
