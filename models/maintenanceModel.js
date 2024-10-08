const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
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
  typeOfRequest: {
    type: String,
    enum: ['Plumbing', 'Electrical', 'HVAC', 'Appliance Repair', 'Other'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  photosOrVideos: {
    type: [String], // Array to store the paths for uploaded photos or videos
    validate: [arrayLimit, 'Exceeds the limit of 4 files'],
  },
  urgencyLevel: {
    type: String,
    enum: ['Urgent', 'Routine', 'Non-Urgent'],
    required: true,
  },
  preferredAccessTimes: {
    type: String, // Example: "Weekdays 9am-5pm"
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  assignedTo: {
    type: String, // The name of the maintenance person or team
  },
  priorityLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
  },
  estimatedCompletionTime: {
    type: Date,
  },
  notes: {
    type: String, // Internal notes for the property manager
  },
}, { timestamps: true });

// Validation function to limit the number of uploads
function arrayLimit(val) {
  return val.length <= 4; // Limit to a maximum of 4 files (photos/videos)
}

module.exports = mongoose.model('Maintenance', maintenanceSchema);
