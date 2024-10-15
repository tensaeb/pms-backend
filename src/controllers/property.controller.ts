import { Request, Response } from "express";
import { propertyService } from "../services/property.services";

import {
  ApiResponse,
  errorResponse,
  successResponse,
} from "../utils/apiResponse";

class PropertyController {
  // Create a new property
  public async createProperty(req: Request, res: Response): Promise<void> {
    try {
      // Access the uploaded files
      const files = req.files as Express.Multer.File[]; // Use req.files
      const newProperty = await propertyService.createProperty(req.body, files);
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
}

export const propertyController = new PropertyController();
