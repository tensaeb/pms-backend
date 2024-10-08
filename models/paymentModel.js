const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String, // E.g., bank transfer, credit card, etc.
    required: true,
  },
  receiptUrl: {
    type: String, // URL or path to the digital receipt
  },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
