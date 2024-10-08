const Tenant = require('../models/tenantModel');

// CREATE a new tenant
const createTenant = async (req, res) => {
  const {
    tenantName,
    contactInformation,
    leaseAgreement,
    propertyInformation,
    idProof,
    paymentMethod,
    moveInDate,
    emergencyContacts,
  } = req.body;

  // Upload ID Proofs
  const idProofFiles = req.files.map(file => `/uploads/${file.filename}`);

  const tenant = new Tenant({
    tenantName,
    contactInformation,
    leaseAgreement,
    propertyInformation,
    idProof: idProofFiles,
    paymentMethod,
    moveInDate,
    emergencyContacts,
  });

  const createdTenant = await tenant.save();
  res.status(201).json(createdTenant);
};

// READ all tenants
const getTenants = async (req, res) => {
  const tenants = await Tenant.find().populate('propertyInformation.propertyId');
  res.json(tenants);
};

// READ a single tenant
const getTenantById = async (req, res) => {
  const tenant = await Tenant.findById(req.params.id).populate('propertyInformation.propertyId');

  if (tenant) {
    res.json(tenant);
  } else {
    res.status(404).json({ message: 'Tenant not found' });
  }
};

// UPDATE a tenant
const updateTenantById = async (req, res) => {
  const tenant = await Tenant.findById(req.params.id);

  if (tenant) {
    tenant.tenantName = req.body.tenantName || tenant.tenantName;
    tenant.contactInformation = req.body.contactInformation || tenant.contactInformation;
    tenant.leaseAgreement = req.body.leaseAgreement || tenant.leaseAgreement;
    tenant.propertyInformation = req.body.propertyInformation || tenant.propertyInformation;
    tenant.paymentMethod = req.body.paymentMethod || tenant.paymentMethod;
    tenant.moveInDate = req.body.moveInDate || tenant.moveInDate;
    tenant.emergencyContacts = req.body.emergencyContacts || tenant.emergencyContacts;

    // Handle ID proof uploads
    if (req.files && req.files.length > 0) {
      const newIdProofs = req.files.map(file => `/uploads/${file.filename}`);
      tenant.idProof = newIdProofs; // Replace existing ID proofs
    }

    const updatedTenant = await tenant.save();
    res.json(updatedTenant);
  } else {
    res.status(404).json({ message: 'Tenant not found' });
  }
};

// DELETE a tenant
const deleteTenant = async (req, res) => {
  const tenant = await Tenant.findById(req.params.id);

  if (tenant) {
    await tenant.remove();
    res.json({ message: 'Tenant removed' });
  } else {
    res.status(404).json({ message: 'Tenant not found' });
  }
};

module.exports = {
  createTenant,
  getTenants,
  getTenantById,
  updateTenantById,
  deleteTenant,
};
