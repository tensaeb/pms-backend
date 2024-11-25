import { Request, Response } from "express";
import { propertyService } from "../services/property.services";
import path from "path";

import {
  ApiResponse,
  errorResponse,
  successResponse,
} from "../utils/apiResponse";

class PropertyController {
  // Create a new property
  public async createProperty(req: Request, res: Response): Promise<void> {
    try {
      // Ensure the logged-in user exists
      const user = req.user;
      if (!user || user.role !== "Admin") {
        res
          .status(403)
          .json(
            errorResponse("Unauthorized: Only admins can create properties")
          );
      }

      // Access the uploaded files
      const files = req.files as Express.Multer.File[]; // Use req.files

      // Add the logged-in user as the admin
      const propertyData = {
        ...req.body,
        admin: user, // Add the logged-in user as the admin
      };

      // Call the service to create the property
      const newProperty = await propertyService.createProperty(
        propertyData,
        files
      );

      res
        .status(201)
        .json(successResponse(newProperty, "Property created successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to create property"));
    }
  }

  // Get all properties with pagination and search
  public async getAllProperties(req: Request, res: Response): Promise<void> {
    try {
      const properties = await propertyService.getAllProperties(req.query);
      res
        .status(200)
        .json(successResponse(properties, "Properties fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch properties"));
    }
  }

  // Get a property by ID
  public async getPropertyById(req: Request, res: Response): Promise<void> {
    try {
      const property = await propertyService.getPropertyById(req.params.id);
      if (!property) {
        res.status(404).json(errorResponse("Property not found"));
      }
      res
        .status(200)
        .json(successResponse(property, "Property fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch property"));
    }
  }

  // Update a property by ID
  public async updateProperty(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      const updatedProperty = await propertyService.updateProperty(
        req.params.id,
        req.body,
        file
      );
      res
        .status(200)
        .json(
          successResponse(updatedProperty, "Property updated successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to update property"));
    }
  }

  // Delete a property by ID
  public async deleteProperty(req: Request, res: Response): Promise<void> {
    try {
      const property = await propertyService.deleteProperty(req.params.id);
      res
        .status(200)
        .json(successResponse(property, "Property deleted successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete property"));
    }
  }

  //Generate Report
  public async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      // Validate startDate and endDate
      if (!startDate || !endDate) {
        res
          .status(400)
          .json(errorResponse("Start date and end date are required"));
        return;
      }

      // Generate the report and get file paths along with the properties
      const { csvPath, wordPath, properties } =
        await propertyService.generateReport(
          startDate as string,
          endDate as string
        );

      // Return the file paths and the properties data in the response
      res.status(200).json({
        message: "Report generated successfully",
        data: {
          files: {
            csv: csvPath,
            word: wordPath,
          },
          properties, // Return the properties data in the response
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to generate report"));
    }
  }
}

export const propertyController = new PropertyController();
