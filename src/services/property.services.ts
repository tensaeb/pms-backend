import { Property } from "../models/property.model";
import {
  IProperty,
  IPhoto,
  PropertyType,
  PropertyTypeValue,
} from "../interfaces/property.interface";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { Parser } from "@json2csv/plainjs";
import { PropertyStatus, isPropertyStatus } from "../utils/typeCheckers";
import * as XLSX from "xlsx";

class PropertyService {
  private readonly parser = new Parser();
  private readonly UPLOAD_DIR = path.join(
    process.cwd(),
    "uploads",
    "properties"
  );
  private readonly REPORTS_DIR = path.join(process.cwd(), "reports");

  constructor() {
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    [this.UPLOAD_DIR, this.REPORTS_DIR].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private async processImage(file: Express.Multer.File): Promise<IPhoto> {
    const photoId = uuidv4();
    const fileName = `${photoId}${path.extname(file.originalname)}`;
    const photoPath = path.join(this.UPLOAD_DIR, fileName);

    await sharp(file.path).resize(800).toFile(photoPath);
    fs.unlinkSync(file.path); // Remove the temporary file
    const photoUrl = `/uploads/properties/${fileName}`;

    return {
      id: photoId,
      url: photoUrl,
    };
  }

  public async createProperty(
    propertyData: Partial<IProperty>,
    files?: Express.Multer.File[]
  ): Promise<IProperty> {
    const photos: IPhoto[] = [];

    if (files?.length) {
      await Promise.all(
        files.map(async (file) => {
          const photo = await this.processImage(file);
          photos.push(photo);
        })
      );
    }
    const newProperty = new Property({
      ...propertyData,
      photos,
    } as IProperty); // Added assertion to fix typescript errors due to type mismatches and to match the structure we defined for SQL model

    return await newProperty.save();
  }
  async getAllImages(propertyId: string): Promise<IPhoto[]> {
    const property = await Property.findById(propertyId).select("photos");
    if (!property) {
      throw new Error("Property not found");
    }
    return property.photos || [];
  }

  async getImage(propertyId: string, imageId: string): Promise<IPhoto | null> {
    const property = await Property.findById(propertyId).select("photos");
    if (!property) {
      throw new Error("Property not found");
    }
    const image = property.photos.find((img: IPhoto) => img.id === imageId);
    if (!image) {
      throw new Error("Image not found");
    }
    return image;
  }

  public async editPhoto(
    propertyId: string,
    photoId: string,
    file: Express.Multer.File | undefined
  ): Promise<IProperty> {
    const property = await Property.findById(propertyId);
    if (!property) throw new Error("Property not found");

    const photoIndex = property.photos.findIndex((p) => p.id === photoId);
    if (photoIndex === -1) throw new Error("Photo not found");

    const oldPhotoUrl = property.photos[photoIndex].url;

    if (!file) {
      throw new Error("New image not found, must upload a new image.");
    }
    const photo = await this.processImage(file);

    // Delete old file
    try {
      const oldFilePath = path.join(process.cwd(), oldPhotoUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    } catch (deleteError: any) {
      console.error("Error deleting old photo file: ", deleteError.message);
      // Note: We won't throw here as the file deletion is not crucial to image replacement.
    }
    property.photos[photoIndex].url = photo.url;

    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      { photos: property.photos },
      { new: true, runValidators: true }
    );
    if (!updatedProperty) throw new Error("Property update failed");

    return updatedProperty;
  }

  public async deletePhoto(
    propertyId: string,
    photoId: string
  ): Promise<IProperty> {
    const property = await Property.findById(propertyId);
    if (!property) throw new Error("Property not found");

    const photo = property.photos.find((p) => p.id === photoId);
    if (!photo) throw new Error("Photo not found");

    // Delete physical file
    const filePath = path.join(process.cwd(), photo.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    property.photos = property.photos.filter((p) => p.id !== photoId);

    //Ensure admin is passed along
    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      { photos: property.photos },
      { new: true, runValidators: true }
    );

    if (!updatedProperty) throw new Error("Property update failed");

    return updatedProperty;
  }

  public async getAllProperties(query: {
    page?: number;
    limit?: number;
    search?: string;
    propertyType?: string;
  }) {
    const { page = 1, limit = 10, search = "", propertyType } = query;

    const searchQuery: any = {
      status: { $ne: "deleted" },
      title: { $regex: search, $options: "i" },
    };

    if (propertyType) {
      searchQuery.propertyType = propertyType;
    }

    const [properties, totalProperties] = await Promise.all([
      Property.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Property.countDocuments(searchQuery),
    ]);

    return {
      properties,
      totalPages: Math.ceil(totalProperties / limit),
      currentPage: Number(page),
      totalProperties,
      numberOfProperties: properties.length,
    };
  }

  public async getPropertyById(id: string): Promise<IProperty> {
    const property = await Property.findOne({
      _id: id,
      status: { $ne: "deleted" },
    });
    if (!property) throw new Error("Property not found");
    return property;
  }

  public async updateProperty(
    id: string,
    updateData: Partial<IProperty>,
    files?: Express.Multer.File[]
  ): Promise<IProperty> {
    const property = await Property.findById(id);
    if (!property) throw new Error("Property not found");

    if (files?.length) {
      const newPhotos = await Promise.all(
        files.map((file) => this.processImage(file))
      );
      updateData.photos = [...property.photos, ...newPhotos];
    }

    const updatedProperty = await Property.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!updatedProperty) throw new Error("Update failed");

    return updatedProperty;
  }
  public async deleteProperty(id: string): Promise<void> {
    const property = await Property.findById(id);
    if (!property) throw new Error("Property not found");

    // Delete associated photos
    if (property.photos && property.photos.length > 0) {
      property.photos.forEach((photo) => {
        if (photo && photo.url) {
          // ADDED CHECK HERE
          const filePath = path.join(process.cwd(), photo.url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          } else {
            console.warn(
              `File not found at path: ${filePath} while deleting property: ${id}`
            );
          }
        } else {
          console.warn(
            `Photo object or url is undefined while deleting property: ${id}`,
            photo
          );
        }
      });
    }
    await Property.findByIdAndDelete(id);
  }

  public async softDeleteProperty(id: string): Promise<IProperty> {
    const property = await Property.findById(id);
    if (!property) throw new Error("Property not found");

    property.status = "deleted";

    const softDeletedProperty = await property.save();
    return softDeletedProperty;
  }
  public async getPropertiesByUserId(
    userId: string,
    query: any
  ): Promise<{
    properties: Partial<IProperty>[];
    totalPages: number;
    currentPage: number;
    totalProperties: number;
    numberOfProperties: number;
  }> {
    const { page = 1, limit = 10, search = "" } = query;

    const searchQuery: any = {
      userCreated: userId,
      status: { $ne: "deleted" },
      $or: [{ title: { $regex: search, $options: "i" } }],
    };

    const [properties, totalProperties] = await Promise.all([
      Property.find(searchQuery)
        .select("-__v")
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Property.countDocuments(searchQuery),
    ]);

    return {
      properties,
      totalPages: Math.ceil(totalProperties / limit),
      currentPage: Number(page),
      totalProperties,
      numberOfProperties: properties.length,
    };
  }

  public async getPropertiesByUserAdminID(
    userAdminId: string,
    query: any
  ): Promise<{
    properties: Partial<IProperty>[];
    totalPages: number;
    currentPage: number;
    totalProperties: number;
    numberOfProperties: number;
  }> {
    const { page = 1, limit = 10, search = "" } = query;

    // Fetch properties that were created by users registered by the loggedInUserId.
    const searchQuery: any = {
      "userCreated.registeredBy": userAdminId,
      status: { $ne: "deleted" },
      $or: [{ title: { $regex: search, $options: "i" } }],
    };

    const [properties, totalProperties] = await Promise.all([
      Property.find(searchQuery)
        .populate({
          path: "userCreated",
          select: "registeredBy",
        })
        .select("-__v")
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Property.countDocuments(searchQuery),
    ]);
    return {
      properties,
      totalPages: Math.ceil(totalProperties / limit),
      currentPage: Number(page),
      totalProperties,
      numberOfProperties: properties.length,
    };
  }

  public async updatePropertyStatus(propertyId: string, status: string) {
    try {
      const property = await Property.findById(propertyId);

      if (!property) {
        throw new Error(`Property with id ${propertyId} not found`);
      }

      if (!isPropertyStatus(status)) {
        throw new Error(`${status} is not a valid property status`);
      }
      property.status = status;
      await property.save();
      return property;
    } catch (error) {
      console.error(`Error updating property status to ${status}`, error);
      throw error;
    }
  }
  public async getPropertiesByStatus(
    status: PropertyStatus,
    query: { page?: number; limit?: number; search?: string } = {}
  ): Promise<{
    properties: Partial<IProperty>[];
    totalPages: number;
    currentPage: number;
    totalProperties: number;
    numberOfProperties: number;
  }> {
    const { page = 1, limit = 10, search = "" } = query;

    const searchQuery: any = {
      status: status,
      title: { $regex: search, $options: "i" },
    };

    const [properties, totalProperties] = await Promise.all([
      Property.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Property.countDocuments(searchQuery),
    ]);

    return {
      properties,
      totalPages: Math.ceil(totalProperties / limit),
      currentPage: Number(page),
      totalProperties,
      numberOfProperties: properties.length,
    };
  }

  public async getPropertiesByType(
    propertyType: PropertyTypeValue,
    query: { page?: number; limit?: number; search?: string } = {}
  ): Promise<{
    properties: Partial<IProperty>[];
    totalPages: number;
    currentPage: number;
    totalProperties: number;
    numberOfProperties: number;
  }> {
    const { page = 1, limit = 10, search = "" } = query;

    const searchQuery: any = {
      propertyType: propertyType,
      status: { $ne: "deleted" },
      title: { $regex: search, $options: "i" },
    };

    const [properties, totalProperties] = await Promise.all([
      Property.find(searchQuery)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Property.countDocuments(searchQuery),
    ]);

    return {
      properties,
      totalPages: Math.ceil(totalProperties / limit),
      currentPage: Number(page),
      totalProperties,
      numberOfProperties: properties.length,
    };
  }
  // create properties from excel
  public async createPropertiesFromExcel(
    file: Express.Multer.File,
    user: any
  ): Promise<IProperty[]> {
    try {
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const excelData: any[] = XLSX.utils.sheet_to_json(worksheet);
      fs.unlinkSync(file.path); // Remove temp file

      const properties = excelData.map((row) => {
        return {
          userCreated: user,
          title: row.Title,
          description: row.Description,
          address: row.Address,
          price: row.Price,
          rentPrice: row.RentPrice,
          numberOfUnits: row.NumberOfUnits,
          propertyType: row.PropertyType,
          floorPlan: row.FloorPlan,
          amenities: row.Amenities
            ? row.Amenities.split(",").map((amenity: string) => amenity.trim())
            : [],
          status: row.Status || "open",
          photos: [], // Important: Photos are empty for excel imports
        } as Partial<IProperty>; // Type assertion here is changed
      });

      const createdProperties = await Property.insertMany(properties);

      return createdProperties.map((prop) =>
        prop?.toObject ? prop.toObject() : prop
      ) as IProperty[];
    } catch (error) {
      console.error("Error importing properties from excel", error);
      throw new Error("Error reading from the excel file");
    }
  }
  // Multiple soft delete
  public async softDeleteMultipleProperties(
    ids: string[]
  ): Promise<IProperty[]> {
    const properties = await Property.find({ _id: { $in: ids } });
    if (!properties || properties.length === 0)
      throw new Error("No properties to delete");

    properties.forEach((prop) => (prop.status = "deleted"));
    const softDeletedProperties = await Promise.all(
      properties.map(async (prop) => await prop.save())
    );

    return softDeletedProperties;
  }
}
export const propertyService = new PropertyService();
