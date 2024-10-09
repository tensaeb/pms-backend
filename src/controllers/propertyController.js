const Property = require('../models/propertyModel');

// CREATE a new property
const createProperty = async (req, res) => {
  const { title, description, address, price, rentPrice, numberOfUnits, propertyType, floorPlan, amenities } = req.body;
  const photos = req.files.map(file => `/uploads/${file.filename}`); // Map uploaded file paths

  const property = new Property({
    title,
    description,
    address,
    price,
    rentPrice,
    numberOfUnits,
    propertyType,
    floorPlan,
    amenities,
    photos,
  });

  const createdProperty = await property.save();
  res.status(201).json(createdProperty);
};

// READ all properties
const getProperties = async (req, res) => {
  const properties = await Property.find();
  res.json(properties);
};

// READ a single property
const getPropertyById = async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (property) {
    res.json(property);
  } else {
    res.status(404).json({ message: 'Property not found' });
  }
};

// UPDATE a property
const updatePropertyById = async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (property) {
    property.title = req.body.title || property.title;
    property.description = req.body.description || property.description;
    property.address = req.body.address || property.address;
    property.price = req.body.price || property.price;
    property.rentPrice = req.body.rentPrice || property.rentPrice; // Update rent price
    property.numberOfUnits = req.body.numberOfUnits || property.numberOfUnits; // Update number of units
    property.propertyType = req.body.propertyType || property.propertyType; // Update property type
    property.floorPlan = req.body.floorPlan || property.floorPlan; // Update floor plan
    property.amenities = req.body.amenities || property.amenities; // Update amenities

    // Handle photo uploads
    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map(file => `/uploads/${file.filename}`);
      property.photos = newPhotos; // Replace existing photos
    }

    const updatedProperty = await property.save();
    res.json(updatedProperty);
  } else {
    res.status(404).json({ message: 'Property not found' });
  }
};

// DELETE a property
const deleteProperty = async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (property) {
    await property.remove();
    res.json({ message: 'Property removed' });
  } else {
    res.status(404).json({ message: 'Property not found' });
  }
};

module.exports = {
  createProperty,
  getProperties,
  getPropertyById,
  updatePropertyById,
  deleteProperty,
};
