// property.services.ts
import { Property } from "../models/property.model";
import { IProperty, IPhoto } from "../interfaces/property.interface";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { Parser } from "@json2csv/plainjs";

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

    fs.unlinkSync(file.path);

    return {
      id: photoId,
      url: `/uploads/properties/${fileName}`,
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
    });

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
    const newPhotoUrl = file.path;

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

    property.photos[photoIndex].url = newPhotoUrl;

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
    };
  }

  public async getPropertyById(id: string): Promise<IProperty> {
    const property = await Property.findById(id);
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
    property.photos.forEach((photo) => {
      const filePath = path.join(process.cwd(), photo.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await Property.findByIdAndDelete(id);
  }
  public async getPropertiesByUserId(
    userId: string,
    query: any
  ): Promise<{
    properties: Partial<IProperty>[];
    totalPages: number;
    currentPage: number;
    totalProperties: number;
  }> {
    const { page = 1, limit = 20, search = "" } = query;

    const searchQuery: any = {
      userCreated: userId,
      $or: [{ title: { $regex: search, $options: "i" } }],
    };

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

  public async getPropertiesByUserAdminID(
    userAdminId: string,
    query: any
  ): Promise<{
    properties: Partial<IProperty>[];
    totalPages: number;
    currentPage: number;
    totalProperties: number;
  }> {
    const { page = 1, limit = 20, search = "" } = query;

    // Fetch properties that were created by users registered by the loggedInUserId.
    const searchQuery: any = {
      "userCreated.registeredBy": userAdminId,
      $or: [{ title: { $regex: search, $options: "i" } }],
    };

    const properties = await Property.find(searchQuery)
      .populate({
        path: "userCreated",
        select: "registeredBy",
      })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select(
        "title description address price rentPrice numberOfUnits propertyType status"
      );

    const totalProperties = await Property.countDocuments(searchQuery);
    return {
      properties,
      totalPages: Math.ceil(totalProperties / limit),
      currentPage: Number(page),
      totalProperties,
    };
  }
}

export const propertyService = new PropertyService();
