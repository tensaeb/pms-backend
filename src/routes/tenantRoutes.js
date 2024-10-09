const express = require('express');
const {
  createTenant,
  getTenants,
  getTenantById,
  updateTenantById,
  deleteTenant,
} = require('../controllers/tenantController');
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

const upload = multer({ storage: storage }).array('idProof', 3); // Limit to 3 ID proofs

// Routes
router.post('/', upload, createTenant); // Create a tenant
router.get('/', getTenants); // Get all tenants
router.get('/:id', getTenantById); // Get a single tenant
router.put('/:id', upload, updateTenantById); // Update a tenant
router.delete('/:id', deleteTenant); // Delete a tenant

module.exports = router;
