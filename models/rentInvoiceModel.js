const mongoose = require('mongoose');

const rentInvoiceSchema = new mongoose.Schema({
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
  invoiceDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  rentAmount: {
    type: Number,
    required: true,
  },
  additionalCharges: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Late'],
    default: 'Pending',
  },
  paymentInstructions: {
    type: String,
  },
  paymentHistory: [{
    paymentDate: {
      type: Date,
    },
    amountPaid: {
      type: Number,
    },
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'Credit Card', 'Cash', 'Other'],
    },
    receiptUrl: {
      type: String, // URL to download digital receipts
    }
  }],
}, { timestamps: true });

module.exports = mongoose.model('RentInvoice', rentInvoiceSchema);
