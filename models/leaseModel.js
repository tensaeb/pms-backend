const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant', // Reference to Tenant model
    required: true,
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property', // Reference to Property model
    required: true,
  },
  leaseStart: {
    type: Date,
    required: true,
  },
  leaseEnd: {
    type: Date,
    required: true,
  },
  rentAmount: {
    type: Number,
    required: true,
  },
  securityDeposit: {
    type: Number,
    required: true,
  },
  paymentTerms: {
    dueDate: {
      type: String, // e.g., "monthly", "yearly"
      required: true,
    },
    paymentMethod: {
      type: String, // e.g., "Bank Transfer", "Credit Card"
      required: true,
    },
  },
  rulesAndConditions: {
    type: String, // e.g., "Late fees, maintenance responsibilities"
  },
  additionalOccupants: {
    type: [String], // Array of occupants' names
  },
  utilitiesAndServices: {
    type: String, // e.g., "Tenant pays electricity and water, landlord covers internet"
  },
  documents: {
    type: [String], // Array of URLs to uploaded documents (e.g., signed lease agreements)
  },
}, { timestamps: true });

module.exports = mongoose.model('Lease', leaseSchema);
