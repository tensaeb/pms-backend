const Payment = require('../models/paymentModel');
const Invoice = require('../models/rentInvoiceModel.js');

// CREATE a new payment
const createPayment = async (req, res) => {
  const { tenantId, invoiceId, amountPaid, paymentMethod } = req.body;

  const payment = new Payment({
    tenant: tenantId,
    invoice: invoiceId,
    amountPaid,
    paymentMethod,
    receiptUrl: `/receipts/${invoiceId}.pdf`, // Example path for receipt
  });

  const createdPayment = await payment.save();

  // Update the corresponding invoice status to "Paid"
  const invoice = await Invoice.findById(invoiceId);
  if (invoice) {
    invoice.status = 'Paid';
    await invoice.save();
  }

  res.status(201).json(createdPayment);
};

// GET all payments
const getPayments = async (req, res) => {
  const payments = await Payment.find().populate('tenant invoice');
  res.json(payments);
};

// GET a single payment by ID
const getPaymentById = async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('tenant invoice');

  if (payment) {
    res.json(payment);
  } else {
    res.status(404).json({ message: 'Payment not found' });
  }
};

// DELETE a payment
const deletePayment = async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (payment) {
    await payment.remove();
    res.json({ message: 'Payment removed' });
  } else {
    res.status(404).json({ message: 'Payment not found' });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  deletePayment,
};
