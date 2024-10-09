const RentInvoice = require('../models/rentInvoiceModel');

// CREATE a new rent invoice
const createRentInvoice = async (req, res) => {
  const { tenant, property, rentAmount, additionalCharges, dueDate, paymentInstructions } = req.body;

  const totalAmount = rentAmount + (additionalCharges || 0);

  const rentInvoice = new RentInvoice({
    tenant,
    property,
    rentAmount,
    additionalCharges,
    totalAmount,
    dueDate,
    paymentInstructions,
  });

  const createdInvoice = await rentInvoice.save();
  res.status(201).json(createdInvoice);
};

// READ all rent invoices
const getRentInvoices = async (req, res) => {
  const rentInvoices = await RentInvoice.find().populate('tenant property');
  res.json(rentInvoices);
};

// READ a single rent invoice by ID
const getRentInvoiceById = async (req, res) => {
  const rentInvoice = await RentInvoice.findById(req.params.id).populate('tenant property');

  if (rentInvoice) {
    res.json(rentInvoice);
  } else {
    res.status(404).json({ message: 'Rent invoice not found' });
  }
};

// UPDATE the payment status of a rent invoice (mark as paid, log payment)
const updateRentInvoicePayment = async (req, res) => {
  const rentInvoice = await RentInvoice.findById(req.params.id);

  if (rentInvoice) {
    const { amountPaid, paymentMethod, paymentDate } = req.body;
    
    rentInvoice.paymentHistory.push({
      paymentDate: paymentDate || Date.now(),
      amountPaid,
      paymentMethod,
      receiptUrl: `/receipts/${Date.now()}-receipt.pdf`, // Placeholder for receipt URL
    });

    // Check if full payment is made
    const totalPaid = rentInvoice.paymentHistory.reduce((acc, payment) => acc + payment.amountPaid, 0);
    if (totalPaid >= rentInvoice.totalAmount) {
      rentInvoice.paymentStatus = 'Paid';
    } else if (Date.now() > new Date(rentInvoice.dueDate)) {
      rentInvoice.paymentStatus = 'Late';
    }

    const updatedInvoice = await rentInvoice.save();
    res.json(updatedInvoice);
  } else {
    res.status(404).json({ message: 'Rent invoice not found' });
  }
};

// DELETE a rent invoice
const deleteRentInvoice = async (req, res) => {
  const rentInvoice = await RentInvoice.findById(req.params.id);

  if (rentInvoice) {
    await rentInvoice.remove();
    res.json({ message: 'Rent invoice removed' });
  } else {
    res.status(404).json({ message: 'Rent invoice not found' });
  }
};

module.exports = {
  createRentInvoice,
  getRentInvoices,
  getRentInvoiceById,
  updateRentInvoicePayment,
  deleteRentInvoice,
};
