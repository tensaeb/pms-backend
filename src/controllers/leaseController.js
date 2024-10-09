const Lease = require('../models/leaseModel');

// CREATE a new lease agreement
const createLease = async (req, res) => {
  const {
    tenant,
    property,
    leaseStart,
    leaseEnd,
    rentAmount,
    securityDeposit,
    paymentTerms,
    rulesAndConditions,
    additionalOccupants,
    utilitiesAndServices,
  } = req.body;

  // Upload lease documents
  const leaseDocuments = req.files.map(file => `/uploads/${file.filename}`);

  const lease = new Lease({
    tenant,
    property,
    leaseStart,
    leaseEnd,
    rentAmount,
    securityDeposit,
    paymentTerms,
    rulesAndConditions,
    additionalOccupants,
    utilitiesAndServices,
    documents: leaseDocuments,
  });

  const createdLease = await lease.save();
  res.status(201).json(createdLease);
};

// READ all leases
const getLeases = async (req, res) => {
  const leases = await Lease.find().populate('tenant property');
  res.json(leases);
};

// READ a single lease by ID
const getLeaseById = async (req, res) => {
  const lease = await Lease.findById(req.params.id).populate('tenant property');

  if (lease) {
    res.json(lease);
  } else {
    res.status(404).json({ message: 'Lease not found' });
  }
};

// UPDATE a lease agreement
const updateLeaseById = async (req, res) => {
  const lease = await Lease.findById(req.params.id);

  if (lease) {
    lease.tenant = req.body.tenant || lease.tenant;
    lease.property = req.body.property || lease.property;
    lease.leaseStart = req.body.leaseStart || lease.leaseStart;
    lease.leaseEnd = req.body.leaseEnd || lease.leaseEnd;
    lease.rentAmount = req.body.rentAmount || lease.rentAmount;
    lease.securityDeposit = req.body.securityDeposit || lease.securityDeposit;
    lease.paymentTerms = req.body.paymentTerms || lease.paymentTerms;
    lease.rulesAndConditions = req.body.rulesAndConditions || lease.rulesAndConditions;
    lease.additionalOccupants = req.body.additionalOccupants || lease.additionalOccupants;
    lease.utilitiesAndServices = req.body.utilitiesAndServices || lease.utilitiesAndServices;

    // Handle lease document uploads
    if (req.files && req.files.length > 0) {
      const newDocuments = req.files.map(file => `/uploads/${file.filename}`);
      lease.documents = newDocuments; // Replace existing documents
    }

    const updatedLease = await lease.save();
    res.json(updatedLease);
  } else {
    res.status(404).json({ message: 'Lease not found' });
  }
};

// DELETE a lease agreement
const deleteLease = async (req, res) => {
  const lease = await Lease.findById(req.params.id);

  if (lease) {
    await lease.remove();
    res.json({ message: 'Lease removed' });
  } else {
    res.status(404).json({ message: 'Lease not found' });
  }
};

// DOWNLOAD lease document
const downloadLeaseDocument = async (req, res) => {
  const filePath = req.params.file; // Get the document URL from the request
  const fullPath = path.join(__dirname, '..', 'uploads', filePath); // Define the path to the file
  res.download(fullPath, err => {
    if (err) {
      res.status(404).json({ message: 'File not found' });
    }
  });
};

module.exports = {
  createLease,
  getLeases,
  getLeaseById,
  updateLeaseById,
  deleteLease,
  downloadLeaseDocument,
};
