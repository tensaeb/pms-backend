const express = require('express');
const {
  createRentInvoice,
  getRentInvoices,
  getRentInvoiceById,
  updateRentInvoicePayment,
  deleteRentInvoice,
} = require('../controllers/rentInvoiceController');

const router = express.Router();

// Routes for rent invoices
router.post('/', createRentInvoice); // Create rent invoice
router.get('/', getRentInvoices); // Get all rent invoices
router.get('/:id', getRentInvoiceById); // Get single rent invoice by ID
router.put('/:id/payment', updateRentInvoicePayment); // Update rent invoice payment
router.delete('/:id', deleteRentInvoice); // Delete rent invoice

module.exports = router;
