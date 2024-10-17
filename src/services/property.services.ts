import { Property } from "../models/property.model";
import { IProperty } from "../interfaces/property.interface";
import fs from "fs";
import path from "path";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { Parser } from "@json2csv/plainjs";

class PropertyService {
  parser = new Parser();
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

  public async generateReport(
    startDate: string,
    endDate: string
  ): Promise<{ csvPath: string; wordPath: string; properties: IProperty[] }> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch properties within the date range
    const properties: IProperty[] = await Property.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    if (!properties || properties.length === 0) {
      throw new Error("No properties found for the given date range");
    }

    // Ensure that the 'reports' directory exists
    const reportsDir = path.join(__dirname, "..", "..", "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }

    // Create a timestamp for the report filenames
    const timestamp = Date.now();

    // Prepare data for CSV
    const cleanedProperties = properties.map((property) => ({
      title: property.title,
      description: property.description,
      address: property.address,
      price: property.price,
      rentPrice: property.rentPrice,
      numberOfUnits: property.numberOfUnits,
      propertyType: property.propertyType,
      floorPlan: property.floorPlan,
      amenities: property.amenities?.join(", ") || "",
      photos: property.photos.join(", "),
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(cleanedProperties);

    // Write CSV report
    const csvFilePath = `${reportsDir}/properties-report-${timestamp}.csv`;
    fs.writeFileSync(csvFilePath, csv);

    // Generate Word report
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: cleanedProperties.flatMap((property) => [
            new Paragraph({
              children: [
                new TextRun({ text: `Title: ${property.title}`, bold: true }),
              ],
            }),
            new Paragraph({ text: `Description: ${property.description}` }),
            new Paragraph({ text: `Address: ${property.address}` }),
            new Paragraph({ text: `Price: $${property.price}` }),
            new Paragraph({ text: `Rent Price: $${property.rentPrice}` }),
            new Paragraph({
              text: `Number of Units: ${property.numberOfUnits}`,
            }),
            new Paragraph({ text: `Property Type: ${property.propertyType}` }),
            new Paragraph({ text: `Floor Plan: ${property.floorPlan}` }),
            new Paragraph({ text: `Amenities: ${property.amenities}` }),
            new Paragraph({ text: `Photos: ${property.photos}` }),
            new Paragraph({ text: `Created At: ${property.createdAt}` }),
            new Paragraph({ text: `Updated At: ${property.updatedAt}` }),
            new Paragraph({
              children: [new TextRun("\n-------------------------------\n")],
            }),
          ]),
        },
      ],
    });

    const wordFilePath = `${reportsDir}/properties-report-${timestamp}.docx`;
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(wordFilePath, buffer);

    // Return file paths and properties
    return { csvPath: csvFilePath, wordPath: wordFilePath, properties };
  }
}

export const propertyService = new PropertyService();
