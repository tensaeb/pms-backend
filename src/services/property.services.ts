import { Property } from "../models/property.model";
import { IProperty } from "../interfaces/property.interface";
import fs from "fs";

class PropertyService {
  // Create a new property
  public async createProperty(
    propertyData: Partial<IProperty>,
    files?: Express.Multer.File[]
  ): Promise<IProperty> {
    const {
      title,
      description,
      address,
      price,
      rentPrice,
      numberOfUnits,
      propertyType,
      floorPlan,
      amenities,
    } = propertyData;

    const newProperty = new Property({
      title,
      description,
      address,
      price,
      rentPrice,
      numberOfUnits,
      propertyType,
      floorPlan,
      amenities,
    });

    if (files && files.length > 0) {
      newProperty.photos = files.map((file) => file.filename); // Save all filenames
    }

    return await newProperty.save();
  }

  // Get all properties with pagination and search
  public async getAllProperties(query: any): Promise<{
    properties: Partial<IProperty>[];
    totalPages: number;
    currentPage: number;
    totalProperties: number;
  }> {
    const { page = 1, limit = 5, search = "", propertyType } = query;

    // Search query with optional filters
    const searchQuery: any = {
      title: { $regex: search, $options: "i" },
    };

    if (propertyType) {
      searchQuery.propertyType = propertyType;
    }

    const properties = await Property.find(searchQuery)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalProperties = await Property.countDocuments(searchQuery);

    return {
      properties,
      totalPages: Math.ceil(totalProperties / limit),
      currentPage: Number(page),
      totalProperties,
    };
  }

  // Get a single property by ID
  public async getPropertyById(id: string): Promise<IProperty | null> {
    return await Property.findById(id);
  }

  // Update a property by ID
  public async updateProperty(
    id: string,
    updateData: Partial<IProperty>,
    file?: Express.Multer.File
  ) {
    if (file) {
      updateData.photos = [file.filename];
    }

    const updatedProperty = await Property.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedProperty) {
      throw new Error("Property not found");
    }

    return updatedProperty;
  }

  // Delete a property by ID
  public async deleteProperty(id: string): Promise<IProperty | null> {
    const property = await Property.findByIdAndDelete(id);
    if (property && property.photos.length > 0) {
      property.photos.forEach((photo) => {
        fs.unlinkSync(photo);
      });
    }
    return property;
  }
}

export const propertyService = new PropertyService();
