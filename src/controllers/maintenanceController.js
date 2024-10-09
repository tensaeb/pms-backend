const Maintenance = require('../models/maintenanceModel');

// CREATE a new maintenance request
const createMaintenanceRequest = async (req, res) => {
  const {
    tenant,
    property,
    typeOfRequest,
    description,
    urgencyLevel,
    preferredAccessTimes,
  } = req.body;

  // Upload maintenance request photos/videos
  const files = req.files.map(file => `/uploads/${file.filename}`);

  const maintenanceRequest = new Maintenance({
    tenant,
    property,
    typeOfRequest,
    description,
    urgencyLevel,
    preferredAccessTimes,
    photosOrVideos: files, // Store the uploaded files
  });

  const createdRequest = await maintenanceRequest.save();
  res.status(201).json(createdRequest);
};

// READ all maintenance requests
const getMaintenanceRequests = async (req, res) => {
  const maintenanceRequests = await Maintenance.find().populate('tenant property');
  res.json(maintenanceRequests);
};

// READ a single maintenance request by ID
const getMaintenanceRequestById = async (req, res) => {
  const maintenanceRequest = await Maintenance.findById(req.params.id).populate('tenant property');

  if (maintenanceRequest) {
    res.json(maintenanceRequest);
  } else {
    res.status(404).json({ message: 'Maintenance request not found' });
  }
};

// UPDATE a maintenance request (e.g., to assign to a technician, update status, add notes)
const updateMaintenanceRequest = async (req, res) => {
  const maintenanceRequest = await Maintenance.findById(req.params.id);

  if (maintenanceRequest) {
    maintenanceRequest.typeOfRequest = req.body.typeOfRequest || maintenanceRequest.typeOfRequest;
    maintenanceRequest.description = req.body.description || maintenanceRequest.description;
    maintenanceRequest.urgencyLevel = req.body.urgencyLevel || maintenanceRequest.urgencyLevel;
    maintenanceRequest.preferredAccessTimes = req.body.preferredAccessTimes || maintenanceRequest.preferredAccessTimes;
    maintenanceRequest.status = req.body.status || maintenanceRequest.status;
    maintenanceRequest.assignedTo = req.body.assignedTo || maintenanceRequest.assignedTo;
    maintenanceRequest.priorityLevel = req.body.priorityLevel || maintenanceRequest.priorityLevel;
    maintenanceRequest.estimatedCompletionTime = req.body.estimatedCompletionTime || maintenanceRequest.estimatedCompletionTime;
    maintenanceRequest.notes = req.body.notes || maintenanceRequest.notes;

    // Handle file uploads (if new files are uploaded)
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map(file => `/uploads/${file.filename}`);
      maintenanceRequest.photosOrVideos = newFiles; // Replace existing files
    }

    const updatedRequest = await maintenanceRequest.save();
    res.json(updatedRequest);
  } else {
    res.status(404).json({ message: 'Maintenance request not found' });
  }
};

// DELETE a maintenance request
const deleteMaintenanceRequest = async (req, res) => {
  const maintenanceRequest = await Maintenance.findById(req.params.id);

  if (maintenanceRequest) {
    await maintenanceRequest.remove();
    res.json({ message: 'Maintenance request removed' });
  } else {
    res.status(404).json({ message: 'Maintenance request not found' });
  }
};

module.exports = {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMaintenanceRequestById,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
};
