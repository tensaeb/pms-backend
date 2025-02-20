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
import logger from "../utils/logger";
import mongoose from "mongoose";
import { Tenant } from "../models/tenant.model";
import { Lease } from "../models/lease.model";
import { User } from "../models/user.model";

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

    try {
      await sharp(file.path).resize(800).toFile(photoPath);
      fs.unlinkSync(file.path); // Remove the temporary file
      const photoUrl = `/uploads/properties/${fileName}`;

      return {
        id: photoId,
        url: photoUrl,
      };
    } catch (error) {
      logger.error(`Error processing image: ${error}`);
      throw error; // Re-throw to be handled upstream
    }
  }

  public async createProperty(
    propertyData: Partial<IProperty>,
    files?: Express.Multer.File[]
  ): Promise<IProperty> {
    try {
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

      const savedProperty = await newProperty.save();
      logger.info(`Property created with ID: ${savedProperty._id}`);
      return savedProperty;
    } catch (error) {
      logger.error(`Error creating property: ${error}`);
      throw error;
    }
  }
  async getAllImages(propertyId: string): Promise<IPhoto[]> {
    try {
      const property = await Property.findById(propertyId).select("photos");
      if (!property) {
        logger.warn(`Property with ID ${propertyId} not found.`);
        throw new Error("Property not found");
      }
      return property.photos || [];
    } catch (error) {
      logger.error(
        `Error getting all images for property ${propertyId}: ${error}`
      );
      throw error;
    }
  }

  async getImage(propertyId: string, imageId: string): Promise<IPhoto | null> {
    try {
      const property = await Property.findById(propertyId).select("photos");
      if (!property) {
        logger.warn(`Property with ID ${propertyId} not found.`);
        throw new Error("Property not found");
      }
      const image = property.photos.find((img: IPhoto) => img.id === imageId);
      if (!image) {
        logger.warn(
          `Image with ID ${imageId} not found for property ${propertyId}.`
        );
        throw new Error("Image not found");
      }
      return image;
    } catch (error) {
      logger.error(
        `Error getting image ${imageId} for property ${propertyId}: ${error}`
      );
      throw error;
    }
  }

  public async editPhoto(
    propertyId: string,
    photoId: string,
    file: Express.Multer.File | undefined
  ): Promise<IProperty> {
    try {
      const property = await Property.findById(propertyId);
      if (!property) {
        logger.warn(`Property with ID ${propertyId} not found.`);
        throw new Error("Property not found");
      }

      const photoIndex = property.photos.findIndex((p) => p.id === photoId);
      if (photoIndex === -1) {
        logger.warn(
          `Photo with ID ${photoId} not found for property ${propertyId}.`
        );
        throw new Error("Photo not found");
      }

      const oldPhotoUrl = property.photos[photoIndex].url;

      if (!file) {
        logger.warn("New image not found, must upload a new image.");
        throw new Error("New image not found, must upload a new image.");
      }
      const photo = await this.processImage(file);

      // Delete old file
      try {
        const oldFilePath = path.join(process.cwd(), oldPhotoUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          logger.info(`Old photo file deleted: ${oldFilePath}`);
        }
      } catch (deleteError: any) {
        logger.error(`Error deleting old photo file: ${deleteError.message}`);
        // Note: We won't throw here as the file deletion is not crucial to image replacement.
      }
      property.photos[photoIndex].url = photo.url;

      const updatedProperty = await Property.findByIdAndUpdate(
        propertyId,
        { photos: property.photos },
        { new: true, runValidators: true }
      );
      if (!updatedProperty) {
        logger.error(`Property update failed for property ${propertyId}.`);
        throw new Error("Property update failed");
      }

      logger.info(`Photo ${photoId} updated for property ${propertyId}.`);
      return updatedProperty;
    } catch (error) {
      logger.error(
        `Error editing photo ${photoId} for property ${propertyId}: ${error}`
      );
      throw error;
    }
  }

  public async deletePhoto(
    propertyId: string,
    photoId: string
  ): Promise<IProperty> {
    try {
      const property = await Property.findById(propertyId);
      if (!property) {
        logger.warn(`Property with ID ${propertyId} not found.`);
        throw new Error("Property not found");
      }

      const photo = property.photos.find((p) => p.id === photoId);
      if (!photo) {
        logger.warn(
          `Photo with ID ${photoId} not found for property ${propertyId}.`
        );
        throw new Error("Photo not found");
      }

      // Delete physical file
      const filePath = path.join(process.cwd(), photo.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Photo file deleted: ${filePath}`);
      }

      property.photos = property.photos.filter((p) => p.id !== photoId);

      //Ensure admin is passed along
      const updatedProperty = await Property.findByIdAndUpdate(
        propertyId,
        { photos: property.photos },
        { new: true, runValidators: true }
      );

      if (!updatedProperty) {
        logger.error(`Property update failed for property ${propertyId}.`);
        throw new Error("Property update failed");
      }

      logger.info(`Photo ${photoId} deleted for property ${propertyId}.`);
      return updatedProperty;
    } catch (error) {
      logger.error(
        `Error deleting photo ${photoId} for property ${propertyId}: ${error}`
      );
      throw error;
    }
  }

  public async getAllProperties(query: {
    page?: number;
    limit?: number;
    search?: string;
    propertyType?: string;
  }) {
    try {
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

      logger.info(
        `Retrieved ${properties.length} properties (page ${page}, limit ${limit}, search "${search}", propertyType "${propertyType}"). Total properties: ${totalProperties}`
      );

      const numberOfProperties = properties.length; // Define here

      return {
        properties,
        totalPages: Math.ceil(totalProperties / limit),
        currentPage: Number(page),
        totalProperties,
        numberOfProperties,
      };
    } catch (error) {
      logger.error(`Error getting all properties: ${error}`);
      throw error;
    }
  }

  public async getPropertyById(id: string): Promise<IProperty> {
    try {
      const property = await Property.findOne({
        _id: id,
        status: { $ne: "deleted" },
      });
      if (!property) {
        logger.warn(`Property with ID ${id} not found.`);
        throw new Error("Property not found");
      }
      logger.info(`Retrieved property with ID: ${id}`);
      return property;
    } catch (error) {
      logger.error(`Error getting property by ID ${id}: ${error}`);
      throw error;
    }
  }

  public async updateProperty(
    id: string,
    updateData: Partial<IProperty>,
    files?: Express.Multer.File[]
  ): Promise<IProperty> {
    try {
      const property = await Property.findById(id);
      if (!property) {
        logger.warn(`Property with ID ${id} not found.`);
        throw new Error("Property not found");
      }

      if (files?.length) {
        const newPhotos = await Promise.all(
          files.map((file) => this.processImage(file))
        );
        updateData.photos = [...property.photos, ...newPhotos];
      }

      const updatedProperty = await Property.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      if (!updatedProperty) {
        logger.error(`Update failed for property ${id}.`);
        throw new Error("Update failed");
      }

      logger.info(`Property with ID ${id} updated successfully.`);
      return updatedProperty;
    } catch (error) {
      logger.error(`Error updating property ${id}: ${error}`);
      throw error;
    }
  }
  public async deleteProperty(id: string): Promise<void> {
    try {
      const property = await Property.findById(id);
      if (!property) {
        logger.warn(`Property with ID ${id} not found.`);
        throw new Error("Property not found");
      }

      // Delete associated photos
      if (property.photos && property.photos.length > 0) {
        property.photos.forEach((photo) => {
          if (photo && photo.url) {
            // ADDED CHECK HERE
            const filePath = path.join(process.cwd(), photo.url);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              logger.info(`Photo file deleted: ${filePath}`);
            } else {
              logger.warn(
                `File not found at path: ${filePath} while deleting property: ${id}`
              );
            }
          } else {
            logger.warn(
              `Photo object or url is undefined while deleting property: ${id}`,
              photo
            );
          }
        });
      }
      await Property.findByIdAndDelete(id);
      logger.info(`Property with ID ${id} deleted successfully.`);
    } catch (error) {
      logger.error(`Error deleting property ${id}: ${error}`);
      throw error;
    }
  }

  public async softDeleteProperty(id: string): Promise<IProperty> {
    try {
      const property = await Property.findById(id);
      if (!property) {
        logger.warn(`Property with ID ${id} not found.`);
        throw new Error("Property not found");
      }

      property.status = "deleted";

      const softDeletedProperty = await property.save();
      logger.info(`Property with ID ${id} soft deleted.`);
      return softDeletedProperty;
    } catch (error) {
      logger.error(`Error soft deleting property ${id}: ${error}`);
      throw error;
    }
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
    try {
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

      logger.info(
        `Retrieved ${properties.length} properties for user ${userId} (page ${page}, limit ${limit}, search "${search}"). Total properties: ${totalProperties}`
      );

      const numberOfProperties = properties.length; // Define here

      return {
        properties,
        totalPages: Math.ceil(totalProperties / limit),
        currentPage: Number(page),
        totalProperties,
        numberOfProperties,
      };
    } catch (error) {
      logger.error(`Error getting properties by user ID ${userId}: ${error}`);
      throw error;
    }
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
    try {
      const { page = 1, limit = 10, search = "" } = query;
      const { ObjectId } = mongoose.Types;

      logger.info(
        `Attempting to retrieve properties for admin ID: ${userAdminId} (page ${page}, limit ${limit}, search "${search}")`
      );

      const propertiesAggregation = await Property.aggregate([
        {
          $match: {
            // Initial filter on fields in Property
            status: { $ne: "deleted" },
            ...(search
              ? { $or: [{ title: { $regex: search, $options: "i" } }] }
              : {}),
          },
        },
        {
          $lookup: {
            from: "users", // Collection name for User
            localField: "userCreated",
            foreignField: "_id",
            as: "userCreated", //  Result will be an array, even if only one document matches
          },
        },
        { $unwind: "$userCreated" }, //Convert array result of lookup to object
        {
          $match: {
            // Filter on the joined user
            "userCreated.registeredBy": new ObjectId(userAdminId),
          },
        },
        {
          $facet: {
            properties: [
              //Apply pagination and project to remove unwanted fields
              { $skip: (Number(page) - 1) * Number(limit) },
              { $limit: Number(limit) },
              { $project: { __v: 0 } },
            ],
            totalProperties: [{ $count: "count" }], // Gets the count of the documents
          },
        },
      ]);

      const properties = propertiesAggregation[0]?.properties || []; // Access properties from the facet
      const totalProperties =
        propertiesAggregation[0]?.totalProperties[0]?.count || 0;

      logger.info(
        `Aggregation result: ${properties.length} properties found, ${totalProperties} total properties matching the criteria.`
      );

      const totalPages = Math.ceil(totalProperties / Number(limit));
      const numberOfProperties = properties.length; // Define here

      logger.info(
        `Returning properties (page ${page}, limit ${limit}): ${numberOfProperties} properties, total pages: ${totalPages}`
      );

      return {
        properties,
        totalPages,
        currentPage: Number(page),
        totalProperties,
        numberOfProperties,
      };
    } catch (error: any) {
      logger.error(
        `Error in getPropertiesByUserAdminID: ${error.message}`,
        error
      );
      throw error;
    }
  }

  public async updatePropertyStatus(propertyId: string, status: string) {
    try {
      const property = await Property.findById(propertyId);

      if (!property) {
        logger.warn(`Property with id ${propertyId} not found`);
        throw new Error(`Property with id ${propertyId} not found`);
      }

      if (!isPropertyStatus(status)) {
        logger.warn(`${status} is not a valid property status`);
        throw new Error(`${status} is not a valid property status`);
      }
      property.status = status;
      await property.save();

      logger.info(
        `Property status updated to ${status} for property ID ${propertyId}.`
      );
      return property;
    } catch (error) {
      logger.error(
        `Error updating property status to ${status} for property ${propertyId}: ${error}`
      );
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
    try {
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

      logger.info(
        `Retrieved ${properties.length} properties with status "${status}" (page ${page}, limit ${limit}, search "${search}"). Total properties: ${totalProperties}`
      );

      const numberOfProperties = properties.length; // Define here

      return {
        properties,
        totalPages: Math.ceil(totalProperties / limit),
        currentPage: Number(page),
        totalProperties,
        numberOfProperties,
      };
    } catch (error) {
      logger.error(`Error getting properties by status ${status}: ${error}`);
      throw error;
    }
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
    try {
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
      logger.info(
        `Retrieved ${properties.length} properties with propertyType "${propertyType}" (page ${page}, limit ${limit}, search "${search}"). Total properties: ${totalProperties}`
      );

      const numberOfProperties = properties.length; // Define here

      return {
        properties,
        totalPages: Math.ceil(totalProperties / limit),
        currentPage: Number(page),
        totalProperties,
        numberOfProperties,
      };
    } catch (error) {
      logger.error(
        `Error getting properties by type ${propertyType}: ${error}`
      );
      throw error;
    }
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

      logger.info(
        `Created ${createdProperties.length} properties from Excel import.`
      );

      return createdProperties.map((prop) =>
        prop?.toObject ? prop.toObject() : prop
      ) as IProperty[];
    } catch (error) {
      logger.error(`Error importing properties from excel: ${error}`);
      throw new Error("Error reading from the excel file");
    }
  }
  // Multiple soft delete
  public async softDeleteMultipleProperties(
    ids: string[]
  ): Promise<IProperty[]> {
    try {
      const properties = await Property.find({ _id: { $in: ids } });
      if (!properties || properties.length === 0) {
        logger.warn(`No properties to delete with IDs: ${ids.join(", ")}`);
        throw new Error("No properties to delete");
      }

      properties.forEach((prop) => (prop.status = "deleted"));
      const softDeletedProperties = await Promise.all(
        properties.map(async (prop) => await prop.save())
      );
      logger.info(
        `Soft deleted multiple properties with IDs: ${ids.join(", ")}`
      );

      return softDeletedProperties;
    } catch (error) {
      logger.error(`Error soft deleting multiple properties: ${error}`);
      throw error;
    }
  }

  public async getOpenPropertiesByUserAdminID(
    userAdminId: string,
    query: any
  ): Promise<{
    properties: Partial<IProperty>[];
    totalPages: number;
    currentPage: number;
    totalProperties: number;
    numberOfProperties: number;
  }> {
    try {
      const { page = 1, limit = 10, search = "" } = query;
      const { ObjectId } = mongoose.Types;

      logger.info(
        `Attempting to retrieve open properties for admin ID: ${userAdminId} (page ${page}, limit ${limit}, search "${search}")`
      );

      const propertiesAggregation = await Property.aggregate([
        {
          $match: {
            // Initial filter on fields in Property
            status: "open", // <----  New filter for status=open
            ...(search
              ? { $or: [{ title: { $regex: search, $options: "i" } }] }
              : {}),
          },
        },
        {
          $lookup: {
            from: "users", // Collection name for User
            localField: "userCreated",
            foreignField: "_id",
            as: "userCreated", //  Result will be an array, even if only one document matches
          },
        },
        { $unwind: "$userCreated" }, //Convert array result of lookup to object
        {
          $match: {
            // Filter on the joined user
            "userCreated.registeredBy": new ObjectId(userAdminId),
          },
        },
        {
          $facet: {
            properties: [
              //Apply pagination and project to remove unwanted fields
              { $skip: (Number(page) - 1) * Number(limit) },
              { $limit: Number(limit) },
              { $project: { __v: 0 } },
            ],
            totalProperties: [{ $count: "count" }], // Gets the count of the documents
          },
        },
      ]);

      const properties = propertiesAggregation[0]?.properties || []; // Access properties from the facet
      const totalProperties =
        propertiesAggregation[0]?.totalProperties[0]?.count || 0;

      logger.info(
        `Aggregation result: ${properties.length} properties found, ${totalProperties} total properties matching the criteria.`
      );

      const totalPages = Math.ceil(totalProperties / Number(limit));
      const numberOfProperties = properties.length; // Define here

      logger.info(
        `Returning properties (page ${page}, limit ${limit}): ${numberOfProperties} properties, total pages: ${totalPages}`
      );

      return {
        properties,
        totalPages,
        currentPage: Number(page),
        totalProperties,
        numberOfProperties,
      };
    } catch (error: any) {
      logger.error(
        `Error in getOpenPropertiesByUserAdminID: ${error.message}`,
        error
      );
      throw error;
    }
  }

  // NEW METHOD: Get property status counts by registeredBy
  public async getPropertyStatusCountsByRegisteredBy(
    registeredBy: string
  ): Promise<{ [status: string]: number }> {
    try {
      const { ObjectId } = mongoose.Types;

      const aggregationResult = await Property.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userCreated",
            foreignField: "_id",
            as: "userCreated",
          },
        },
        { $unwind: "$userCreated" },
        {
          $match: {
            "userCreated.registeredBy": new ObjectId(registeredBy),
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            status: "$_id",
            count: 1,
          },
        },
      ]);

      // Format the result as a key-value pair (status: count)
      const statusCounts: { [status: string]: number } = {};
      aggregationResult.forEach((item) => {
        statusCounts[item.status] = item.count;
      });

      logger.info(
        `Retrieved property status counts for registeredBy: ${registeredBy}`
      );

      return statusCounts;
    } catch (error: any) {
      logger.error(
        `Error getting property status counts by registeredBy: ${error}`
      );
      throw error;
    }
  }

  public async getLeasedPropertiesByUser(
    userId: string,
    query: any // For pagination/filtering
  ): Promise<{
    properties: Partial<IProperty>[];
    totalPages: number;
    currentPage: number;
    totalProperties: number;
  }> {
    try {
      const { page = 1, limit = 10, search = "" } = query;
      const limitNumber = Number(limit) || 10;
      const skip = (page - 1) * limitNumber;

      // 1. Validate the userId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        logger.warn(`Invalid userId provided.`);
        return {
          properties: [],
          totalPages: 0,
          currentPage: Number(page),
          totalProperties: 0,
        };
      }

      const user = await User.findById(userId);

      // Make sure user exist
      if (!user) {
        logger.info(`No user found for user ID ${userId}.`);
        return {
          properties: [],
          totalPages: 0,
          currentPage: Number(page),
          totalProperties: 0,
        };
      }
      const email = user?.email;

      // 2. Find the Tenant associated with the user email
      const tenant = await Tenant.findOne({
        "contactInformation.email": email,
      }).lean();

      if (!tenant) {
        logger.info(`No tenant found for user ID ${userId}.`);
        return {
          properties: [],
          totalPages: 0,
          currentPage: Number(page),
          totalProperties: 0,
        };
      }

      // 3. Find all leases associated with the tenant
      const leases = await Lease.find({ tenant: tenant._id }).lean();

      // 4. Extract the property IDs from the leases
      const propertyIds = leases.map((lease) => lease.property);

      console.log(propertyIds);

      if (propertyIds.length === 0) {
        logger.info(`No leases found for tenant ${tenant._id}.`);
        return {
          properties: [],
          totalPages: 0,
          currentPage: Number(page),
          totalProperties: 0,
        };
      }

      // 5. Query the Property model with the extracted property IDs
      const searchQuery: any = {
        _id: { $in: propertyIds },
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { address: { $regex: search, $options: "i" } },
        ],
      };

      const [properties, totalProperties] = await Promise.all([
        Property.find(searchQuery).skip(skip).limit(limitNumber),
        Property.countDocuments(searchQuery),
      ]);

      logger.info(
        `Retrieved ${properties.length} leased properties for user ${userId} (page ${page}, limit ${limit}, search "${search}"). Total properties: ${totalProperties}`
      );

      return {
        properties,
        totalPages: Math.ceil(totalProperties / limitNumber),
        currentPage: Number(page),
        totalProperties,
      };
    } catch (error) {
      logger.error(`Error getting leased properties by user: ${error}`);
      throw error;
    }
  }
}
export const propertyService = new PropertyService();
