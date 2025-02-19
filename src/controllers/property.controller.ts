import { Request, Response } from "express";
import { propertyService } from "../services/property.services";

import {
  ApiResponse,
  errorResponse,
  successResponse,
} from "../utils/apiResponse";
import { PropertyTypeValue } from "../interfaces/property.interface";

class PropertyController {
  // Create a new property
  public async createProperty(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      // if (!user || user.role !== "Admin") {
      //   res
      //     .status(403)
      //     .json(
      //       errorResponse("Unauthorized: Only admins can create properties")
      //     );
      //   return;
      // }

      const files = req.files as Express.Multer.File[];
      const propertyData = { ...req.body, userCreated: user };

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

  async fetchAllImages(req: Request, res: Response): Promise<void> {
    try {
      const { propertyId } = req.params;
      const images = await propertyService.getAllImages(propertyId);
      res.status(200).json({ success: true, images });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async fetchSingleImage(req: Request, res: Response): Promise<void> {
    try {
      const { propertyId, imageId } = req.params;
      const image = await propertyService.getImage(propertyId, imageId);
      res.status(200).json({ success: true, image });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
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
      const files = req.files as Express.Multer.File[] | undefined;
      const updatedProperty = await propertyService.updateProperty(
        req.params.id,
        req.body,
        files
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

  // Soft delete a property by ID
  public async softDeleteProperty(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updatedProperty = await propertyService.softDeleteProperty(id);
      res
        .status(200)
        .json(
          successResponse(updatedProperty, "Property deleted successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete property"));
    }
  }

  // Soft delete multiple properties
  public async softDeleteMultipleProperties(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { ids } = req.body;
      const properties = await propertyService.softDeleteMultipleProperties(
        ids
      );
      res
        .status(200)
        .json(successResponse(properties, "Properties deleted successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to delete property"));
    }
  }

  // Edit a photo
  public async editPhoto(req: Request, res: Response): Promise<void> {
    try {
      const { propertyId, photoId } = req.params;

      if (!req.file) {
        res.status(400).json({ message: "New photo file is required" });
        return;
      }

      const updatedProperty = await propertyService.editPhoto(
        propertyId,
        photoId,
        req.file
      );
      res
        .status(200)
        .json({ message: "Photo updated successfully", data: updatedProperty });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // Delete a photo
  public async deletePhoto(req: Request, res: Response): Promise<void> {
    try {
      const { propertyId, photoId } = req.params;

      const updatedProperty = await propertyService.deletePhoto(
        propertyId,
        photoId
      );

      res
        .status(200)
        .json({ message: "Photo deleted successfully", data: updatedProperty });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get properties by admin ID
  public async getPropertiesByUserId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const query = req.query;
      const properties = await propertyService.getPropertiesByUserId(
        userId,
        query
      );
      res
        .status(200)
        .json(successResponse(properties, "Properties fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch properties"));
    }
  }

  // Get properties by registeredBy ID
  public async getPropertiesByUserAdminId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { userAdminId } = req.params;
      const query = req.query;
      const properties = await propertyService.getPropertiesByUserAdminID(
        userAdminId,
        query
      );

      res
        .status(200)
        .json(successResponse(properties, "Properties fetched successfully"));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch properties"));
    }
  }
  //Get properties by status
  public async getPropertiesByStatus(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { status } = req.params;

      const properties = await propertyService.getPropertiesByStatus(
        status as "open" | "closed" | "reserved" | "under maintenance" | "sold",
        req.query
      );
      res
        .status(200)
        .json(
          successResponse(
            properties,
            "Properties fetched Successfully by status"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to get properties by Status")
        );
    }
  }
  //get properties by Type
  public async getPropertiesByType(req: Request, res: Response): Promise<void> {
    try {
      const { propertyType } = req.params;

      const properties = await propertyService.getPropertiesByType(
        propertyType as PropertyTypeValue,
        req.query
      );
      res
        .status(200)
        .json(
          successResponse(properties, "Property fetched Successfully by type")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to get property by type"));
    }
  }
  // upload properties from excel
  public async uploadPropertiesFromExcel(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user;
      if (!req.file) {
        res.status(400).json(errorResponse("No file uploaded"));
        return;
      }

      const properties = await propertyService.createPropertiesFromExcel(
        req.file,
        user
      );
      res
        .status(201)
        .json(
          successResponse(
            properties,
            "Properties imported from excel successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to import properties from excel")
        );
    }
  }
  public async getOpenPropertiesByUserAdminId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { userAdminId } = req.params;
      const query = req.query;
      const properties = await propertyService.getOpenPropertiesByUserAdminID(
        userAdminId,
        query
      );

      res
        .status(200)
        .json(
          successResponse(properties, "Open properties fetched successfully")
        );
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(error.message, "Failed to fetch open properties"));
    }
  }

  // NEW METHOD: Get property status counts by registeredBy
  public async getPropertyStatusCounts(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { registeredBy } = req.params;
      const statusCounts =
        await propertyService.getPropertyStatusCountsByRegisteredBy(
          registeredBy
        );

      res
        .status(200)
        .json(
          successResponse(
            statusCounts,
            "Property status counts fetched successfully"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(error.message, "Failed to fetch property status counts")
        );
    }
  }
  public async getLeasedPropertiesByUser(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const query = req.query;

      const result = await propertyService.getLeasedPropertiesByUser(
        userId,
        query
      );

      res
        .status(200)
        .json(
          successResponse(
            result,
            "Leased properties fetched successfully for the user"
          )
        );
    } catch (error: any) {
      res
        .status(500)
        .json(
          errorResponse(
            error.message,
            "Failed to fetch leased properties for the user"
          )
        );
    }
  }
}
export const propertyController = new PropertyController();
