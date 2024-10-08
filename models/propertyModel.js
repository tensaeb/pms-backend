const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  rentPrice: {
    type: Number, // Add rent price for rental properties
  },
  numberOfUnits: {
    type: Number, // Number of units in the property
    required: true,
  },
  propertyType: {
    type: String, // Type of property (e.g., apartment, house)
    required: true,
  },
  floorPlan: {
    type: String, // URL or path to the floor plan image
  },
  amenities: {
    type: [String], // List of amenities (e.g., pool, gym)
  },
  photos: {
    type: [String], // Array of strings for photo URLs
    validate: [arrayLimit, 'Exceeds the limit of 5 photos'],
  },
}, { timestamps: true });

// Validation function to limit the number of photos
function arrayLimit(val) {
  return val.length <= 5; // Limit to a maximum of 5 photos
}

module.exports = mongoose.model('Property', propertySchema);
