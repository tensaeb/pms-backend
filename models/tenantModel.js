const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantName: {
    type: String,
    required: true,
  },
  contactInformation: {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    emergencyContact: {
      type: String, // This can be an object if you want to include multiple details
    },
  },
  leaseAgreement: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
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
    specialTerms: {
      type: String, // Any special terms regarding the lease
    },
  },
  propertyInformation: {
    unit: {
      type: String, // The unit or property name
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property', // Reference to the Property model
    },
  },
  idProof: {
    type: [String], // Array of strings for ID proof file URLs
    validate: [arrayLimit, 'Exceeds the limit of 3 ID proofs'],
  },
  paymentMethod: {
    type: String, // e.g., bank transfer, credit card
    required: true,
  },
  moveInDate: {
    type: Date,
    required: true,
  },
  emergencyContacts: {
    type: [String], // List of emergency contacts
  },
}, { timestamps: true });

// Validation function to limit the number of ID proofs
function arrayLimit(val) {
  return val.length <= 3; // Limit to a maximum of 3 ID proofs
}

module.exports = mongoose.model('Tenant', tenantSchema);
